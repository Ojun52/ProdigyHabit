'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import LoungeChat from '@/components/LoungeChat';
import { Sofa } from 'lucide-react';

export default function LoungePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Assume logged in, verify on mount
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth status on component mount
    const checkAuthStatus = async () => {
      try {
        await api.get('/dashboard'); // Protected endpoint
        setIsLoggedIn(true);
      } catch (error) {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  const renderLoginRequired = () => (
    <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-red-400">ログインが必要です</h2>
      <p className="mt-2 text-gray-300">この機能を利用するには、ログインしてください。</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
       <div className="flex items-center gap-4 mb-6">
        <Sofa className="h-12 w-12 text-green-400" />
        <h1 className="text-4xl font-bold">ラウンジ</h1>
      </div>
      
      <p className="text-center text-lg mb-10 text-gray-400 max-w-2xl mx-auto">
        AIメンターがあなたの生活習慣と直近の仕事の記録から、コンディション調整のアドバイスを行います。
        睡眠時間、スマホ使用時間、今の気分（1-5段階）などを教えてください。
      </p>

      {isLoading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : isLoggedIn ? (
        <LoungeChat />
      ) : (
        renderLoginRequired()
      )}
    </div>
  );
}