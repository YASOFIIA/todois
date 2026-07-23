'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji = '✨',
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-[#F5E0E7] rounded-[24px] shadow-[0_4px_20px_rgba(199,146,164,0.08)] my-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-5xl mb-4 p-5 rounded-[20px] bg-[#FFF5F7] border border-[#F5E0E7] shadow-inner">
        {emoji}
      </div>

      <h3 className="text-xl font-semibold text-[#2D2235] mb-2 tracking-tight">
        {title}
      </h3>

      <p className="text-[#9B8FA3] text-sm max-w-xs leading-relaxed mb-6">
        {description}
      </p>

      {actionText && onAction && (
        <div className="md:hidden">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-6 py-3.5 min-h-[48px] rounded-[16px] bg-gradient-to-r from-[#E8729B] to-[#D4619A] hover:from-[#d65f88] hover:to-[#c24f88] text-white font-medium text-sm shadow-[0_6px_20px_rgba(232,114,155,0.25)] transition-all duration-300 active:scale-95"
          >
            <span>{actionText}</span>
            <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
