'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await api.get('/feedback');
        setFeedback(response.data.feedback);
      } catch (err: any) {
        if (err.response && err.response.status === 401) {
          setError('フィードバックを見るにはログインしてください。');
        } else {
          setError('フィードバックの生成に失敗しました。');
        }
        console.error('API呼び出し中にエラーが発生しました。', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-teal-300">AIからのフィードバック</h1>
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        {isLoading && <p className="text-center">AIがフィードバックを生成中...</p>}
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