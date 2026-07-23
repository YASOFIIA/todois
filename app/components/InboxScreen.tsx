'use client';

import React, { useState } from 'react';
import { Task } from '@/app/types';
import { TaskCard } from './TaskCard';
import { EmptyState } from './EmptyState';
import { CalendarPlus, Trash2, CheckSquare, Square } from 'lucide-react';

interface InboxScreenProps {
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onPlanDay: (selectedIds?: string[]) => void;
  onNavigateToCapture: () => void;
  onClearInbox: () => void;
  onMoveSingleToToday: (id: string) => void;
}

export const InboxScreen: React.FC<InboxScreenProps> = ({
  tasks,
  onDeleteTask,
  onEditTask,
  onPlanDay,
  onNavigateToCapture,
  onClearInbox,
  onMoveSingleToToday,
}) => {
  const inboxTasks = tasks.filter((t) => t.source === 'inbox');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === inboxTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inboxTasks.map((t) => t.id));
    }
  };

  const handleBatchPlan = () => {
    if (selectedIds.length > 0) {
      onPlanDay(selectedIds);
      setSelectedIds([]);
    } else {
      onPlanDay();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column Header & Compact Action */}
      <div className="mb-4 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-[#2D2235] tracking-tight">
              Inbox
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFF5F7] text-[#E8729B] font-semibold border border-[#F5E0E7]">
              {inboxTasks.length}
            </span>
          </div>

          {inboxTasks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSelectAll}
                className="text-[12px] text-[#E8729B] flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF5F7] border border-[#F5E0E7] font-medium hover:bg-[#F5E0E7] transition-colors"
              >
                {selectedIds.length === inboxTasks.length ? (
                  <CheckSquare strokeWidth={1.5} className="w-3.5 h-3.5" />
                ) : (
                  <Square strokeWidth={1.5} className="w-3.5 h-3.5" />
                )}
                <span>{selectedIds.length === inboxTasks.length ? 'Зняти' : 'Усі'}</span>
              </button>

              <button
                onClick={onClearInbox}
                className="text-[12px] text-[#9B8FA3] hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                title="Очистити Inbox"
              >
                <Trash2 strokeWidth={1.5} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Compact Plan Day Action Button */}
        {inboxTasks.length > 0 && (
          <button
            onClick={handleBatchPlan}
            className="w-full py-2.5 px-4 rounded-[14px] bg-gradient-to-r from-[#E8729B] to-[#D4619A] hover:from-[#d65f88] hover:to-[#c24f88] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(232,114,155,0.2)] transition-all active:scale-[0.99]"
          >
            <CalendarPlus strokeWidth={1.5} className="w-4 h-4" />
            <span>
              {selectedIds.length > 0
                ? `Спланувати день (${selectedIds.length})`
                : `Спланувати день (${inboxTasks.length})`}
            </span>
          </button>
        )}
      </div>

      {/* Main Content */}
      {inboxTasks.length === 0 ? (
        <EmptyState
          emoji="🧠"
          title="Inbox порожній"
          description="Перейди на Capture і вивали всё з голови — AI розпарсить твої думки на чіткі задачі."
          actionText="Перейти до Capture"
          onAction={onNavigateToCapture}
        />
      ) : (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
          {inboxTasks.map((task) => {
            const isSelected = selectedIds.includes(task.id);
            return (
              <div key={task.id} className="relative flex items-center gap-2">
                <button
                  onClick={() => toggleSelect(task.id)}
                  className="p-1 text-[#C4B5CC] hover:text-[#E8729B] transition-colors shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare strokeWidth={1.5} className="w-4 h-4 text-[#E8729B]" />
                  ) : (
                    <Square strokeWidth={1.5} className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <TaskCard
                    task={task}
                    onDelete={onDeleteTask}
                    onEdit={onEditTask}
                    onMoveToToday={onMoveSingleToToday}
                    showCheckbox={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
