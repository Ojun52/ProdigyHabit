'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface Log {
  id: number;
  date: string;
  score: number;
  note: string | null;
}

// Helper to get the start of the week (Monday)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/history');
        setLogs(response.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('履歴を見るにはログインしてください。');
        } else {
          setError('履歴の読み込みに失敗しました。');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const weekLogs = useMemo(() => {
    const weekStart = getWeekStart(currentDate);
    const logsByDate: { [key: string]: Log } = {};
    logs.forEach(log => {
      logsByDate[log.date] = log;
    });

    const weekData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayString = day.toISOString().split('T')[0];
      weekData.push({
        date: day,
        log: logsByDate[dayString] || null,
      });
    }
    return weekData;
  }, [logs, currentDate]);

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const amount = direction === 'prev' ? -7 : 7;
    newDate.setDate(newDate.getDate() + amount);
    setCurrentDate(newDate);
  };
  
  const weekStart = getWeekStart(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  if (isLoading) return <p className="text-center">履歴を読み込み中...</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-teal-300">記録履歴</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => changeWeek('prev')} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors cursor-pointer">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <span className="text-lg font-semibold">
            {weekStart.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })} - {weekEnd.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
          </span>
          <button onClick={() => changeWeek('next')} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors cursor-pointer">
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {logs.length === 0 ? (
        <p className="text-center text-gray-400">まだ記録がありません。</p>
      ) : (
        <div className="space-y-4">
          {weekLogs.map(({ date, log }) => (
            <div key={date.toISOString()} className={`flex gap-4 items-start p-4 rounded-lg ${log ? 'bg-gray-800' : 'bg-gray-800/50'}`}>
              {/* Date Section */}
              <div className="flex flex-col items-center justify-center w-20">
                <span className="font-bold text-lg text-teal-300">
                  {date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                </span>
                <span className="text-sm text-gray-400">
                  ({date.toLocaleDateString('ja-JP', { weekday: 'short' })})
                </span>
              </div>

              {/* Content Section */}
              <div className="flex-1">
                {log ? (
                  <>
                    <div className="flex items-center gap-4 mb-2">
                      <span className={`font-bold text-2xl ${
                        log.score >= 80 ? 'text-green-400' : log.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {log.score} <span className="text-base">点</span>
                      </span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {log.note || ''}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">記録がありません。</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
