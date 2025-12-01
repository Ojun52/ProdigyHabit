'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import LoungeChat from '@/components/LoungeChat';
import { Sofa, Clock, RefreshCcw } from 'lucide-react';
import { MoonIcon, DevicePhoneMobileIcon, FaceSmileIcon } from '@heroicons/react/24/outline';

// Sub-component for the quick input form
const LoungeQuickInput = ({ onSubmitted }: { onSubmitted: (aiMessage: string | null) => void }) => {
  const [sleepHours, setSleepHours] = useState(7.5);
  const [screenTime, setScreenTime] = useState(180);
  const [mood, setMood] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await api.post('/lounge/quick', {
        sleep_hours: sleepHours,
        screen_time: screenTime,
        mood: mood,
      });
      onSubmitted(response.data.ai_message);
    } catch (err) {
      setError('記録の送信に失敗しました。後ほど再試行してください。');
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleSameAsYesterday = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const latestResponse = await api.get('/lounge/latest');
      if (latestResponse.data) {
        const { sleep_hours, screen_time, mood } = latestResponse.data;
        // Use the latest data to submit
        const quickResponse = await api.post('/lounge/quick', {
          sleep_hours: sleep_hours || 7.5,
          screen_time: screen_time || 180,
          mood: mood || 3,
        });
        onSubmitted(quickResponse.data.ai_message);
      } else {
        // If no "yesterday" data, just submit with current defaults
        handleSubmit();
      }
    } catch (err) {
      setError('「昨日と同じ」データの取得または送信に失敗しました。');
      console.error(err);
      setIsSubmitting(false);
    }
  };
  
  const moodIcons = ["😫", "😟", "😐", "😊", "😁"];

  return (
    <div className="w-full max-w-2xl p-8 bg-gray-800 rounded-lg shadow-xl space-y-8">
      <h2 className="text-2xl font-bold text-center text-white">クイック記録</h2>
      <p className="text-center text-gray-400">
        今日のコンディションを素早く記録しましょう。
      </p>

      {error && <p className="text-red-400 text-center">{error}</p>}
      
      <div className="space-y-6">
        {/* Sleep Hours Slider */}
        <div className="space-y-2">
          <label htmlFor="sleep-slider" className="flex items-center gap-2 text-lg font-medium text-gray-200">
            <MoonIcon className="h-6 w-6 text-indigo-400" />
            睡眠時間: <span className="font-bold text-indigo-300">{sleepHours.toFixed(1)} 時間</span>
          </label>
          <input
            id="sleep-slider"
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-indigo"
            disabled={isSubmitting}
          />
        </div>

        {/* Screen Time Slider */}
        <div className="space-y-2">
          <label htmlFor="screen-time-slider" className="flex items-center gap-2 text-lg font-medium text-gray-200">
            <DevicePhoneMobileIcon className="h-6 w-6 text-sky-400" />
            スマホ時間: <span className="font-bold text-sky-300">{Math.floor(screenTime / 60)}時間 {screenTime % 60}分</span>
          </label>
          <input
            id="screen-time-slider"
            type="range"
            min="0"
            max="720" // 12 hours
            step="15"
            value={screenTime}
            onChange={(e) => setScreenTime(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-sky"
            disabled={isSubmitting}
          />
        </div>

        {/* Mood Slider */}
         <div className="space-y-2">
           <label htmlFor="mood-slider" className="flex items-center gap-2 text-lg font-medium text-gray-200">
             <FaceSmileIcon className="h-6 w-6 text-amber-400" />
             今の気分: <span className="text-3xl">{moodIcons[mood - 1]}</span>
           </label>
           <input
             id="mood-slider"
             type="range"
             min="1"
             max="5"
             step="1"
             value={mood}
             onChange={(e) => setMood(parseInt(e.target.value))}
             className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-amber"
             disabled={isSubmitting}
           />
         </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          onClick={handleSameAsYesterday}
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCcw className="w-5 h-5 mr-2" />
          昨日と同じ
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? '送信中...' : '記録する'}
        </button>
      </div>
       <div className="text-center pt-2">
         <button
           onClick={() => onSubmitted(null)} // Pass null to just switch to chat without a message
           className="text-gray-400 hover:text-white transition-colors text-sm"
          >
           チャットで詳しく話す →
          </button>
       </div>
    </div>
  );
};


export default function LoungePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'form' | 'chat'>('form');
  const [initialAiMessage, setInitialAiMessage] = useState<string | null>(null);

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

  const handleSubmitted = (aiMessage: string | null) => {
    if (aiMessage) {
      setInitialAiMessage(aiMessage);
    }
    setView('chat');
  };

  const renderLoginRequired = () => (
    <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-red-400">ログインが必要です</h2>
      <p className="mt-2 text-gray-300">この機能を利用するには、ログインしてください。</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 w-full">
      <div className="flex items-center gap-4 mb-6">
        <Sofa className="h-10 w-10 sm:h-12 sm:w-12 text-green-400" />
        <h1 className="text-3xl sm:text-4xl font-bold">ラウンジ</h1>
      </div>
      
      {isLoading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : !isLoggedIn ? (
        renderLoginRequired()
      ) : view === 'form' ? (
        <LoungeQuickInput onSubmitted={handleSubmitted} />
      ) : (
        <LoungeChat initialMessage={initialAiMessage} />
      )}
    </div>
  );
}