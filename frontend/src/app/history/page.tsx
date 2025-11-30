'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { ActivityLog } from '@/types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { BrainCircuit, Sofa, Star, Heart, Monitor, Bed, Trash2 } from 'lucide-react'; // Lucide Icons

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
const LogItemContent = ({ log, onDelete }: { log: ActivityLog, onDelete: (id: number) => void }) => {
  const typeIcon = log.log_type === 'focus' ? <BrainCircuit className="h-4 w-4 text-indigo-400" /> : <Sofa className="h-4 w-4 text-green-400" />;
  const logTime = new Date(log.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });


  return (
    <div className="flex justify-between items-start">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            {typeIcon}
            <span>{logTime}</span>
        </div>
        {log.log_type === 'focus' ? (
          <>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              <span className={`font-bold text-2xl ${
                log.data.score >= 80 ? 'text-green-400' : log.data.score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {log.data.score} <span className="text-base">点</span>
              </span>
              <span className="text-gray-400 ml-2">({log.data.duration}分)</span>
            </div>
            <p className="mt-2 text-gray-300 font-semibold">{log.data.title}</p>
            {log.data.ai_feedback && <p className="mt-1 text-sm text-gray-400 italic">AI: {log.data.ai_feedback}</p>}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-300">
              <span className="flex items-center gap-1"><Bed size={16} /> {log.data.sleep_hours}時間</span>
              <span className="flex items-center gap-1"><Monitor size={16} /> {log.data.screen_time}分</span>
              <span className="flex items-center gap-1"><Heart size={16} /> 気分: {log.data.mood}/5</span>
            </div>
            {log.data.ai_advice && <p className="mt-2 text-sm text-gray-400 italic">AI: {log.data.ai_advice}</p>}
          </div>
        )}
      </div>
      <button 
        onClick={() => onDelete(log.id)} 
        className="p-1 text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
        title="記録を削除"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
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
        // Sort logs by created_at descending, then by ID descending to ensure stable order for UI if timestamps are identical
        const sortedLogs = response.data.sort((a: ActivityLog, b: ActivityLog) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          if (dateA === dateB) {
            return b.id - a.id; // Secondary sort by ID for stability
          }
          return dateB - dateA; // Primary sort by date descending
        });
        setAllLogs(sortedLogs);
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

  const handleDeleteLog = async (logId: number) => {
    if (!window.confirm('この記録を削除してもよろしいですか？一度削除すると元に戻せません。')) {
      return;
    }
    try {
      await api.delete(`/history/${logId}`);
      setAllLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
    } catch (err) {
      console.error("Failed to delete log:", err);
      alert('記録の削除に失敗しました。');
    }
  };

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
                        <LogItemContent log={log} onDelete={handleDeleteLog} />
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