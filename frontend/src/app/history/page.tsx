'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { ActivityLog } from '@/types'; // Import the new types
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { BrainCircuit, Sofa, Star, Heart, Monitor, Bed } from 'lucide-react'; // Lucide Icons

// Helper to get the start of the week (Monday)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // Normalize to start of day
  return d;
};

// Helper component to render each type of log (reused)
const LogItemContent = ({ log }: { log: ActivityLog }) => {
  const data = log.data;

  if (log.log_type === 'focus') {
    return (
      <>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          <span className={`font-bold text-2xl ${
            data.score >= 80 ? 'text-green-400' : data.score >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {data.score} <span className="text-base">点</span>
          </span>
          <span className="text-gray-400 ml-2">({data.duration_minutes}分)</span>
        </div>
        <p className="mt-2 text-gray-300 font-semibold">{data.task_content}</p>
        {data.ai_feedback && <p className="mt-1 text-sm text-gray-400 italic">AI: {data.ai_feedback}</p>}
      </>
    );
  } else if (log.log_type === 'life') {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-300">
          <span className="flex items-center gap-1"><Bed size={16} /> {data.sleep_hours}時間</span>
          <span className="flex items-center gap-1"><Monitor size={16} /> {data.screen_time_minutes}分</span>
          <span className="flex items-center gap-1"><Heart size={16} /> 気分: {data.mood}/5</span>
        </div>
        {data.ai_advice && <p className="mt-2 text-sm text-gray-400 italic">AI: {data.ai_advice}</p>}
      </div>
    );
  }
  return null; // Should not happen
};


export default function HistoryPage() {
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/history');
        setAllLogs(response.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('履歴を見るにはログインしてください。');
        } else {
          setError('履歴の読み込みに失敗しました。');
        }
        console.error("History fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const weekData = useMemo(() => {
    const startOfWeek = getWeekStart(currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Filter logs for the current week
    const logsInWeek = allLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= startOfWeek && logDate <= endOfWeek;
    });

    // Group logs by day
    const logsByDay: { [key: string]: ActivityLog[] } = {};
    logsInWeek.forEach(log => {
      const dayString = new Date(log.created_at).toISOString().split('T')[0];
      if (!logsByDay[dayString]) {
        logsByDay[dayString] = [];
      }
      logsByDay[dayString].push(log);
    });

    const weekDisplayData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dayString = day.toISOString().split('T')[0];
      weekDisplayData.push({
        date: day,
        logs: logsByDay[dayString] || []
      });
    }
    return weekDisplayData;
  }, [allLogs, currentDate]);

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const amount = direction === 'prev' ? -7 : 7;
    newDate.setDate(newDate.getDate() + amount);
    setCurrentDate(newDate);
  };
  
  const startOfWeekDisplay = getWeekStart(currentDate);
  const endOfWeekDisplay = new Date(startOfWeekDisplay);
  endOfWeekDisplay.setDate(startOfWeekDisplay.getDate() + 6);

  if (isLoading) return <p className="text-center">履歴を読み込み中...</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-teal-300">活動履歴</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => changeWeek('prev')} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors cursor-pointer">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <span className="text-lg font-semibold">
            {startOfWeekDisplay.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })} - {endOfWeekDisplay.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
          </span>
          <button onClick={() => changeWeek('next')} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors cursor-pointer">
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {allLogs.length === 0 ? (
        <p className="text-center text-gray-400">まだ記録がありません。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {weekData.map(({ date, logs }) => (
            <div key={date.toISOString()} className={`p-3 rounded-lg flex flex-col md:flex-row md:items-start md:gap-4 w-full ${logs.length > 0 ? 'bg-gray-800' : 'bg-gray-900/50 border-2 border-dashed border-gray-700'}`}>
              <div className="flex flex-col items-center justify-center w-24 md:w-32 flex-shrink-0">
                <span className="font-bold text-lg text-teal-300">
                  {date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                </span>
                <span className="text-sm text-gray-400">
                  ({date.toLocaleDateString('ja-JP', { weekday: 'short' })})
                </span>
              </div>
              
              <div className="flex-grow w-full md:w-auto mt-2 md:mt-0">
                {logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="text-left bg-gray-700 p-2 rounded-md">
                        <LogItemContent log={log} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-grow items-center justify-center text-center text-gray-500 text-sm italic py-4">
                    <p>記録がありません。</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}