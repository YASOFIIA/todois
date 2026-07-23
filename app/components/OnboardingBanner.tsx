'use client';

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export const OnboardingBanner: React.FC = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative mb-4 p-4 rounded-[20px] bg-white border border-[#F5E0E7] text-[#2D2235] shadow-[0_4px_20px_rgba(199,146,164,0.08)] animate-in fade-in slide-in-from-top-2 duration-300">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#9B8FA3] hover:text-[#2D2235] rounded-lg transition-colors"
        aria-label="Закрити підказку"
      >
        <X strokeWidth={1.5} className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="p-2.5 rounded-xl bg-[#FFF5F7] border border-[#F2A3BF]/40 text-[#E8729B] shrink-0 shadow-inner">
          <Sparkles strokeWidth={1.5} className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#2D2235] mb-0.5">
            Швидкий старт 🧠
          </h4>
          <p className="text-xs text-[#9B8FA3] leading-relaxed">
            Напиши або надиктуй все, що в голові — AI розкладе по поличках, визначить пріоритет та час!
          </p>
        </div>
      </div>
    </div>
  );
};
