import { NextResponse } from 'next/server';
import { Task, ParsedTaskAI } from '@/app/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userInput = body.text;
    const planFor: 'today' | 'tomorrow' = body.planFor || 'today';

    // Use CLIENT's local time (browser sends it), not server UTC
    const clientHour: number = typeof body.clientHour === 'number' ? body.clientHour : new Date().getHours();
    const clientMinute: number = typeof body.clientMinute === 'number' ? body.clientMinute : new Date().getMinutes();
    const clientDateStr: string = body.clientDate || new Date().toISOString().split('T')[0]; // "2026-07-23"

    if (!userInput || typeof userInput !== 'string' || !userInput.trim()) {
      return NextResponse.json({ error: 'Текст порожній' }, { status: 400 });
    }

    // Use client's local date for all date calculations
    const todayISO = clientDateStr; // e.g. "2026-07-23"
    const todayParts = todayISO.split('-').map(Number);
    const tomorrowDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2] + 1);
    const tomorrowISO = tomorrowDate.toISOString().split('T')[0];
    
    const targetISO = planFor === 'tomorrow' ? tomorrowISO : todayISO;
    const targetJSDate = planFor === 'tomorrow' ? tomorrowDate : new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    
    // Day of week
    const dayOfWeek = targetJSDate.toLocaleDateString('en-US', { weekday: 'long' });
    const todayDayOfWeek = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]).toLocaleDateString('en-US', { weekday: 'long' });
    const currentHour = clientHour;
    const currentMinute = clientMinute;
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Calculate planning start time in minutes from midnight
    let dayStartMins: number;
    if (planFor === 'today') {
      let startMins = currentHour * 60 + currentMinute + 15;
      dayStartMins = Math.ceil(startMins / 15) * 15;
      if (dayStartMins < 540) dayStartMins = 540; // 09:00 AM minimum
    } else {
      dayStartMins = 540; // 09:00 AM
    }

    const planStartHour = Math.floor(dayStartMins / 60);
    const planStartMin = dayStartMins % 60;
    const planStartTimeStr = `${String(planStartHour).padStart(2, '0')}:${String(planStartMin).padStart(2, '0')}`;

    const SYSTEM_PROMPT = `You are an expert day planner AI. Parse user's text into structured tasks.

CURRENT LOCAL TIME AND DATE:
- Right now local time: ${currentTimeStr} (${todayISO}, ${todayDayOfWeek})
- Today's date: ${todayISO}
- Tomorrow's date: ${tomorrowISO}
- Planning target day: ${planFor.toUpperCase()} (${targetISO}, ${dayOfWeek})
- EARLIEST ALLOWED START TIME FOR TASKS TODAY: ${planStartTimeStr}

CRITICAL RULES FOR TIME PLANNING:
1. Current time right now is ${currentTimeStr}.
2. When planning for TODAY (${todayISO}), the morning/early hours may HAVE ALREADY PASSED!
   - NEVER suggest 'early_morning' (09:00) or 'morning' (10:00) if current time (${currentTimeStr}) is past 12:00!
   - If current time is ${currentTimeStr}, use 'afternoon', 'evening', 'before_sleep', or 'flexible' so all tasks start AT OR AFTER ${planStartTimeStr}!
3. If user mentions a specific fixed time today that is already in the past (e.g. user says "дзвінок о 11:30" but now it's ${currentTimeStr}), set deadline to null and timeHint to 'afternoon' or 'flexible' so it gets scheduled NOW (${planStartTimeStr}), NOT in the past!

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no explanation.

For each task return:
{
  "title": "short clear name, max 60 chars, in Ukrainian",
  "priority": "high" | "medium" | "low",
  "estimatedMinutes": 15 | 30 | 45 | 60 | 90 | 120,
  "deadline": "ISO datetime string or null",
  "tags": ["work", "personal", "health", "finance", "errands", "learning"],
  "timeHint": "early_morning" | "morning" | "midday" | "afternoon" | "evening" | "before_sleep" | "fixed" | "flexible"
}

ESTIMATED MINUTES GUIDELINES:
- Realistic duration: Phone call (15), Short errand (30), Meeting/Standup (60), Deep work/Report (90).
- Default meeting/standup to 60 minutes unless user specifies otherwise.

STRICT RULES FOR deadline:
- ALL dates must use year 2026 and month 07 (July) unless explicitly stated otherwise.
- "до вівторка" = next Tuesday from ${todayISO}
- "завтра" = ${tomorrowISO}T23:59:00
- "о 15:00" = ${targetISO}T15:00:00

Example input (when current time is ${currentTimeStr}, planning for today): "звіт для боса терміново, зум о 15:30, аптека, контракт до середи"
Example output:
[
  {"title": "Підготувати звіт для боса", "priority": "high", "estimatedMinutes": 60, "deadline": null, "tags": ["work"], "timeHint": "afternoon"},
  {"title": "Зум-зустріч", "priority": "high", "estimatedMinutes": 60, "deadline": "${targetISO}T15:30:00", "tags": ["work"], "timeHint": "fixed"},
  {"title": "Сходити в аптеку", "priority": "medium", "estimatedMinutes": 30, "deadline": null, "tags": ["health", "errands"], "timeHint": "evening"},
  {"title": "Перевірити контракт", "priority": "high", "estimatedMinutes": 60, "deadline": "${todayISO.substring(0, 8)}23T23:59:00", "tags": ["work"], "timeHint": "flexible"}
]`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using fallback heuristic parser.');
      const fallbackTasks = generateFallbackTasks(userInput, dayStartMins);
      return NextResponse.json({ tasks: fallbackTasks });
    }

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];
    let lastError = '';
    let responseText = '';
    let success = false;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${SYSTEM_PROMPT}\n\nТекст користувача:\n${userInput.trim()}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
          success = true;
          break;
        } else {
          const errBody = await res.text();
          console.warn(`Gemini model ${model} failed (${res.status}):`, errBody);
          lastError = `Помилка Gemini API (${res.status})`;
        }
      } catch (err: any) {
        console.warn(`Fetch error for model ${model}:`, err);
        lastError = err?.message || 'Помилка мережі';
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: lastError || 'Не вдалося отримати відповідь від Gemini API' },
        { status: 502 }
      );
    }

    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedList: ParsedTaskAI[] = [];
    try {
      parsedList = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON output:', cleanedText, e);
      return NextResponse.json(
        { error: 'AI повернув невалідний формат JSON. Спробуйте ще раз.' },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsedList)) {
      return NextResponse.json(
        { error: 'Очікувався масив задач від AI' },
        { status: 422 }
      );
    }

    const tasks: Task[] = parsedList.map((item, index) => {
      let deadline = item.deadline || undefined;
      if (deadline && typeof deadline === 'string') {
        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate.getTime())) {
          deadline = undefined;
        } else {
          const todayStart = new Date(todayISO);
          if (deadlineDate < todayStart) {
            const day = deadlineDate.getDate();
            deadline = `${todayISO.substring(0, 8)}${String(day).padStart(2, '0')}T23:59:00`;
          }
        }
      }

      return {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
        title: item.title?.trim() || 'Без назви',
        priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
        estimatedMinutes: Number(item.estimatedMinutes) || 30,
        deadline,
        tags: Array.isArray(item.tags) ? item.tags : [],
        completed: false,
        createdAt: new Date().toISOString(),
        source: 'inbox',
        planDate: targetISO,
        timeHint: item.timeHint || 'flexible',
      };
    });

    // ========== SCHEDULING ALGORITHM ==========
    const timeHintToMinutes: Record<string, number> = {
      'early_morning': 540,  // 09:00
      'morning': 600,        // 10:00
      'midday': 720,         // 12:00
      'afternoon': 810,      // 13:30
      'evening': 1080,       // 18:00
      'before_sleep': 1260,  // 21:00
    };

    interface ScheduleItem {
      task: typeof tasks[0];
      preferredStart: number;
      isFixed: boolean;
    }

    const scheduleItems: ScheduleItem[] = tasks.map(task => {
      // Fixed time from deadline (like "зум о 15:30")
      if (task.deadline && task.deadline.includes('T')) {
        const timePart = task.deadline.split('T')[1];
        if (timePart && !timePart.startsWith('23:59')) {
          const [fh, fm] = timePart.substring(0, 5).split(':').map(Number);
          if (fh >= 0 && fh <= 23) {
            let start = fh * 60 + fm;
            // ENFORCE: If planning for TODAY, fixed start time cannot be in the PAST!
            if (planFor === 'today' && start < dayStartMins) {
              start = dayStartMins;
            }
            return { task, preferredStart: start, isFixed: true };
          }
        }
      }

      // Time hint from AI
      const hint = task.timeHint || 'flexible';
      if (hint in timeHintToMinutes) {
        const preferred = Math.max(timeHintToMinutes[hint], dayStartMins);
        return { task, preferredStart: preferred, isFixed: false };
      }

      // Flexible — start from dayStartMins
      return { task, preferredStart: dayStartMins, isFixed: false };
    });

    // Sort schedule items by preferred start time
    scheduleItems.sort((a, b) => {
      if (a.isFixed && !b.isFixed) return -1;
      if (!a.isFixed && b.isFixed) return 1;
      if (a.preferredStart !== b.preferredStart) return a.preferredStart - b.preferredStart;
      const po: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (po[a.task.priority] || 1) - (po[b.task.priority] || 1);
    });

    // Place fixed tasks first, then fill non-fixed tasks around them
    const occupied: { start: number; end: number }[] = [];

    scheduleItems.filter(s => s.isFixed).forEach(s => {
      const start = s.preferredStart;
      s.task.scheduledTime = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
      occupied.push({ start, end: start + (s.task.estimatedMinutes || 30) });
    });

    occupied.sort((a, b) => a.start - b.start);

    let cursor = dayStartMins;

    scheduleItems.filter(s => !s.isFixed).forEach(s => {
      const duration = s.task.estimatedMinutes || 30;
      let targetStart = Math.max(s.preferredStart, cursor);

      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 50) {
        let collides = false;
        for (const slot of occupied) {
          if (targetStart < slot.end && (targetStart + duration) > slot.start) {
            targetStart = slot.end + 15; // jump past + 15m break
            collides = true;
            break;
          }
        }
        if (!collides) placed = true;
        attempts++;
      }

      const h = Math.min(Math.floor(targetStart / 60), 22);
      const m = targetStart % 60;
      s.task.scheduledTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      occupied.push({ start: targetStart, end: targetStart + duration });
      occupied.sort((a, b) => a.start - b.start);
      
      cursor = targetStart + duration + 15;
    });

    // Final sort tasks by scheduledTime
    tasks.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('API /api/parse Route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Непередбачена помилка сервера' },
      { status: 500 }
    );
  }
}

// Fallback generator respecting current time
function generateFallbackTasks(input: string, dayStartMins: number): Task[] {
  const lines = input.split(/[\n,.;]+/).filter((line) => line.trim().length > 0);
  let currentStart = dayStartMins;

  return lines.map((line, idx) => {
    const text = line.trim();
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (text.toLowerCase().includes('терміново') || text.toLowerCase().includes('важливо') || text.toLowerCase().includes('горить')) {
      priority = 'high';
    } else if (text.toLowerCase().includes('потім') || text.toLowerCase().includes('не терміново')) {
      priority = 'low';
    }

    const duration = [15, 30, 45, 60][idx % 4];
    const h = Math.min(Math.floor(currentStart / 60), 22);
    const m = currentStart % 60;
    const sched = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    currentStart += duration + 15;

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${idx}`,
      title: text.length > 60 ? text.substring(0, 57) + '...' : text,
      priority,
      estimatedMinutes: duration,
      completed: false,
      createdAt: new Date().toISOString(),
      source: 'inbox',
      tags: ['ai-task'],
      scheduledTime: sched,
    };
  });
}
