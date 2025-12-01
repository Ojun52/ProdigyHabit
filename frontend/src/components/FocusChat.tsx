import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Bot, User, Coffee, Star } from 'lucide-react';
import ChatInput from './ChatInput'; // Import the new ChatInput component

// Define message type
interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface FocusChatProps {
  initialDuration?: number;
  onStartBreak?: () => void;
  initialScore?: number | null;
  initialMessage?: string | null;
}

// Voice Recognition setup
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function FocusChat({ initialDuration, onStartBreak, initialScore, initialMessage }: FocusChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSessionSaved, setIsSessionSaved] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  
  const recognition = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Set initial state based on props
  useEffect(() => {
    if (initialScore !== null && initialMessage) {
      // From quick input form
      const formattedMessage = `AI採点結果:
      \n- 生産性スコア: ${initialScore}点
      \n- フィードバック: ${initialMessage}
      \n\n（成果を記録しました。）`;
      setMessages([{ sender: 'ai', text: formattedMessage }]);
      setIsSessionSaved(true); // Already saved via quick form
    } else if (initialDuration) {
       // From pomodoro timer
      setMessages([{ 
        sender: 'ai', 
        text: `${initialDuration}分間の集中、お疲れ様でした！どのような成果がありましたか？`
      }]);
    } else {
      // Default manual chat entry
      setMessages([{ 
        sender: 'ai', 
        text: 'お疲れ様です！今日の集中作業について教えてください。（例:「〇〇の資料を30分作成した」）' 
      }]);
    }
  }, [initialDuration, initialScore, initialMessage]);


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
      const payload = {
        message: userMessage.text,
        history: messages, // Send the history *before* the new user message was added
        known_duration: initialDuration,
      };

      const response = await api.post('/chat/focus', payload);
      const { reply, focus_log_saved } = response.data;

      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);

      if (focus_log_saved) {
        setIsSessionSaved(true);
      }
      
    } catch (error: any) {
      console.error("Chat API error:", error);
      if (error.response && error.response.status === 429 && error.response.data.cooldown) {
        setCooldownMessage(error.response.data.error);
        setMessages(prev => [...prev, { sender: 'ai', text: error.response.data.error }]);
      } else {
        const errorMessage = error.response?.data?.error || "すみません、AIが応答できませんでした。";
        setMessages(prev => [...prev, { sender: 'ai', text: errorMessage }]);
      }
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
          inputClassName="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          sendButtonClassName="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 cursor-pointer"
        />
      )}
      {cooldownMessage && (
        <div className="p-2 text-center text-amber-300 font-bold bg-gray-900/50 border-t border-gray-700">
          {cooldownMessage}
        </div>
      )}
    </div>
  );
}
