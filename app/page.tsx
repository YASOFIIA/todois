'use client';

import React, { useState, useEffect } from 'react';
import { Task, TabType } from '@/app/types';
import { TabBar } from '@/app/components/TabBar';
import { CaptureScreen } from '@/app/components/CaptureScreen';
import { InboxScreen } from '@/app/components/InboxScreen';
import { TodayScreen } from '@/app/components/TodayScreen';
import { OnboardingModal } from '@/app/components/OnboardingModal';
import { TaskEditModal } from '@/app/components/TaskEditModal';

const STORAGE_KEY = 'planner-tasks';
const ONBOARDING_KEY = 'onboarding-done';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('capture');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDragOverToday, setIsDragOverToday] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Live Digital Clock for Desktop Header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Доброго ранку ☀️';
    if (hour >= 12 && hour < 18) return 'Добрий день 👋';
    if (hour >= 18 && hour < 23) return 'Добрий вечір 🌙';
    return 'Час відпочити 💤';
  };

  // Read from localStorage upon client mount
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEY);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }

      const onboardingDone = localStorage.getItem(ONBOARDING_KEY);
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.error('Failed to load initial storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on task state changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (e) {
        console.error('Failed to save tasks to localStorage:', e);
      }
    }
  }, [tasks, isLoaded]);

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.error('Failed to save onboarding status:', e);
    }
  };

  // Task Handlers
  const handleTasksParsed = (newTasks: Task[]) => {
    setTasks((prev) => [...newTasks, ...prev]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleSaveEditTask = (updatedTask: Task) => {
    setTasks((prev) => {
      // 1. Update the edited task
      const withUpdate = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      
      // 2. Recalculate scheduledTime for ALL tasks on the same planDate
      const planDate = updatedTask.planDate;
      if (!planDate || updatedTask.source !== 'today') return withUpdate;
      
      // Get tasks for this day, sorted by scheduledTime
      const dayTasks = withUpdate
        .filter(t => t.source === 'today' && t.planDate === planDate && !t.completed)
        .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
      
      if (dayTasks.length === 0) return withUpdate;

      // Separate fixed-time tasks (meetings with exact time) and flexible tasks
      const fixedTasks: Task[] = [];
      const flexTasks: Task[] = [];
      
      dayTasks.forEach(task => {
        const hasFixedTime = task.deadline 
          && task.deadline.includes('T') 
          && !task.deadline.split('T')[1]?.startsWith('23:59');
        
        if (hasFixedTime) {
          // Keep scheduled at deadline time
          const timePart = task.deadline!.split('T')[1].substring(0, 5);
          task.scheduledTime = timePart;
          fixedTasks.push(task);
        } else {
          flexTasks.push(task);
        }
      });

      // Build occupied time blocks from fixed tasks
      const occupied = fixedTasks.map(t => {
        const [h, m] = (t.scheduledTime || '09:00').split(':').map(Number);
        const start = h * 60 + m;
        return { start, end: start + (t.estimatedMinutes || 30) };
      });

      // Determine start time
      const todayISO = new Date().toISOString().split('T')[0];
      let slotMins: number;
      
      if (planDate === todayISO) {
        const now = new Date();
        slotMins = now.getHours() * 60 + now.getMinutes() + 15;
        slotMins = Math.ceil(slotMins / 15) * 15;
        if (slotMins < 540) slotMins = 540;
        
        // But don't move tasks that are already earlier and haven't been edited
        const earliestExisting = flexTasks[0]?.scheduledTime;
        if (earliestExisting) {
          const [eh, em] = earliestExisting.split(':').map(Number);
          const existingMins = eh * 60 + em;
          if (existingMins >= slotMins) {
            slotMins = existingMins; // keep from existing start
          }
        }
      } else {
        slotMins = 540; // 09:00 for tomorrow
      }

      // Reassign times to flexible tasks sequentially
      flexTasks.forEach(task => {
        const duration = task.estimatedMinutes || 30;

        // Skip occupied slots
        let collision = true;
        while (collision) {
          collision = false;
          for (const slot of occupied) {
            if (slotMins < slot.end && (slotMins + duration) > slot.start) {
              slotMins = slot.end + 15;
              collision = true;
              break;
            }
          }
        }

        const h = Math.floor(slotMins / 60);
        const m = slotMins % 60;
        task.scheduledTime = `${String(Math.min(h, 22)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        occupied.push({ start: slotMins, end: slotMins + duration });
        slotMins += duration + 15;
      });

      // Build map of recalculated tasks
      const recalcMap = new Map<string, Task>();
      [...fixedTasks, ...flexTasks].forEach(t => recalcMap.set(t.id, t));

      // Apply recalculated times back to full task list
      return withUpdate.map(t => recalcMap.get(t.id) || t);
    });
    
    setEditingTask(null);
  };

  const handlePlanDay = (selectedIds?: string[]) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.source === 'inbox') {
          if (!selectedIds || selectedIds.includes(t.id)) {
            return { ...t, source: 'today' };
          }
        }
        return t;
      })
    );
    setActiveTab('today');
  };

  const handleMoveSingleToToday = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, source: 'today' } : t))
    );
  };

  const handleClearInbox = () => {
    setTasks((prev) => prev.filter((t) => t.source !== 'inbox'));
  };

  const handleResetToday = () => {
    setTasks((prev) =>
      prev.map((t) => (t.source === 'today' ? { ...t, source: 'inbox' } : t))
    );
    setActiveTab('inbox');
  };

  // Drag & Drop Handlers for Desktop
  const handleDropOnToday = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverToday(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      handleMoveSingleToToday(taskId);
    }
  };

  const inboxCount = tasks.filter((t) => t.source === 'inbox').length;
  const todayCount = tasks.filter((t) => t.source === 'today' && !t.completed).length;

  return (
    <main className="min-h-screen bg-[#FFF5F7] text-[#2D2235] selection:bg-[#F2A3BF] selection:text-white font-sans antialiased">
      {/* Onboarding Modal Overlay */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleCompleteOnboarding} />
      )}

      {/* Task Edit Modal Overlay */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={handleSaveEditTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* ========================================================= */}
      {/* DESKTOP LAYOUT (Width >= 768px - Strict CSS Grid 320px 380px 1fr) */}
      {/* ========================================================= */}
      <div className="hidden md:flex flex-col h-screen overflow-hidden">
        {/* Desktop Top Header (Fixed 72px) */}
        <header className="h-[72px] w-full bg-white border-b border-[#F5E0E7] px-6 flex items-center justify-between shadow-[0_2px_10px_rgba(199,146,164,0.06)] shrink-0">
          <h1 className="text-xl font-bold text-[#2D2235] tracking-tight">
            AI Day Planner
          </h1>

          <div className="flex items-center gap-2 text-sm font-medium text-[#2D2235]">
            <span className="text-[#E8729B] font-semibold">{getGreeting()}</span>
            {currentTimeStr && (
              <>
                <span className="text-[#9B8FA3]">•</span>
                <span className="font-mono text-[#2D2235]">{currentTimeStr}</span>
              </>
            )}
          </div>
        </header>

        {/* Desktop 3 Columns CSS Grid */}
        <div className="grid grid-cols-[320px_380px_1fr] gap-6 p-6 h-[calc(100vh-72px)] overflow-hidden max-w-[1600px] mx-auto w-full">
          
          {/* Column 1: Capture (Fixed 320px) */}
          <section className="bg-white border border-[#F5E0E7] rounded-[20px] p-5 shadow-[0_2px_12px_rgba(199,146,164,0.06)] overflow-y-auto max-h-full">
            <CaptureScreen
              onTasksParsed={handleTasksParsed}
              onNavigateToInbox={() => {}}
            />
          </section>

          {/* Column 2: Inbox (Fixed 380px) */}
          <section className="bg-white border border-[#F5E0E7] rounded-[20px] p-5 shadow-[0_2px_12px_rgba(199,146,164,0.06)] overflow-y-auto max-h-full">
            <InboxScreen
              tasks={tasks}
              onDeleteTask={handleDeleteTask}
              onEditTask={(task) => setEditingTask(task)}
              onPlanDay={handlePlanDay}
              onNavigateToCapture={() => {}}
              onClearInbox={handleClearInbox}
              onMoveSingleToToday={handleMoveSingleToToday}
            />
          </section>

          {/* Column 3: Today (1fr - Remaining space) */}
          <section
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverToday(true);
            }}
            onDragLeave={() => setIsDragOverToday(false)}
            onDrop={handleDropOnToday}
            className={`bg-white border rounded-[20px] p-5 shadow-[0_2px_12px_rgba(199,146,164,0.06)] overflow-y-auto max-h-full transition-all duration-300 ${
              isDragOverToday
                ? 'border-[#E8729B] bg-[#FFF5F7]/70 ring-4 ring-[#F2A3BF]/30'
                : 'border-[#F5E0E7]'
            }`}
          >
            {isDragOverToday && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#E8729B] text-white text-center font-semibold text-xs animate-pulse">
                ✨ Відпустіть мишку, щоб перенести задачу в Today!
              </div>
            )}

            <TodayScreen
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onDeleteTask={handleDeleteTask}
              onEditTask={(task) => setEditingTask(task)}
              onNavigateToCapture={() => {}}
              onResetToday={handleResetToday}
            />
          </section>

        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE LAYOUT (Width < 768px - Single Tabbed View) */}
      {/* ========================================================= */}
      <div className="block md:hidden max-w-md mx-auto relative min-h-screen flex flex-col pt-3">
        {activeTab === 'capture' && (
          <CaptureScreen
            onTasksParsed={handleTasksParsed}
            onNavigateToInbox={() => setActiveTab('inbox')}
          />
        )}

        {activeTab === 'inbox' && (
          <InboxScreen
            tasks={tasks}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
            onPlanDay={handlePlanDay}
            onNavigateToCapture={() => setActiveTab('capture')}
            onClearInbox={handleClearInbox}
            onMoveSingleToToday={handleMoveSingleToToday}
          />
        )}

        {activeTab === 'today' && (
          <TodayScreen
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
            onNavigateToCapture={() => setActiveTab('capture')}
            onResetToday={handleResetToday}
          />
        )}

        {/* Fixed Bottom Navigation TabBar (Mobile Only) */}
        <TabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          inboxCount={inboxCount}
          todayCount={todayCount}
        />
      </div>
    </main>
  );
}
