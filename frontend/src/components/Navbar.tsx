'use client';

import api from '@/lib/api';
import {
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  HomeIcon,
} from '@heroicons/react/24/solid';
import { BrainCircuit, Sofa } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AnimatedHamburgerButton from './AnimatedHamburgerButton'; // Import the new component

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const checkAuthAndStats = async () => {
      setIsLoading(true);
      try {
        await api.get('/me'); 
        setIsLoggedIn(true);
        // If logged in, fetch stats
        try {
          const statsResponse = await api.get('/me/stats');
          setStreak(statsResponse.data.streak || 0);
        } catch (statsError) {
          console.error('統計の取得に失敗しました。', statsError);
          setStreak(0); // Reset streak on error
        }
      } catch (error) {
        setIsLoggedIn(false);
        setStreak(0); // Not logged in, so no streak
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthAndStats();
  }, []);
  
  const handleLogout = async () => {
    try {
      await api.post('/logout');
      setIsLoggedIn(false);
      setStreak(0); // Reset streak on logout
      window.location.href = '/'; // Redirect to home to reflect logout state
    } catch (error) {
      console.error('ログアウトに失敗しました。', error);
    }
  };  

  const navLinks = [
    { href: '/', text: 'ホーム', icon: HomeIcon },
    { href: '/focus', text: '執務室', icon: BrainCircuit },
    { href: '/lounge', text: 'ラウンジ', icon: Sofa },
    { href: '/history', text: '履歴', icon: ClockIcon },
    { href: '/graph', text: 'グラフ', icon: ChartBarIcon },
    { href: '/feedback', text: 'フィードバック', icon: ChatBubbleLeftRightIcon },
  ];

  return (
    <header className="bg-gray-800 shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-white">
              ProdigyHabit
            </Link>
            {isLoggedIn && streak > 0 && (
              <span className="text-orange-400 font-bold hidden sm:inline">
                🔥 {streak}日連続
              </span>
            )}
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map(link => (
              <Link key={link.text} href={link.href} className="flex items-center gap-2 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer">
                <link.icon className="h-5 w-5" />
                {link.text}
              </Link>
            ))}
            {!isLoading && (
              isLoggedIn ? (
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer">
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  ログアウト
                </button>
              ) : (
                <a href={`${BACKEND_API_URL}/login`} className="flex items-center gap-2 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer">
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  ログイン
                </a>
              )
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center z-50">
             {isLoggedIn && streak > 0 && (
              <span className="text-orange-400 font-bold text-sm mr-2">
                🔥 {streak}日
              </span>
            )}
            <AnimatedHamburgerButton 
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              ariaControls="mobile-menu"
            />
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
            onClick={() => setIsMenuOpen(false)}
          ></div>
        )}

        {/* Mobile Menu Content */}
        <div className={`fixed top-0 right-0 w-64 h-full bg-gray-800 shadow-lg p-6 transform transition-transform duration-300 ease-in-out z-50 md:hidden
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex justify-end mb-6">
            <AnimatedHamburgerButton 
              isOpen={true} // Always show as 'X' state inside the menu
              onClick={() => setIsMenuOpen(false)} 
            />
          </div>
          <div className="flex flex-col space-y-4">
              {navLinks.map(link => (
                <Link key={link.text} href={link.href} className="flex items-center gap-3 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                  <link.icon className="h-6 w-6" />
                  {link.text}
                </Link>
              ))}
              {!isLoading && (
                isLoggedIn ? (
                  <button onClick={handleLogout} className="flex items-center gap-3 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer text-left w-full">
                    <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                    ログアウト
                  </button>
                ) : (
                  <a href={`${BACKEND_API_URL}/login`} className="flex items-center gap-3 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer">
                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    ログイン
                  </a>
                )
              )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
