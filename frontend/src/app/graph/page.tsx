'use client';

import WeeklySummaryChart from '@/components/WeeklySummaryChart'; // Import the new component

export default function GraphPage() {
  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-4 text-teal-300">
          週間活動サマリー
        </h1>
        <p className="text-center text-lg mb-8 text-gray-400">
          過去の仕事（集中度）と生活（睡眠、スマホ利用、気分）の記録を週ごとに確認できます。
        </p>
        <WeeklySummaryChart />
      </div>
    </main>
  );
}
