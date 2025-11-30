'use client';

import React from 'react';

interface AnimatedHamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  ariaControls?: string;
}

const AnimatedHamburgerButton: React.FC<AnimatedHamburgerButtonProps> = ({
  isOpen,
  onClick,
  className = "",
  ariaControls,
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer relative w-10 h-10 flex flex-col justify-center items-center group ${className}`}
      aria-controls={ariaControls}
      aria-expanded={isOpen}
    >
      {/* Top bar */}
      <div
        className={`absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out
          ${isOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'}
        `}
        style={{ top: 'calc(50% - 1px)' }} // Visually align top of bar to center - 1px (half bar height)
      ></div>
      {/* Middle bar */}
      <div
        className={`absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out
          ${isOpen ? 'opacity-0' : 'opacity-100'}
        `}
        style={{ top: 'calc(50% - 1px)' }} // Visually align top of bar to center - 1px
      ></div>
      {/* Bottom bar */}
      <div
        className={`absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out
          ${isOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'}
        `}
        style={{ top: 'calc(50% - 1px)' }} // Visually align top of bar to center - 1px
      ></div>
    </button>
  );
};

export default AnimatedHamburgerButton;
