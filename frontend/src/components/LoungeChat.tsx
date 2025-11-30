'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Send, Mic, Bot, User } from 'lucide-react';

// Define message type
interface Message {
  sender: 'user' | 'ai';
  text: string;
}

// Voice Recognition setup
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function LoungeChat() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'ai', 
      text: 'こんにちは！あなたの体調管理をサポートします。最近の睡眠時間、スマホ使用時間、今の気分（1〜5段階）など、なんでもお話しください。' 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLifeLogSaved, setIsLifeLogSaved] = useState(false); // To track if life log was saved
  
  const recognition = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = false;
        recognition.current.lang = 'ja-JP';
        recognition.current.onresult = (event: any) => {
          setInputValue(prev => prev + event.results[0][0].transcript);
          setIsListening(false);
        };
        recognition.current.onerror = (event: any) => console.error('Speech recognition error:', event.error);
        recognition.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const handleVoiceInput = () => {
    if (recognition.current && !isListening) {
      recognition.current.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const payload: { message: string; history: Message[] } = {
        message: userMessage.text,
        history: messages,
      };

      const response = await api.post('/chat/lounge', payload);

      const aiReply = response.data.reply;
      const lifeLogSaved = response.data.life_log_saved;
      const lifeLogData = response.data.life_log_data; // Assuming backend sends this back

      if (lifeLogSaved) {
        setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
        setMessages(prev => [...prev, { sender: 'ai', text: "あなたの生活記録を保存しました！AIアドバイス: " + lifeLogData.ai_advice }]);
        setIsLifeLogSaved(true); // Mark as saved
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
      }
    } catch (error) {
      console.error("Lounge Chat API error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "すみません、AIが応答できませんでした。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-green-800/20 rounded-lg shadow-xl border border-green-700">
      {/* Message Area */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && <Bot className="h-8 w-8 text-lime-400 flex-shrink-0" />}
            <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md ${
              msg.sender === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-green-700 text-gray-100 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
            {msg.sender === 'user' && <User className="h-8 w-8 text-gray-300 flex-shrink-0" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-end gap-2 justify-start">
            <Bot className="h-8 w-8 text-lime-400 flex-shrink-0" />
            <div className="px-4 py-2 rounded-lg bg-green-700 text-gray-100 rounded-bl-none">
              <p className="animate-pulse">AIが入力中...</p>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-green-900/50 border-t border-green-700 flex items-center gap-2">
        <button 
          onClick={handleVoiceInput}
          disabled={!recognition.current || isLoading}
          className={`p-2 rounded-full hover:bg-green-700 disabled:opacity-50 ${isListening ? 'bg-red-500' : 'bg-transparent'}`}
        >
          <Mic className="h-6 w-6 text-gray-300" />
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-grow bg-green-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="メッセージを入力..."
          disabled={isLoading}
        />
        <button onClick={handleSendMessage} disabled={isLoading} className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:bg-gray-600 cursor-pointer">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
