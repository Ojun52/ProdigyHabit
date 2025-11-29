// Specific data structure for a 'focus' log
export interface FocusData {
  duration: number;        // Concentrated time in minutes
  score: number;           // AI-generated score (0-100)
  title: string;           // Task title/content
  icon_emoji: string;      // An emoji representing the task
  key_results: string[];   // Key outcomes or results
  ai_feedback: string;     // AI-generated feedback
}

// Specific data structure for a 'life' log
export interface LifeData {
  sleep_hours: number;
  screen_time: number;     // Screen time in minutes
  mood: number;            // Mood score (1-5)
  ai_advice: string;       // AI-generated advice
}

// Base type for any activity log
interface BaseActivityLog {
  id: number;
  user_id: number;
  created_at: string; // ISO 8601 date string
}

// Discriminated union for Focus Log
interface FocusActivityLog extends BaseActivityLog {
  log_type: 'focus';
  data: FocusData;
}

// Discriminated union for Life Log
interface LifeActivityLog extends BaseActivityLog {
  log_type: 'life';
  data: LifeData;
}

// The complete type that can be either a focus or a life log
export type ActivityLog = FocusActivityLog | LifeActivityLog;
