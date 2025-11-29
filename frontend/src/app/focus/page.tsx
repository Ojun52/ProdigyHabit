'use client';

import { useState } from 'react';
import FocusChat from '@/components/FocusChat';
import PomodoroManager from '@/components/PomodoroManager';
import { BrainCircuit, Timer, MessageSquare } from 'lucide-react';

export default function FocusPage() {
  // 'hub': Initial choice
  // 'pomodoro': The Pomodoro timer UI is active
  // 'chat_manual': User chose to chat manually without a timer
  // 'chat_post_pomodoro': User finished a timer and is now reporting
  const [view, setView] = useState<'hub' | 'pomodoro' | 'chat_manual' | 'chat_post_pomodoro'>('hub');
  
  // To store the duration from a completed Pomodoro session
  const [completedDuration, setCompletedDuration] = useState<number>(0);

  const showHub = () => setView('hub');

  // This function is called by PomodoroManager when a focus session ends
  const handleSessionComplete = (duration: number) => {
    setCompletedDuration(duration);
    setView('chat_post_pomodoro');
  };

  // This function is called from the post-session chat to start a break
  const handleStartBreak = () => {
    setSessionType('BREAK');
    setView('pomodoro');
  };

  // Hub screen rendering
  const renderHub = () => (
    <>
      <p className="text-lg text-gray-400 mb-8">どのように活動を記録しますか？</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div 
          onClick={() => setView('pomodoro')}
          className="block p-8 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-center cursor-pointer"
        >
          <Timer className="mx-auto h-16 w-16 text-indigo-400" />
          <h2 className="mt-4 text-2xl font-bold">ポモドーロタイマー</h2>
          <p className="mt-2 text-gray-400">タイマーで時間を計って集中します。</p>
        </div>
        
        <div 
          onClick={() => setView('chat_manual')}
          className="block p-8 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-center cursor-pointer"
        >
          <MessageSquare className="mx-auto h-16 w-16 text-teal-400" />
          <h2 className="mt-4 text-2xl font-bold">チャットで記録する</h2>
          <p className="mt-2 text-gray-400">AIとの対話でタスク内容と時間を記録します。</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
      <div className="flex items-center gap-4 mb-6">
        <BrainCircuit className="h-12 w-12 text-indigo-400" />
        <h1 className="text-4xl font-bold">執務室</h1>
      </div>

      {view === 'hub' ? renderHub() : (
        <div className="w-full max-w-2xl mt-6">
          <button onClick={showHub} className="mb-6 text-teal-400 hover:text-teal-300 cursor-pointer">
            &larr; 執務室のトップに戻る
          </button>
          
          {view === 'pomodoro' && <PomodoroManager onSessionComplete={handleSessionComplete} />}
          {view === 'chat_manual' && <FocusChat />}
          {view === 'chat_post_pomodoro' && <FocusChat initialDuration={completedDuration} onStartBreak={handleStartBreak} />}
        </div>
      )}
    </div>
  );
}
