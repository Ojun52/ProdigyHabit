'use client';

import { useState, useEffect } from 'react';
import { useTimer } from 'react-timer-hook';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { BrainCircuit, Coffee, ArrowRight } from 'lucide-react';

// Timer Component
const Timer = ({ durationMinutes, onFinish, onStart, onCompleteManually }: { durationMinutes: number; onFinish: () => void; onStart: () => void; onCompleteManually: () => void; }) => {
  const durationSeconds = durationMinutes * 60;
  const expiryTimestamp = new Date();
  expiryTimestamp.setSeconds(expiryTimestamp.getSeconds() + durationSeconds);

  const {
    seconds,
    minutes,
    isRunning,
    start,
    pause,
    resume,
    restart,
  } = useTimer({ expiryTimestamp, onExpire: onFinish, autoStart: false });

  const totalSeconds = minutes * 60 + seconds;
  const percentage = Math.max(0, (totalSeconds / durationSeconds) * 100);

  const handleStart = () => {
    onStart();
    const newExpiry = new Date();
    newExpiry.setSeconds(newExpiry.getSeconds() + durationSeconds);
    restart(newExpiry, true);
  };

  return (
    <div className="text-center">
      <div style={{ width: 250, height: 250 }} className="mx-auto">
        <CircularProgressbar
          value={percentage}
          text={`${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`}
          styles={buildStyles({
            textColor: '#F3F4F6',
            pathColor: isRunning ? '#818CF8' : '#4F46E5',
            trailColor: '#374151',
          })}
        />
      </div>
      <div className="mt-6 flex justify-center gap-4">
        {totalSeconds === durationSeconds && !isRunning ? (
           <button onClick={handleStart} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
             スタート
           </button>
        ) : isRunning ? (
          <button onClick={pause} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
            一時停止
          </button>
        ) : (
          <button onClick={resume} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
            再開
          </button>
        )}
        <button onClick={onCompleteManually} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer">
          作業完了
        </button>
      </div>
    </div>
  );
};


// Main Pomodoro Manager Component
export default function PomodoroManager({ onSessionComplete }: { onSessionComplete: (duration: number) => void }) {
  const [view, setView] = useState<'SETTINGS' | 'TIMER'>('SETTINGS');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [sessionType, setSessionType] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [timerKey, setTimerKey] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const handleStartSession = () => {
    setView('TIMER');
    setTimerKey(prev => prev + 1);
  };

  const handleFinish = () => {
    setIsTimerRunning(false);
    if (sessionType === 'FOCUS') {
      onSessionComplete(focusMinutes); // Call parent on complete
    } else {
      setSessionType('FOCUS');
      setView('SETTINGS');
    }
  };

  const handleEarlyComplete = () => {
    setIsTimerRunning(false);
    if (sessionType === 'FOCUS') {
      onSessionComplete(focusMinutes); // Call parent on complete
    } else {
      setSessionType('FOCUS');
      setView('SETTINGS');
    }
  };
  
  const switchSessionType = () => {
    setSessionType(prev => prev === 'FOCUS' ? 'BREAK' : 'FOCUS');
    setTimerKey(prev => prev + 1);
    setView('TIMER');
    setIsTimerRunning(false);
  };

  const currentDuration = sessionType === 'FOCUS' ? focusMinutes : breakMinutes;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4 justify-center">
        {sessionType === 'FOCUS' ? <BrainCircuit className="h-12 w-12 text-indigo-400" /> : <Coffee className="h-12 w-12 text-green-400" />}
        <h2 className="text-3xl font-bold">
          {sessionType === 'FOCUS' ? '集中モード' : '休憩モード'}
        </h2>
      </div>
      
      {view === 'SETTINGS' && (
        <div className="w-full text-center space-y-6 p-4 bg-gray-800/50 rounded-lg">
            <div className="flex justify-center gap-4 items-center">
                <div className="space-y-2">
                    <label className="block text-lg">集中時間 (分)</label>
                    <input type="number" value={focusMinutes} onChange={(e) => setFocusMinutes(parseInt(e.target.value))} className="w-24 bg-gray-700 text-center text-xl p-2 rounded-md cursor-pointer" />
                </div>
                <div className="space-y-2">
                    <label className="block text-lg">休憩時間 (分)</label>
                    <input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(parseInt(e.target.value))} className="w-24 bg-gray-700 text-center text-xl p-2 rounded-md cursor-pointer" />
                </div>
            </div>
            <button onClick={handleStartSession} className="px-8 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-lg font-bold cursor-pointer">
                {sessionType === 'FOCUS' ? '集中セッションを開始' : '休憩を開始'}
            </button>
        </div>
      )}

      {view === 'TIMER' && (
        <div className="w-full">
            <Timer key={timerKey} durationMinutes={currentDuration} onFinish={handleFinish} onStart={() => setIsTimerRunning(true)} onCompleteManually={handleEarlyComplete} />
            {isTimerRunning && (
                <button onClick={switchSessionType} className="mt-4 text-gray-400 hover:text-white flex items-center gap-2 mx-auto cursor-pointer">
                    {sessionType === 'FOCUS' ? '休憩に切り替え' : '集中に切り替え'} <ArrowRight size={16} />
                </button>
            )}
        </div>
      )}
    </div>
  );
}