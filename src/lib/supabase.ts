import { createClient } from '@supabase/supabase-js';

// These will be filled by the user in the Secrets panel
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Mocking Supabase for the demo if keys are missing
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock storage for demoing without Supabase
export const mockDb = {
  workouts: [
    { id: '1', date: '2024-03-20', exercises: [{ name: 'Squat', weight: 100, reps: 5, sets: 3 }] },
  ],
  nutrition: [
    { id: '1', date: '2024-03-20', protein: 150, carbs: 200, fat: 70 },
  ],
  habits: [
    { id: '1', name: 'Drink Water', target: 8, current: 5 },
    { id: '2', name: 'Morning Squats', target: 20, current: 0 },
  ]
};
