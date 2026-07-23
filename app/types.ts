export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;              // uuid
  title: string;           // назва задачі
  priority: Priority;      // пріоритет
  estimatedMinutes: number; // орієнтовний час у хвилинах
  deadline?: string;        // дедлайн якщо є (ISO date string)
  tags?: string[];          // теги від AI (work, personal, health...)
  completed: boolean;       // виконана чи ні
  createdAt: string;        // дата створення
  source: 'inbox' | 'today'; // де зараз знаходиться
  scheduledTime?: string;    // "09:00", "14:30" — час початку задачі (HH:MM)
  planDate?: string;         // YYYY-MM-DD — дата на яку сплановано
  timeHint?: string;
}

export type TabType = 'capture' | 'inbox' | 'today';

export interface ParsedTaskAI {
  title: string;
  priority: Priority;
  estimatedMinutes: number;
  deadline?: string | null;
  tags?: string[];
  scheduledTime?: string | null;
  timeHint?: string;
}
