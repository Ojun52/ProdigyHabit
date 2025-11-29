'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import ScoreChart from '@/components/ScoreChart';

interface Log {
  id: number;
  date: string;
  score: number;
  note: string | null;
}

export default function GraphPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/history');
        // Sort logs by date ascending for the chart
        const sortedLogs = response.data.sort((a: Log, b: Log) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setLogs(sortedLogs);
      } catch (err: any) {
        if (err.response && err.response.status === 401) {
          setError('グラフを表示するにはログインしてください。');
        } else {
          setError('データの読み込みに失敗しました。');
        }
        console.error('API呼び出し中にエラーが発生しました。', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (isLoading) return <p className="text-center">グラフを読み込み中...</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-teal-300">生産性グラフ</h1>
      {logs.length > 0 ? (
        <div className="h-96">
          <ScoreChart logs={logs} />
        </div>
      ) : (
        <p className="text-center text-gray-400">グラフを表示するためのデータがありません。</p>
      )}
    </div>
  );
}
