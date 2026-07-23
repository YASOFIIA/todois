'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'AI аналізує твої думки...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer pulse ring */}
        <div className="absolute w-20 h-20 rounded-full bg-[#F2A3BF]/30 animate-ping opacity-75" />

        {/* Spinning border ring */}
        <div className="w-16 h-16 rounded-full border-4 border-[#F5E0E7] border-t-[#E8729B] animate-spin" />

        {/* Center icon */}
        <div className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#F2A3BF] text-[#E8729B] shadow-md">
          <Sparkles strokeWidth={1.5} className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      <p className="text-[#2D2235] font-semibold text-base mb-1 tracking-tight">
        Зачекайте декілька секунд
      </p>

      <p className="text-[#9B8FA3] text-sm animate-pulse">
        {message}
      </p>
    </div>
  );
};
