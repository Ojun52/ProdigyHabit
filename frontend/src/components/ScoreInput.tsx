'use client';

import api from '@/lib/api';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { CalendarDaysIcon, MicrophoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';

// Define the interface for the SpeechRecognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ScoreInput = () => {
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const recognition = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = false;
        recognition.current.lang = 'ja-JP';
        recognition.current.onresult = (event: any) => {
          setMemo(prev => prev + event.results[0][0].transcript);
          setIsListening(false);
        };
        recognition.current.onerror = (event: any) => {
          console.error('音声認識エラー。', error);
          setError('音声認識に失敗しました。');
          setIsListening(false);
        };
        recognition.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const handleVoiceInput = () => {
    if (recognition.current && !isListening) {
      recognition.current.start();
      setIsListening(true);
    }
  };

  const handleEvaluateAndSave = async () => {
    if (!memo.trim()) {
      setError('まず、活動内容を入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      setSuccess('AIが評価を計算しています。');
      const evaluateResponse = await api.post('/evaluate', { text: memo });
      const { score, comment } = evaluateResponse.data;

      const finalNote = `${memo}\n\n[AIコメント]：${comment}`;

      setSuccess('評価を保存しています。');
      await api.post('/entry', {
        score: score,
        note: finalNote,
        date: date,
      });

      setSuccess(`記録が保存されました！（日付：${date}、スコア：${score}）`);
      setMemo(finalNote);

    } catch (err: any) {
      if (err.response && err.response.data.error?.includes('UNIQUE constraint failed')) {
        setError('その日付の記録は既に存在します。');
      } else {
        setError('処理中にエラーが発生しました。');
      }
      console.error('API呼び出し中にエラーが発生しました。', err);
      setSuccess(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-teal-300">活動を記録</h2>
      
      {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md mb-4">{error}</p>}
      {success && <p className="text-green-400 bg-green-900/50 p-3 rounded-md mb-4">{success}</p>}
      
      <div className="space-y-8">
        <div>
          <label htmlFor="date" className="block text-base font-medium text-gray-300 mb-1">
            日付
          </label>
          <label htmlFor="date" className="relative block cursor-pointer">
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              // ▼ 変更点1: onClickでピッカーを強制表示
              onClick={(e) => e.currentTarget.showPicker()} 
              // ▼ 変更点2: [&::-webkit-calendar-picker-indicator]:hidden を追加してブラウザ標準アイコンを消す
              className="mt-1 block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base p-3 appearance-none pr-12 cursor-pointer" // Added cursor-pointer
              disabled={isLoading || (success != null && !error)}
            />
            <CalendarDaysIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-teal-400" />
          </label>
        </div>

        <div>
          <label htmlFor="memo" className="block text-base font-medium text-gray-300 mb-1">
            活動内容
          </label>
          <div className="relative">
            <textarea
              id="memo"
              rows={8}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="mt-1 block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base p-3"
              placeholder="集中して取り組んだこと、達成したタスクなどを具体的に入力してください。"
              disabled={isLoading || (success != null && !error)}
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={!recognition.current || isListening || isLoading || (success != null && !error)}
              className={`absolute bottom-3 right-3 p-2 rounded-full cursor-pointer ${isListening ? 'bg-red-500 animate-pulse' : 'bg-teal-600 hover:bg-teal-700'} disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors`}
              title="音声メモを録音"
            >
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
        
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleEvaluateAndSave}
            disabled={isLoading || (success != null && !error)}
            className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-3 -ml-1" />
            {isLoading ? '処理中...' : 'AIに採点を依頼して記録する'}
          </button>
        </div>
        {success && !error && (
            <div className="text-center">
                <Link href="/history" className="text-teal-400 hover:text-teal-300 transition-colors cursor-pointer">
                    履歴ページで確認 →
                </Link>
            </div>
        )}
      </div>
    </div>
  );
};

export default ScoreInput;