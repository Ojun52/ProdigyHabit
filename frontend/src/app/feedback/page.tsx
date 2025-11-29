'use client';

import { useState } from 'react';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchFeedback = async () => {
    setIsLoading(true);
    setError(null);
    setFeedback('');
    try {
      const response = await api.get('/feedback');
      setFeedback(response.data.feedback);
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError('フィードバックを生成するにはログインしてください。');
      } else {
        setError('フィードバックの生成に失敗しました。');
      }
      console.error('API呼び出し中にエラーが発生しました。', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-6 text-teal-300">AIからのフィードバック</h1>
      
      {!feedback && !isLoading && !error && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
          <p className="mb-6 text-lg">直近の活動記録を基に、AIが生産性向上のためのフィードバックを生成します。</p>
          <button
            onClick={handleFetchFeedback}
            className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer"
          >
            フィードバックを生成する
          </button>
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl mt-6 text-left">
        {isLoading && <p className="text-center">AIがフィードバックを生成中です...</p>}
        {error && <p className="text-center text-red-400">{error}</p>}
        {feedback && (
          <article className="prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {feedback}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}