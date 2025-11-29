'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BrainCircuit, Sofa } from 'lucide-react';
import api from '@/lib/api';

interface DashboardData {
  chart_data: {
    date: string;
    score?: number;
    sleep?: number;
  }[];
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response.data);
      } catch (error) {
        console.error("ダッシュボードデータの読み込みに失敗しました。", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-teal-300">ProdigyHabit</h1>
        <p className="text-lg text-gray-400 mt-2">仕事と生活、両方のパフォーマンスを最大化する。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/focus" className="block p-8 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-center cursor-pointer">
          <BrainCircuit className="mx-auto h-16 w-16 text-indigo-400" />
          <h2 className="mt-4 text-2xl font-bold">執務室へ</h2>
          <p className="mt-2 text-gray-400">ポモドーロタイマーで集中し、成果を記録する。</p>
        </Link>
        <Link href="/lounge" className="block p-8 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-center cursor-pointer">
          <Sofa className="mx-auto h-16 w-16 text-green-400" />
          <h2 className="mt-4 text-2xl font-bold">ラウンジへ</h2>
          <p className="mt-2 text-gray-400">コンディションを記録し、AIに相談する。</p>
        </Link>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold mb-4">週間サマリー</h3>
        {isLoading ? (
          <p>グラフを読み込み中...</p>
        ) : data && data.chart_data.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis yAxisId="left" orientation="left" stroke="#818CF8" />
                <YAxis yAxisId="right" orientation="right" stroke="#4ADE80" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="score" fill="#818CF8" name="仕事点" />
                <Bar yAxisId="right" dataKey="sleep" fill="#4ADE80" name="睡眠時間" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>表示するデータがまだありません。</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;