export interface MacroData {
  p: number;
  c: number;
  f: number;
  sugar?: number;
  fiber?: number;
}

export interface Ingredient {
  foodId: string;
  weight: number;
}

export interface Food {
  id: string;
  name: string;
  baseWeight: number;
  baseKcal: number;
  baseMacros: MacroData;
  icon?: string;
  isRecipe?: boolean;
  ingredients?: Ingredient[];
}

export interface LoggedFood {
  id: string;
  name: string;
  quantity: string;
  kcal: number;
  icon?: string;
  macros: MacroData;
  date: string;
}

export interface Set {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface PerformedSet {
  weight: number;
  reps: number;
}

export interface PerformedExercise {
  exerciseId: string;
  sets: PerformedSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  planId: string;
  exercises: PerformedExercise[];
}

export interface ExerciseEntry {
  id: string;
  name: string;
  category: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  unit: string;
  notifyInterval: number; // in minutes
  notificationsActive: boolean;
}

export interface DailySteps {
  date: string;
  count: number;
}

export interface UserProfile {
  height: number;
  weight: number;
  age: number;
  goalWeight: number;
  goals: MacroData & { kcal: number };
}
