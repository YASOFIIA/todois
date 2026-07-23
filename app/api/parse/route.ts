import { NextResponse } from 'next/server';
import { Task, ParsedTaskAI } from '@/app/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userInput = body.text;
    const planFor: 'today' | 'tomorrow' = body.planFor || 'today';

    if (!userInput || typeof userInput !== 'string' || !userInput.trim()) {
      return NextResponse.json({ error: 'Текст порожній' }, { status: 400 });
    }

    const now = new Date();
    
    // Target date based on planFor
    const targetDate = new Date(now);
    if (planFor === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    // ISO format dates that Gemini understands perfectly
    const todayISO = now.toISOString().split('T')[0]; // "2026-07-21"
    const tomorrowISO = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const targetISO = targetDate.toISOString().split('T')[0];
    
    // Day of week in English (Gemini understands better)
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Calculate planning start time
    let planStartTime: string;
    if (planFor === 'tomorrow') {
      planStartTime = '09:00';
    } else {
      // Start from NOW + 15 minutes, rounded up to next 15 min
      let startMin = currentMinute + 15;
      let startHour = currentHour;
      
      // Round up to nearest 15
      startMin = Math.ceil(startMin / 15) * 15;
      
      while (startMin >= 60) {
        startHour++;
        startMin -= 60;
      }
      
      // If it's before 9 AM, start at 9
      if (startHour < 9) {
        startHour = 9;
        startMin = 0;
      }
      
      // If it's after 22, no more tasks today
      if (startHour >= 22) {
        startHour = 22;
        startMin = 0;
      }
      
      planStartTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    }

    const SYSTEM_PROMPT = `You are a day planner AI. Parse user's chaotic text into structured tasks.

CURRENT DATE AND TIME:
- Right now: ${todayISO} ${currentTimeStr} (${now.toLocaleDateString('en-US', { weekday: 'long' })})
- Today's date: ${todayISO}
- Tomorrow's date: ${tomorrowISO}
- Planning for: ${targetISO} (${dayOfWeek})

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
- estimatedMinutes: realistic duration in minutes.
  - Phone call, quick reply, paying bills, signing up: 15
  - Short errand (pharmacy, post office, picking up package): 30
  - Shopping, gym/workout: 60
  - Meeting, standup, sync, presentation: 60
  - Report writing, focused deep work: 90
  - Large project work, complex analysis, code review: 60-90
  
  Do NOT assume short durations for meetings or standups. Default meeting/standup to 60 minutes unless user specifies otherwise.
  When in doubt, use 30-60 minutes, NOT 15.

TIME HINT GUIDELINES:
For each task also return timeHint based on user intent:
- "early_morning" — if text says "з ранку", "з самого ранку", "першим ділом", "зранку", "рано" → schedule at 09:00
- "morning" — if text says "до обіду", "вранці" → schedule 09:00-12:00
- "midday" — if text says "в обід", "під час обіду" → schedule 12:00-13:00
- "afternoon" — if text says "після обіду", "після обідня" → schedule 13:00-17:00
- "evening" — if text says "ввечері", "увечері", "вечором" → schedule 18:00-20:00
- "before_sleep" — if text says "перед сном" → schedule 21:00
- "fixed" — if specific time is mentioned (о 10:00, в 14:30)
- "flexible" — no time preference mentioned

IMPORTANT: Respect the ORDER from user's text. If user says "спершу X, потім Y" — X gets earlier timeHint than Y. If user says "з ранку X, о 10:00 Y" — X is "early_morning" (09:00), Y is "fixed" (10:00). X MUST be before Y.

STRICT RULES FOR deadline:
- ALL dates must use year 2026 and month 07 (July) unless explicitly stated otherwise.
- "до вівторка" = next Tuesday from ${todayISO}, format: "${todayISO.substring(0, 8)}22T23:59:00"
- "до середи" = next Wednesday from ${todayISO}
- "завтра" = ${tomorrowISO}T23:59:00
- "до 25 числа" = ${todayISO.substring(0, 8)}25T23:59:00
- "о 15:00" = ${targetISO}T15:00:00
- If no date mentioned: null
- NEVER use months like May (05), March (03) etc. Current month is July (07).

Example input: "звіт для боса терміново, зум о 14:30, аптека, контракт до середи"
Example output:
[
  {"title": "Підготувати звіт для боса", "priority": "high", "estimatedMinutes": 90, "deadline": null, "tags": ["work"], "timeHint": "early_morning"},
  {"title": "Зум-зустріч", "priority": "high", "estimatedMinutes": 60, "deadline": "${targetISO}T14:30:00", "tags": ["work"], "timeHint": "fixed"},
  {"title": "Сходити в аптеку", "priority": "medium", "estimatedMinutes": 30, "deadline": null, "tags": ["health", "errands"], "timeHint": "evening"},
  {"title": "Перевірити контракт", "priority": "high", "estimatedMinutes": 60, "deadline": "${todayISO.substring(0, 8)}23T23:59:00", "tags": ["work"], "timeHint": "flexible"}
]`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using fallback heuristic parser.');
      const fallbackTasks = generateFallbackTasks(userInput, currentHour, currentMinute);
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
                temperature: 0.3,
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
      // Validate deadline — fix wrong months
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

    // Determine day start
    let dayStartMins: number;
    if (planFor === 'today') {
      dayStartMins = currentHour * 60 + currentMinute + 15;
      dayStartMins = Math.ceil(dayStartMins / 15) * 15;
      if (dayStartMins < 540) dayStartMins = 540;
    } else {
      dayStartMins = 540; // 09:00
    }

    // Step 1: Categorize tasks
    interface ScheduleItem {
      task: typeof tasks[0];
      preferredStart: number;  // preferred start in minutes
      isFixed: boolean;
    }

    const scheduleItems: ScheduleItem[] = tasks.map(task => {
      // Fixed time from deadline (like "зум о 14:30")
      if (task.deadline && task.deadline.includes('T')) {
        const timePart = task.deadline.split('T')[1];
        if (timePart && !timePart.startsWith('23:59')) {
          const [fh, fm] = timePart.substring(0, 5).split(':').map(Number);
          if (fh >= 0 && fh <= 23) {
            return { task, preferredStart: fh * 60 + fm, isFixed: true };
          }
        }
      }

      // Time hint from AI
      const hint = task.timeHint || 'flexible';
      if (hint in timeHintToMinutes) {
        const preferred = Math.max(timeHintToMinutes[hint], dayStartMins);
        return { task, preferredStart: preferred, isFixed: false };
      }

      // Flexible — no preference
      return { task, preferredStart: 9999, isFixed: false };
    });

    // Step 2: Sort by preferredStart (earliest first), fixed tasks keep their time
    scheduleItems.sort((a, b) => {
      if (a.isFixed && !b.isFixed) return -1;
      if (!a.isFixed && b.isFixed) return 1;
      if (a.preferredStart !== b.preferredStart) return a.preferredStart - b.preferredStart;
      // Same preference — higher priority first
      const po: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (po[a.task.priority] || 1) - (po[a.task.priority] || 1);
    });

    // Step 3: Place fixed tasks first, then fill flexible around them
    const occupied: { start: number; end: number }[] = [];

    // Place fixed tasks
    scheduleItems.filter(s => s.isFixed).forEach(s => {
      const start = s.preferredStart;
      s.task.scheduledTime = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
      occupied.push({ start, end: start + (s.task.estimatedMinutes || 30) });
    });

    // Sort occupied by start time
    occupied.sort((a, b) => a.start - b.start);

    // Place non-fixed tasks in available slots
    let cursor = dayStartMins;

    scheduleItems.filter(s => !s.isFixed).forEach(s => {
      const duration = s.task.estimatedMinutes || 30;
      
      // Try preferred start first
      let targetStart = Math.max(s.preferredStart === 9999 ? cursor : s.preferredStart, cursor);

      // Find slot that doesn't collide
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 50) {
        let collides = false;
        for (const slot of occupied) {
          if (targetStart < slot.end && (targetStart + duration) > slot.start) {
            targetStart = slot.end + 15; // jump past + break
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

// Strict fallback generator
function generateFallbackTasks(input: string, startH: number, startM: number): Task[] {
  const lines = input.split(/[\n,.;]+/).filter((line) => line.trim().length > 0);
  let h = Math.max(9, startH);
  let m = 0;

  return lines.map((line, idx) => {
    const text = line.trim();
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (text.toLowerCase().includes('терміново') || text.toLowerCase().includes('важливо') || text.toLowerCase().includes('горить')) {
      priority = 'high';
    } else if (text.toLowerCase().includes('потім') || text.toLowerCase().includes('не терміново')) {
      priority = 'low';
    }

    const duration = [15, 30, 45, 60][idx % 4];
    const validH = h % 24;
    const sched = `${String(validH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    m += duration + 15;
    while (m >= 60) {
      h = (h + 1) % 24;
      m -= 60;
    }

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
