import React from 'react';

export const Logo = ({ className = "", size = 40 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <path d="M48 30 L54 30 L38 92 L32 92 Z" fill="url(#logo-grad)" className="opacity-90" />
        <path d="M10 12 L85 12 L78 26 L3 26 Z" fill="url(#logo-grad)" />
        <rect x="76" y="16" width="3" height="3" fill="#6366f1" />
      </svg>
    </div>
  );
};