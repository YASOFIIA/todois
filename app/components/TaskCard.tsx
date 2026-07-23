'use client';

import React, { useState, useRef } from 'react';
import { Task, Priority } from '@/app/types';
import { Clock, Calendar, Tag, Trash2, Check, Edit3, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (task: Task) => void;
  onMoveToToday?: (id: string) => void;
  showCheckbox?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
  onMoveToToday,
  showCheckbox = false,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return {
          label: '🔴 High',
          color: 'bg-[#E8729B]/10 text-[#E8729B] border-[#E8729B]/20',
        };
      case 'medium':
        return {
          label: '🟡 Medium',
          color: 'bg-[#F5B97A]/20 text-[#C76F1D] border-[#F5B97A]/30',
        };
      case 'low':
        return {
          label: '🟢 Low',
          color: 'bg-[#A8D8B9]/30 text-[#2D6A42] border-[#A8D8B9]/40',
        };
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} хв`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} год ${mins} хв` : `${hrs} год`;
  };

  const formatDeadline = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('uk-UA', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const priorityBadge = getPriorityBadge(task.priority);
  const formattedDeadline = formatDeadline(task.deadline);

  // Mobile Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;

    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -120));
    } else if (diff > 0 && onMoveToToday && task.source === 'inbox') {
      setSwipeOffset(Math.min(diff, 120));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -80) {
      onDelete(task.id);
    } else if (swipeOffset > 80 && onMoveToToday && task.source === 'inbox') {
      onMoveToToday(task.id);
    }
    setSwipeOffset(0);
    setTouchStartX(null);
    setIsSwiping(false);
  };

  const handleToggle = () => {
    if (onToggleComplete) {
      if (!task.completed) {
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#E8729B', '#F2A3BF', '#F5B97A', '#A8D8B9'],
        });
      }
      onToggleComplete(task.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="relative overflow-hidden rounded-[16px]">
      {/* Mobile Swipe Left Background (Delete) */}
      <div className="absolute inset-0 bg-rose-500 rounded-[16px] flex items-center justify-end px-6 text-white font-semibold text-xs gap-2">
        <span>Видалити</span>
        <Trash2 strokeWidth={1.5} className="w-5 h-5" />
      </div>

      {/* Mobile Swipe Right Background (Move to Today) */}
      {onMoveToToday && task.source === 'inbox' && (
        <div className="absolute inset-0 bg-[#A8D8B9] rounded-[16px] flex items-center justify-start px-6 text-[#2D6A42] font-semibold text-xs gap-2">
          <ArrowRight strokeWidth={1.5} className="w-5 h-5" />
          <span>В Today</span>
        </div>
      )}

      {/* Main Task Card */}
      <div
        ref={cardRef}
        draggable={task.source === 'inbox'}
        onDragStart={handleDragStart}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`group relative p-4 rounded-[16px] bg-white border border-[#F5E0E7] shadow-[0_2px_12px_rgba(199,146,164,0.06)] transition-all duration-300 ${
          task.completed
            ? 'bg-emerald-50/40 border-emerald-200/60 opacity-60'
            : 'hover:shadow-[0_4px_16px_rgba(199,146,164,0.12)] hover:border-[#F2A3BF]'
        } ${task.source === 'inbox' ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Checkbox */}
          {showCheckbox && (
            <button
              onClick={handleToggle}
              className="min-w-[36px] min-h-[36px] -ml-1 flex items-center justify-center text-[#C4B5CC] hover:text-[#E8729B] transition-colors focus:outline-none shrink-0"
              aria-label={task.completed ? 'Відмітити як невиконану' : 'Відмітити як виконану'}
            >
              {task.completed ? (
                <div className="w-5 h-5 rounded-full bg-[#E8729B] text-white flex items-center justify-center shadow-md shadow-[#E8729B]/30 animate-in zoom-in duration-200">
                  <Check strokeWidth={2.5} className="w-3 h-3" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-[#F2A3BF] group-hover:border-[#E8729B] transition-colors" />
              )}
            </button>
          )}

          {/* Task Main Content */}
          <div
            onClick={() => onEdit && onEdit(task)}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h3
              className={`text-[15px] font-medium text-[#2D2235] leading-snug break-words transition-colors ${
                task.completed ? 'line-through text-[#9B8FA3]' : 'group-hover:text-[#E8729B]'
              }`}
            >
              {task.title}
            </h3>

            {/* Badges & Meta Row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
              {/* Priority Badge */}
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold border text-[11px] ${priorityBadge.color}`}
              >
                {priorityBadge.label}
              </span>

              {/* Duration Badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF5F7] border border-[#F5E0E7] text-[#2D2235]">
                <Clock strokeWidth={1.5} className="w-3 h-3 text-[#E8729B]" />
                {formatMinutes(task.estimatedMinutes)}
              </span>

              {/* Deadline Badge */}
              {formattedDeadline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF5F7] border border-[#F2A3BF]/40 text-[#E8729B]">
                  <Calendar strokeWidth={1.5} className="w-3 h-3 text-[#E8729B]" />
                  {formattedDeadline}
                </span>
              )}

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  {task.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5E0E7]/60 text-[#9B8FA3] text-[11px]"
                    >
                      <Tag strokeWidth={1.5} className="w-3 h-3 text-[#E8729B]" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons (Visible ONLY on Hover) */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-[#C4B5CC] hover:text-[#E8729B] hover:bg-[#FFF5F7] rounded-lg transition-all"
                title="Редагувати задача"
              >
                <Edit3 strokeWidth={1.5} className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 text-[#C4B5CC] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Видалити задачу"
              aria-label="Видалити задачу"
            >
              <Trash2 strokeWidth={1.5} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
