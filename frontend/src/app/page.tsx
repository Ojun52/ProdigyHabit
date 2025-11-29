'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface User {
  name: string;
}

export default function IndexPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await api.get('/me');
        setUser(response.data);
      } catch (err) {
        // Not logged in, user remains null
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  if (isLoading) {
    return <div className="text-center">読み込み中...</div>;
  }

  // Logged-in View
  if (user) {
    return (
      <div className="text-center bg-gray-800 p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-teal-300">
          おかえりなさい、{user.name}さん！
        </h1>
        <p className="mt-4 text-lg text-gray-300">今日の生産性を記録して、一歩を踏み出しましょう。</p>
        <Link href="/entry" className="mt-6 inline-block px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-lg transition-colors transform hover:scale-105 cursor-pointer">
          今日の記録を始める
        </Link>
      </div>
    );
  }

  // Not Logged-in View
  return (
    <div className="text-center bg-gray-800 p-8 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold text-teal-300">ProdigyHabitへようこそ</h1>
      <p className="mt-4 text-lg text-gray-300">日々の生産性を記録し、成長を可視化しましょう。</p>
      <a 
        href="http://localhost:5000/api/login"
        className="mt-6 inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg transition-colors transform hover:scale-105 cursor-pointer"
      >
        Googleでログインして始める
      </a>
    </div>
  );
}
