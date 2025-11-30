'use client';

import React, { useState, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
  handleVoiceInput: () => void;
  isLoading: boolean;
  isListening: boolean;
  recognition: React.MutableRefObject<any>;
  maxLength?: number;
  placeholder?: string;
  inputClassName?: string;
  sendButtonClassName?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  setInputValue,
  handleSendMessage,
  handleVoiceInput,
  isLoading,
  isListening,
  recognition,
  maxLength = 200,
  placeholder = "メッセージを入力...",
  inputClassName = "bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500",
  sendButtonClassName = "bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 cursor-pointer",
}) => {
  const currentLength = inputValue.length;
  const isApproachingLimit = currentLength >= maxLength - 20; // Example: change color at 180 chars

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxLength) {
      setInputValue(e.target.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex items-end gap-2 relative">
      <button 
        onClick={handleVoiceInput}
        disabled={!recognition.current || isLoading}
        className={`p-2 rounded-full hover:bg-gray-700 disabled:opacity-50 ${isListening ? 'bg-red-500' : 'bg-transparent'}`}
      >
        <Mic className="h-6 w-6 text-gray-300" />
      </button>
      
      <div className="flex-grow relative">
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full resize-none pr-16 leading-tight ${inputClassName}`} // Added pr-16 for counter, leading-tight
          placeholder={placeholder}
          disabled={isLoading}
          rows={1} // Start with 1 row
          maxLength={maxLength}
          style={{ minHeight: '42px', maxHeight: '150px' }} // minHeight matches input, maxHeight to limit growth
        />
        <span 
          className={`absolute bottom-2 right-2 text-sm ${
            isApproachingLimit ? 'text-red-400' : 'text-gray-400'
          }`}
        >
          {currentLength} / {maxLength}
        </span>
      </div>

      <button onClick={handleSendMessage} disabled={isLoading || inputValue.trim().length === 0} className={sendButtonClassName}>
        <Send size={20} />
      </button>
    </div>
  );
};

export default ChatInput;
