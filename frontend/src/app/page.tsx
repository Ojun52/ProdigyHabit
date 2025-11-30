'use client';

import Link from 'next/link';
import { BrainCircuit, Sofa } from 'lucide-react';
import WeeklySummaryChart from '@/components/WeeklySummaryChart'; // Import the new component

const Dashboard = () => {
  return (
    <main className="container mx-auto p-6">
      <div className="max-w-5xl mx-auto space-y-8">
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

        <WeeklySummaryChart /> {/* Use the new WeeklySummaryChart component here */}
      </div>
    </main>
  );
};

export default Dashboard;