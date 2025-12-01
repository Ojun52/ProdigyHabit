'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import FocusChat from '@/components/FocusChat';
import PomodoroManager from '@/components/PomodoroManager';
import { BrainCircuit, Timer, MessageSquare, Send } from 'lucide-react';

// Sub-component for the quick input form
const FocusQuickInput = ({ onSubmitted, onSkip }: { onSubmitted: (score: number, aiMessage: string) => void; onSkip: () => void; }) => {
  const [taskContent, setTaskContent] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskContent.trim() || durationMinutes <= 0) {
      setError('タスク内容と集中時間を入力してください。');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await api.post('/focus/quick', {
        task_content: taskContent,
        duration_minutes: durationMinutes,
      });
      onSubmitted(response.data.score, response.data.ai_message);
    } catch (err) {
      setError('記録の送信に失敗しました。後ほど再試行してください。');
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl p-8 bg-gray-800 rounded-lg shadow-xl space-y-8">
      <h2 className="text-2xl font-bold text-center text-white">クイック記録</h2>
      <p className="text-center text-gray-400">完了したタスクを素早く記録・採点しましょう。</p>

      {error && <p className="text-red-400 text-center">{error}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="task-content" className="block text-lg font-medium text-gray-200 mb-2">
            タスク内容
          </label>
          <input
            id="task-content"
            type="text"
            value={taskContent}
            onChange={(e) => setTaskContent(e.target.value)}
            placeholder="例: API設計、資料作成"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="duration-slider" className="flex items-center gap-2 text-lg font-medium text-gray-200">
            集中時間: <span className="font-bold text-indigo-300">{durationMinutes}分</span>
          </label>
          <input
            id="duration-slider"
            type="range"
            min="5"
            max="240"
            step="5"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-indigo mt-2"
            disabled={isSubmitting}
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5 mr-2" />
            {isSubmitting ? '採点中...' : '記録・採点する'}
          </button>
        </div>
      </form>
       <div className="text-center pt-2">
         <button
           onClick={onSkip}
           className="text-gray-400 hover:text-white transition-colors text-sm"
          >
           チャットで詳しく報告する →
          </button>
       </div>
    </div>
  );
};


export default function FocusPage() {
  const [view, setView] = useState<'hub' | 'pomodoro' | 'quick_input' | 'chat_manual' | 'chat_post_pomodoro'>('hub');
  const [sessionType, setSessionType] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [completedDuration, setCompletedDuration] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [initialAiMessage, setInitialAiMessage] = useState<string | null>(null);
  const [initialAiScore, setInitialAiScore] = useState<number | null>(null);


  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await api.get('/me');
        setIsLoggedIn(true);
      } catch (error) {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  const showHub = () => {
    setView('hub');
    setInitialAiMessage(null);
    setInitialAiScore(null);
  }

  const handleSessionComplete = (duration: number) => {
    setCompletedDuration(duration);
    setView('chat_post_pomodoro');
  };

  const handleQuickInputSubmitted = (score: number, aiMessage: string) => {
    setInitialAiScore(score);
    setInitialAiMessage(aiMessage);
    setView('chat_manual');
  };
  
  const handleQuickInputSkipped = () => {
    setInitialAiScore(null);
    setInitialAiMessage(null);
    setView('chat_manual');
  };


  const renderHub = () => (
    <>
      <p className="text-lg text-gray-400 mb-8">どのように活動を記録しますか？</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div 
          onClick={() => {
            setView('pomodoro');
            setSessionType('FOCUS');
          }}
          className="block p-8 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-center cursor-pointer"
        >
          <Timer className="mx-auto h-16 w-16 text-indigo-400" />
          <h2 className="mt-4 text-2xl font-bold">ポモドーロタイマー</h2>
          <p className="mt-2 text-gray-400">タイマーで時間を計って集中します。</p>
        </div>
        
        <div 
          onClick={() => setView('quick_input')}
          className="block p-8 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-center cursor-pointer"
        >
          <MessageSquare className="mx-auto h-16 w-16 text-teal-400" />
          <h2 className="mt-4 text-2xl font-bold">手動で記録する</h2>
          <p className="mt-2 text-gray-400">完了したタスクを報告・採点します。</p>
        </div>
      </div>
    </>
  );

  const renderLoginRequired = () => (
    <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-red-400">ログインが必要です</h2>
      <p className="mt-2 text-gray-400">この機能を利用するには、ログインしてください。</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 w-full">
         <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  const renderCurrentView = () => {
    if (!isLoggedIn) return renderLoginRequired();
    
    switch(view) {
      case 'hub':
        return renderHub();
      case 'quick_input':
        return <FocusQuickInput onSubmitted={handleQuickInputSubmitted} onSkip={handleQuickInputSkipped} />;
      case 'pomodoro':
        return <PomodoroManager sessionType={sessionType} onSessionComplete={handleSessionComplete} />;
      case 'chat_manual':
        return <FocusChat initialScore={initialAiScore} initialMessage={initialAiMessage} />;
      case 'chat_post_pomodoro':
        return <FocusChat initialDuration={completedDuration} />;
      default:
        return renderHub();
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 w-full">
      <div className="flex items-center gap-4 mb-6">
        <BrainCircuit className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-400" />
        <h1 className="text-3xl sm:text-4xl font-bold">執務室</h1>
      </div>

      <div className="w-full max-w-2xl mt-6">
        {view !== 'hub' && (
          <button onClick={showHub} className="mb-6 text-teal-400 hover:text-teal-300 cursor-pointer">
            &larr; 執務室のトップに戻る
          </button>
        )}
        {renderCurrentView()}
      </div>
    </div>
  );
}
