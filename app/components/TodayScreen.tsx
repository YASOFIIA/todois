'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/app/types';
import { TaskCard } from './TaskCard';
import { EmptyState } from './EmptyState';
import { Clock, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Coffee } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodayScreenProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onNavigateToCapture: () => void;
  onResetToday: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  tasks,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
  onNavigateToCapture,
  onResetToday,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<Date>(new Date());

  // Real-time minute tick for current time indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const todayISO = new Date().toISOString().split('T')[0];
  const tomorrowISO = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [viewDate, setViewDate] = useState<string>(todayISO);

  const todayTasks = tasks.filter((t) => {
    if (t.source !== 'today') return false;
    if (t.planDate) return t.planDate === viewDate;
    return viewDate === todayISO;
  });

  // Client-side validation of scheduledTime (regex ^([01]\d|2[0-3]):([0-5]\d)$)
  const validateAndFixTasks = (taskList: Task[]): Task[] => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return taskList.map((task) => {
      if (!task.scheduledTime || !timeRegex.test(task.scheduledTime)) {
        return { ...task, scheduledTime: undefined };
      }
      return task;
    });
  };

  const validatedTasks = validateAndFixTasks(todayTasks);

  // Formatted date string
  const displayDate = viewDate === tomorrowISO ? new Date(Date.now() + 86400000) : new Date();
  const dateFormatted = displayDate.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const currentTimeHHMM = `${String(nowTime.getHours()).padStart(2, '0')}:${String(
    nowTime.getMinutes()
  ).padStart(2, '0')}`;

  const allTags = Array.from(
    new Set(validatedTasks.flatMap((t) => t.tags || []))
  );

  const filteredTasks = validatedTasks.filter((t) => {
    if (selectedTag === 'all') return true;
    if (selectedTag === 'work') return t.tags?.includes('work');
    if (selectedTag === 'personal') return t.tags?.includes('personal') || t.tags?.includes('health');
    return t.tags?.includes(selectedTag);
  });

  const activeTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  // Strict sorting by scheduledTime localeCompare
  const sortedActiveTasks = [...activeTasks].sort((a, b) => {
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });

  const sortedCompletedTasks = [...completedTasks].sort((a, b) => {
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });

  // Totals & End Time Calculations
  const totalMinutes = todayTasks.reduce(
    (sum, t) => sum + (t.estimatedMinutes || 0),
    0
  );
  const completedCount = todayTasks.filter((t) => t.completed).length;

  const parseHHMM = (timeStr?: string): number => {
    if (!timeStr) return 9999;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const calculateEndTime = () => {
    if (todayTasks.length === 0) return '18:00';
    let maxMins = 9 * 60; // start at 09:00
    todayTasks.forEach((t) => {
      const startMins = parseHHMM(t.scheduledTime);
      const endMins = (startMins < 9999 ? startMins : maxMins) + (t.estimatedMinutes || 30);
      if (endMins > maxMins) maxMins = endMins;
    });
    const hh = String(Math.floor(maxMins / 60) % 24).padStart(2, '0');
    const mm = String(maxMins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const dayEndTime = calculateEndTime();

  const formatTotalTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} хв`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} год ${mins} хв` : `${hrs} год`;
  };

  const isAllCompleted =
    todayTasks.length > 0 && completedCount === todayTasks.length;

  useEffect(() => {
    if (isAllCompleted) {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E8729B', '#F2A3BF', '#F5B97A', '#A8D8B9'],
      });
    }
  }, [isAllCompleted]);

  const nowMins = nowTime.getHours() * 60 + nowTime.getMinutes();

  return (
    <div className="flex flex-col h-full">
      {/* Date & Timeline Header */}
      <div className="mb-4 flex flex-col gap-1 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#2D2235] tracking-tight">
            Today
          </h2>

          {todayTasks.length > 0 && (
            <button
              onClick={onResetToday}
              className="text-[12px] text-[#9B8FA3] hover:text-[#E8729B] flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF5F7] border border-[#F5E0E7] transition-colors"
              title="Перенести всі назад в Inbox"
            >
              <RotateCcw strokeWidth={1.5} className="w-3.5 h-3.5" />
              <span>В Inbox</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-[#9B8FA3]">
          <span className="capitalize">{dateFormatted}</span>
          <span className="font-semibold text-[#E8729B]">
            Задач на {formatTotalTime(totalMinutes)} • ◉ {completedCount}/{todayTasks.length}
          </span>
        </div>
      </div>

      {/* Day toggle — одразу під заголовком Today */}
      <div className="flex gap-2 shrink-0 mb-3">
        <button
          type="button"
          onClick={() => setViewDate(todayISO)}
          className={`flex-1 py-2.5 px-4 rounded-[12px] text-[13px] font-semibold transition-all ${
            viewDate === todayISO
              ? 'bg-[#E8729B] text-white shadow-sm'
              : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
          }`}
        >
          📅 Сьогодні
        </button>
        <button
          type="button"
          onClick={() => setViewDate(tomorrowISO)}
          className={`flex-1 py-2.5 px-4 rounded-[12px] text-[13px] font-semibold transition-all ${
            viewDate === tomorrowISO
              ? 'bg-[#E8729B] text-white shadow-sm'
              : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
          }`}
        >
          🌅 Завтра
        </button>
      </div>

      {/* Main Content */}
      {todayTasks.length === 0 ? (
        viewDate === tomorrowISO ? (
          <EmptyState
            emoji="🌅"
            title="Завтра ще не сплановано"
            description="Перейди в Capture, обери 'На завтра' і вивали свої думки"
            actionText="Перейти до Capture"
            onAction={onNavigateToCapture}
          />
        ) : (
          <EmptyState
            emoji="✨"
            title="День ще не спланований"
            description="Спершу додай думки в Capture — AI згенерує твій ідеальний графік на сьогодні."
            actionText="Додати думки в Capture"
            onAction={onNavigateToCapture}
          />
        )
      ) : (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Horizontal Filter Chips */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedTag('all')}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                  selectedTag === 'all'
                    ? 'bg-[#E8729B] text-white shadow-sm'
                    : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
                }`}
              >
                Всі ({todayTasks.length})
              </button>
              <button
                onClick={() => setSelectedTag('work')}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                  selectedTag === 'work'
                    ? 'bg-[#E8729B] text-white shadow-sm'
                    : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
                }`}
              >
                💼 Робота
              </button>
              <button
                onClick={() => setSelectedTag('personal')}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                  selectedTag === 'personal'
                    ? 'bg-[#E8729B] text-white shadow-sm'
                    : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
                }`}
              >
                🏡 Особисте
              </button>

              {allTags.map((tag) => {
                if (tag === 'work' || tag === 'personal') return null;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                      selectedTag === tag
                        ? 'bg-[#E8729B] text-white shadow-sm'
                        : 'bg-[#FFF5F7] text-[#9B8FA3] border border-[#F5E0E7] hover:bg-[#F5E0E7]'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Completed Celebration Banner */}
          {isAllCompleted && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#E8729B]/15 via-[#F2A3BF]/20 to-[#A8D8B9]/30 border border-[#E8729B]/30 text-[#2D2235] text-center shadow-sm shrink-0">
              <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-[#E8729B]">
                <Sparkles strokeWidth={1.5} className="w-4 h-4" />
                <span>Всі задачі виконано! Ти молодець! 🎉</span>
              </div>
            </div>
          )}

          {/* 8-Hour Realism Warning */}
          {totalMinutes > 480 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[12px] flex items-center gap-2 shrink-0">
              <AlertTriangle strokeWidth={1.5} className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                ⚠️ Задач на {formatTotalTime(totalMinutes)} — день переповнений (більше 8 год).
              </span>
            </div>
          )}

          {/* Timeline Calendar Container */}
          <div className="relative pl-12 pr-1 my-2">
            {/* Vertical Pink Translucent Line */}
            <div className="absolute left-[34px] top-0 bottom-0 w-[2px] bg-[#F2A3BF]/40 rounded-full" />

            {/* Current Time Real-Time Line */}
            {viewDate === todayISO && (
              <div className="relative my-3 flex items-center gap-2 z-10">
                <span className="text-[11px] font-bold text-[#E8729B] bg-[#FFF5F7] px-2 py-0.5 rounded-md border border-[#F2A3BF]/40 shadow-sm shrink-0 font-mono">
                  Зараз {currentTimeHHMM}
                </span>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-[#E8729B] to-transparent rounded-full shadow-sm" />
              </div>
            )}

            {/* Timeline Task Items */}
            <div className="flex flex-col gap-3">
              {sortedActiveTasks.map((task, idx) => {
                const taskStartMins = parseHHMM(task.scheduledTime);
                const isOverdue = (() => {
                  if (task.completed) return false;
                  if (!task.scheduledTime) return false;
                  
                  // Only overdue if task was created on a different day than today
                  const taskDate = new Date(task.createdAt).toDateString();
                  const todayDate = new Date().toDateString();
                  
                  if (taskDate === todayDate) return false; // Created today — never overdue
                  
                  // Created on another day and time has passed
                  return taskStartMins < nowMins;
                })();

                const nextTask = sortedActiveTasks[idx + 1];
                let breakMins = 0;
                if (nextTask && task.scheduledTime && nextTask.scheduledTime) {
                  const endThis = taskStartMins + (task.estimatedMinutes || 30);
                  const startNext = parseHHMM(nextTask.scheduledTime);
                  if (startNext > endThis) {
                    breakMins = startNext - endThis;
                  }
                }

                return (
                  <React.Fragment key={task.id}>
                    <div className="relative flex items-start gap-3">
                      {/* Left Time Label */}
                      <div className="absolute -left-12 top-4 w-9 text-right">
                        <span className="text-[12px] font-bold text-[#9B8FA3] font-mono">
                          {task.scheduledTime || '09:00'}
                        </span>
                      </div>

                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-[17px] top-5 w-3 h-3 rounded-full border-2 border-white bg-[#E8729B] shadow-sm z-10" />

                      {/* Task Card */}
                      <div
                        className={`flex-1 min-w-0 transition-all ${
                          isOverdue
                            ? 'ring-1 ring-amber-400/60 rounded-[16px]'
                            : ''
                        }`}
                      >
                        {isOverdue && (
                          <div className="mb-1 flex items-center">
                            <span className="text-[11px] text-amber-600 font-semibold ml-2">
                              ⏰ Прострочено
                            </span>
                          </div>
                        )}
                        <TaskCard
                          task={task}
                          onToggleComplete={onToggleComplete}
                          onDelete={onDeleteTask}
                          onEdit={onEditTask}
                          showCheckbox={true}
                        />
                      </div>
                    </div>

                    {/* Break indicator */}
                    {breakMins >= 5 && breakMins <= 30 && (
                      <div className="relative pl-2 py-1 flex items-center gap-2 text-[11px] text-[#9B8FA3]">
                        <div className="w-2 h-2 rounded-full bg-[#C4B5CC]/50" />
                        <span className="flex items-center gap-1 font-medium bg-[#FFF5F7] px-2 py-0.5 rounded-full border border-[#F5E0E7]">
                          <Coffee strokeWidth={1.5} className="w-3 h-3 text-[#E8729B]" />
                          {breakMins} хв перерва
                        </span>
                      </div>
                    )}

                    {/* Large gap — show as free time, not break */}
                    {breakMins > 30 && (
                      <div className="relative pl-2 py-1 flex items-center gap-2 text-[11px] text-[#9B8FA3]">
                        <div className="w-2 h-2 rounded-full bg-[#A8D8B9]/50" />
                        <span className="flex items-center gap-1 font-medium bg-[#f0faf4] px-2 py-0.5 rounded-full border border-[#d4edda]">
                          ✨ {Math.floor(breakMins / 60) > 0 ? `${Math.floor(breakMins / 60)} год ${breakMins % 60 > 0 ? `${breakMins % 60} хв` : ''}` : `${breakMins} хв`} вільного часу
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Timeline Footer End Time Banner */}
          <div className="p-3 rounded-xl bg-white border border-[#F5E0E7] text-center text-xs text-[#2D2235] shadow-sm font-semibold shrink-0">
            {totalMinutes > 480
              ? `⚠️ Задач на ${formatTotalTime(totalMinutes)} — день переповнений`
              : `✅ Вечір вільний з ${dayEndTime}! 🎉`}
          </div>

          {/* Completed Tasks History Accordion */}
          {sortedCompletedTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#F5E0E7] shrink-0">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full py-2 px-3 rounded-xl bg-[#FFF5F7] border border-[#F5E0E7] text-[12px] font-semibold text-[#9B8FA3] flex items-center justify-between hover:text-[#2D2235] transition-colors"
              >
                <span>Виконані задачі ({sortedCompletedTasks.length})</span>
                {showCompleted ? (
                  <ChevronUp strokeWidth={1.5} className="w-4 h-4" />
                ) : (
                  <ChevronDown strokeWidth={1.5} className="w-4 h-4" />
                )}
              </button>

              {showCompleted && (
                <div className="flex flex-col gap-3 mt-3 animate-in fade-in duration-200">
                  {sortedCompletedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={onToggleComplete}
                      onDelete={onDeleteTask}
                      onEdit={onEditTask}
                      showCheckbox={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
