'use client';

import LoungeChat from '@/components/LoungeChat';

export default function LoungePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-emerald-200 text-gray-800 p-6">
      <main className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-emerald-800">
          Lounge Mode
        </h1>
        <p className="text-center text-lg mb-10 text-emerald-700 max-w-2xl mx-auto">
          AIメンターがあなたの生活習慣と直近の仕事の記録から、コンディション調整のアドバイスを行います。
          睡眠時間、スマホ使用時間、今の気分（1-5段階）などを教えてください。
        </p>
        <LoungeChat />
      </main>
    </div>
  );
}