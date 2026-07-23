'use client';

import React, { useState } from 'react';
import { Task, Priority } from '@/app/types';
import { X, Check, Clock } from 'lucide-react';

interface TaskEditModalProps {
  task: Task;
  onSave: (updatedTask: Task) => void;
  onClose: () => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes);

  const durationOptions = [15, 30, 45, 60, 90, 120];

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...task,
      title: title.trim(),
      priority,
      estimatedMinutes: Number(estimatedMinutes) || 30,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#2D2235]/40 backdrop-blur-md animate-in fade-in duration-200 p-0 md:p-4">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet / Modal Card */}
      <div className="relative w-full max-w-md md:max-w-[480px] bg-white border-t md:border border-[#F5E0E7] rounded-t-[32px] md:rounded-[28px] p-6 md:p-7 shadow-[0_-8px_32px_rgba(199,146,164,0.18)] md:shadow-[0_16px_48px_rgba(199,146,164,0.22)] z-10 animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        {/* Mobile handle bar */}
        <div className="w-12 h-1.5 bg-[#F5E0E7] rounded-full mx-auto mb-6 md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[#2D2235]">
            Редагувати задачу
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-[#9B8FA3] hover:text-[#2D2235] rounded-full hover:bg-[#FFF5F7] transition-colors"
          >
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>

        {/* Title Input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#9B8FA3] mb-1.5 uppercase tracking-wider">
            Назва задачі
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-[16px] bg-[#FFF5F7] border border-[#F5E0E7] text-[#2D2235] font-normal text-base focus:outline-none focus:border-[#E8729B] focus:ring-2 focus:ring-[#F2A3BF]/30 transition-all"
            placeholder="Введіть назву задачі..."
          />
        </div>

        {/* Priority Selection */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#9B8FA3] mb-2 uppercase tracking-wider">
            Пріоритет
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'high' as Priority, label: '🔴 High', color: 'border-[#E8729B] text-[#E8729B] bg-[#E8729B]/10' },
              { id: 'medium' as Priority, label: '🟡 Medium', color: 'border-[#F5B97A] text-[#C76F1D] bg-[#F5B97A]/20' },
              { id: 'low' as Priority, label: '🟢 Low', color: 'border-[#A8D8B9] text-[#2D6A42] bg-[#A8D8B9]/30' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className={`py-2.5 px-3 rounded-[14px] text-xs font-semibold border transition-all duration-200 ${
                  priority === p.id
                    ? `${p.color} ring-2 ring-[#E8729B]/20 scale-[1.02] shadow-sm`
                    : 'border-[#F5E0E7] bg-white text-[#9B8FA3] hover:bg-[#FFF5F7]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Duration Selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#9B8FA3] mb-2 uppercase tracking-wider flex items-center justify-between">
            <span>Орієнтовний час</span>
            <span className="text-[#E8729B] font-bold text-xs flex items-center gap-1">
              <Clock strokeWidth={1.5} className="w-3.5 h-3.5" />
              {estimatedMinutes} хв
            </span>
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {durationOptions.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setEstimatedMinutes(mins)}
                className={`py-2 px-1 rounded-xl text-xs font-medium border transition-all ${
                  estimatedMinutes === mins
                    ? 'bg-[#E8729B] text-white border-[#E8729B] shadow-sm'
                    : 'bg-[#FFF5F7] text-[#2D2235] border-[#F5E0E7] hover:border-[#F2A3BF]'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim()}
          className="w-full py-4 rounded-[16px] bg-gradient-to-r from-[#E8729B] to-[#D4619A] hover:from-[#d65f88] hover:to-[#c24f88] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(232,114,155,0.3)] transition-all active:scale-95 disabled:opacity-50"
        >
          <Check strokeWidth={2} className="w-5 h-5" />
          <span>Зберегти зміни</span>
        </button>
      </div>
    </div>
  );
};
