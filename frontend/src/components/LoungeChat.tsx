'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Bot, User } from 'lucide-react';
import ChatInput from './ChatInput'; // Import the new ChatInput component

// Define message type
interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface LoungeChatProps {
  initialMessage?: string | null;
}

// Voice Recognition setup
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function LoungeChat({ initialMessage }: LoungeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null); // Added cooldownMessage state

  const recognition = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Set initial message
  useEffect(() => {
    if (initialMessage) {
      setMessages([{ sender: 'ai', text: initialMessage }]);
    } else {
      setMessages([
        {
          sender: 'ai',
          text: 'こんにちは！あなたの体調管理をサポートします。最近の睡眠時間、スマホ使用時間、今の気分（1〜5段階）など、なんでもお話しください。'
        }
      ]);
    }
  }, [initialMessage]);

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
        recognition.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const handleVoiceInput = () => {
    if (recognition.current && !isListening) {
      setInputValue(''); // Clear input before voice input
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
    setCooldownMessage(null); // Clear any previous cooldown message

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
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
      }
    } catch (error: any) { // Type 'any' for error to access response
      console.error("Lounge Chat API error:", error);
      if (error.response && error.response.status === 429 && error.response.data.cooldown) {
        setCooldownMessage(error.response.data.error);
        setMessages(prev => [...prev, { sender: 'ai', text: error.response.data.error }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: "すみません、AIが応答できませんでした。" }]);
      }
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
      <ChatInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSendMessage={handleSendMessage}
        handleVoiceInput={handleVoiceInput}
        isLoading={isLoading}
        isListening={isListening}
        recognition={recognition}
        maxLength={200}
        placeholder="メッセージを入力..."
        inputClassName="bg-green-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        sendButtonClassName="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:bg-gray-600 cursor-pointer"
      />
      {cooldownMessage && (
        <div className="p-2 text-center text-amber-300 font-bold bg-green-900/50 border-t border-green-700">
          {cooldownMessage}
        </div>
      )}
    </div>
  );
}
