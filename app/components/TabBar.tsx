'use client';

import React from 'react';
import { TabType } from '@/app/types';
import { Brain, Inbox, CalendarCheck } from 'lucide-react';

interface TabBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  inboxCount: number;
  todayCount: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  setActiveTab,
  inboxCount,
  todayCount,
}) => {
  const tabs = [
    {
      id: 'capture' as TabType,
      label: 'Capture',
      icon: Brain,
      badge: 0,
    },
    {
      id: 'inbox' as TabType,
      label: 'Inbox',
      icon: Inbox,
      badge: inboxCount,
    },
    {
      id: 'today' as TabType,
      label: 'Today',
      icon: CalendarCheck,
      badge: todayCount,
    },
  ];

  return (
    <nav
      aria-label="Головне меню"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#F5E0E7] px-6 py-2 shadow-[0_-4px_20px_rgba(199,146,164,0.08)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[70px] min-h-[52px] rounded-2xl transition-all duration-300 active:scale-95 ${
                isActive ? 'text-[#E8729B] font-semibold' : 'text-[#C4B5CC] hover:text-[#9B8FA3]'
              }`}
            >
              <div className="relative flex flex-col items-center">
                <div className="relative">
                  <Icon
                    strokeWidth={1.5}
                    className={`w-6 h-6 transition-all duration-300 ${
                      isActive ? 'scale-110 text-[#E8729B]' : 'text-[#C4B5CC]'
                    }`}
                  />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#E8729B] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-wide">{tab.label}</span>

                {/* Pink Dot Indicator under active icon */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8729B] mt-0.5 animate-in zoom-in duration-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
