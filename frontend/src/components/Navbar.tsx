'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  PencilSquareIcon,
  ClockIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/solid';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await api.get('/me');
        setIsLoggedIn(true);
      } catch (error) {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);
  
  const handleLogout = async () => {
    try {
      await api.post('/logout');
      setIsLoggedIn(false);
      window.location.href = '/'; // Redirect to home to reflect logout state
          } catch (error) {
          console.error('ログアウトに失敗しました。', error);
        }
      };  
  const navLinks = [
    { href: '/', text: 'ホーム', icon: HomeIcon },
    { href: '/entry', text: '今日の記録', icon: PencilSquareIcon },
    { href: '/history', text: '履歴', icon: ClockIcon },
    { href: '/graph', text: 'グラフ', icon: ChartBarIcon },
    { href: '/feedback', text: 'フィードバック', icon: ChatBubbleLeftRightIcon },
  ];

  return (
    <header className="bg-gray-800 shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-white">
            ProdigyHabit
          </Link>
          
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
                <a href="http://localhost:5000/api/login" className="flex items-center gap-2 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer">
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  ログイン
                </a>
              )
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer z-50">
              {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
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
            <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer">
              <XMarkIcon className="h-6 w-6" />
            </button>
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
                  <a href="http://localhost:5000/api/login" className="flex items-center gap-3 text-gray-100 hover:text-teal-300 transition-colors cursor-pointer">
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
