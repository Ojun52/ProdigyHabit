'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Send, Mic, Bot, User, Coffee } from 'lucide-react';

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

export default function FocusChat({ initialDuration, onStartBreak }: { initialDuration?: number; onStartBreak?: () => void; }) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'ai', 
      text: initialDuration 
        ? `${initialDuration}分間の集中、お疲れ様でした！どのような成果がありましたか？`
        : 'お疲れ様です！今日の集中作業について教えてください。（例:「〇〇の資料を30分作成した」）' 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSessionSaved, setIsSessionSaved] = useState(false); // To track if save was successful
  
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
      const payload: { message: string; history: Message[]; known_duration?: number } = {
        message: userMessage.text,
        history: messages,
      };
      if (initialDuration) {
        payload.known_duration = initialDuration;
      }

      const response = await api.post('/chat/focus', payload);

      const aiReply = response.data.reply;
      const jsonMarker = 'JSON_DATA:';
      const jsonIndex = aiReply.indexOf(jsonMarker);

      if (jsonIndex !== -1) {
        const visibleText = aiReply.substring(0, jsonIndex).trim();
        const jsonString = aiReply.substring(jsonIndex + jsonMarker.length).trim();
        
        if (visibleText) {
          setMessages(prev => [...prev, { sender: 'ai', text: visibleText }]);
        }

        // Parse and save the data
        try {
          const structuredData = JSON.parse(jsonString);
          // Call the new unified save endpoint
          await api.post('/activity/log', {
            log_type: 'focus',
            data: structuredData
          });
          setMessages(prev => [...prev, { sender: 'ai', text: "記録をDBに保存しました！素晴らしい成果です！" }]);
          setIsSessionSaved(true); // Mark session as saved
        } catch (e) {
          console.error("Failed to parse or save structured data:", e);
          setMessages(prev => [...prev, { sender: 'ai', text: "データの保存に失敗しました…。" }]);
        }
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
      }
    } catch (error) {
      console.error("Chat API error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "すみません、AIが応答できませんでした。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-xl">
      {/* Message Area */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && <Bot className="h-8 w-8 text-teal-400 flex-shrink-0" />}
            <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md ${
              msg.sender === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-gray-700 text-gray-200 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
            {msg.sender === 'user' && <User className="h-8 w-8 text-gray-400 flex-shrink-0" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-end gap-2 justify-start">
            <Bot className="h-8 w-8 text-teal-400 flex-shrink-0" />
            <div className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 rounded-bl-none">
              <p className="animate-pulse">AIが入力中...</p>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Break Button - shown only after a timed session is saved */}
      {isSessionSaved && initialDuration && onStartBreak && (
        <div className="p-4 bg-gray-900/50 border-t border-gray-700">
          <button
            onClick={onStartBreak}
            className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 font-bold text-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Coffee size={20} />
            休憩を開始する
          </button>
        </div>
      )}

      {/* Input Area - hidden after session is saved to prevent re-submission */}
      {!isSessionSaved && (
        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex items-center gap-2">
          <button 
            onClick={handleVoiceInput}
            disabled={!recognition.current || isLoading}
            className={`p-2 rounded-full hover:bg-gray-700 disabled:opacity-50 ${isListening ? 'bg-red-500' : 'bg-transparent'}`}
          >
            <Mic className="h-6 w-6 text-gray-300" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-grow bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="メッセージを入力..."
            disabled={isLoading}
          />
          <button onClick={handleSendMessage} disabled={isLoading} className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 cursor-pointer">
            <Send size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
