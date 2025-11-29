'use client';

import { useState } from 'react';
import { Sofa, Send, Bot } from 'lucide-react';
import api from '@/lib/api';

// Type definition for the form data
interface ConditionData {
  sleep_hours: number;
  screen_time_minutes: number;
  mood: number;
  memo: string;
}

// Condition Form Component
const ConditionForm = ({ onConsult }: { onConsult: (data: ConditionData) => void }) => {
  const [sleep, setSleep] = useState(7);
  const [screenTime, setScreenTime] = useState(180);
  const [mood, setMood] = useState(3);
  const [memo, setMemo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConsult({
      sleep_hours: sleep,
      screen_time_minutes: screenTime,
      mood: mood,
      memo: memo,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto space-y-6">
      <div className="space-y-2">
        <label htmlFor="sleep" className="block text-lg">睡眠時間: <span className="font-bold text-green-400">{sleep}時間</span></label>
        <input id="sleep" type="range" min="0" max="12" step="0.5" value={sleep} onChange={(e) => setSleep(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
      </div>
      <div className="space-y-2">
        <label htmlFor="screenTime" className="block text-lg">スマホ使用: <span className="font-bold text-green-400">{Math.floor(screenTime / 60)}時間 {screenTime % 60}分</span></label>
        <input id="screenTime" type="range" min="0" max={12 * 60} step="15" value={screenTime} onChange={(e) => setScreenTime(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
      </div>
      <div className="space-y-2">
        <label htmlFor="mood" className="block text-lg">今の気分 (1-5): <span className="font-bold text-green-400">{mood}</span></label>
        <input id="mood" type="range" min="1" max="5" step="1" value={mood} onChange={(e) => setMood(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
      </div>
      <div className="space-y-2">
        <label htmlFor="memo" className="block text-lg">AIへの相談・メモ</label>
        <textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          rows={4}
          placeholder="例：最近、寝つきが悪くて困っています。"
        />
      </div>
      <button type="submit" className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:bg-gray-600 font-bold text-lg flex items-center justify-center gap-2 cursor-pointer">
        <Send size={20} />
        AIに相談して記録する
      </button>
    </form>
  );
};

// Consult Chat Component
const ConsultChat = ({ initialData, advice }: { initialData: ConditionData, advice: string }) => {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="bg-gray-700 p-4 rounded-lg">
        <p className="font-bold">あなたの今日のコンディション</p>
        <ul className="list-disc list-inside mt-2">
          <li>睡眠: {initialData.sleep_hours} 時間</li>
          <li>スマホ: {Math.floor(initialData.screen_time_minutes / 60)}時間 {initialData.screen_time_minutes % 60}分</li>
          <li>気分: {initialData.mood} / 5</li>
          {initialData.memo && <li>相談内容: {initialData.memo}</li>}
        </ul>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg flex gap-4">
        <Bot className="h-10 w-10 text-green-400 flex-shrink-0 mt-1" />
        <div>
          <p className="font-bold text-green-400">AIからのアドバイス</p>
          <p className="mt-2 whitespace-pre-wrap">{advice}</p>
        </div>
      </div>
    </div>
  );
};


// Main Page Component
export default function LoungePage() {
  const [consultation, setConsultation] = useState<{ data: ConditionData, advice: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConsult = async (data: ConditionData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/lounge/consult', data);
      setConsultation({ data: data, advice: response.data.ai_advice });
    } catch (err) {
      console.error("AIへの相談に失敗しました。", err);
      setError("AIへの相談に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-lg shadow-2xl">
      <Sofa className="h-12 w-12 text-green-400 mb-4" />
      <h1 className="text-4xl font-bold mb-8">ラウンジ - Lounge Mode</h1>
      
      {isLoading ? (
        <p>AIがあなたにぴったりのアドバイスを考えています...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : consultation ? (
        <ConsultChat initialData={consultation.data} advice={consultation.advice} />
      ) : (
        <ConditionForm onConsult={handleConsult} />
      )}
    </div>
  );
}
