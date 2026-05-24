import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Utensils, 
  LayoutDashboard, 
  Utensils as ForkIcon,
  Activity,
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  TrendingUp,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { cn } from './lib/utils';
import { Habit, Food, LoggedFood, WorkoutSession, UserProfile, WorkoutPlan, ExerciseEntry, DailySteps } from './types';
import { auth, db } from './lib/firebase';
import { 
  doc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AuthButton } from './components/AuthButton';
import { handleFirestoreError, OperationType } from './lib/firestore';

// Sub-components
import WorkoutView from './components/WorkoutView';
import NutritionView from './components/NutritionView';
import DashboardView from './components/DashboardView';
import FoodDatabaseView from './components/FoodDatabaseView';
import ProfileView from './components/ProfileView';
import DatabaseView from './components/DatabaseView';
import { AuthModal } from './components/AuthModal';

type Tab = 'workouts' | 'nutrition' | 'dashboard' | 'database' | 'profile';

const INITIAL_PROFILE: UserProfile = {
  height: 175,
  weight: 75,
  age: 25,
  goalWeight: 70,
  goals: { kcal: 2000, p: 150, c: 200, f: 60, sugar: 50, fiber: 30 }
};

const INITIAL_FOOD_DATABASE: Food[] = [];

const INITIAL_EXERCISES: ExerciseEntry[] = [];

const INITIAL_PLANS: WorkoutPlan[] = [];

export default function App() {
  const [user, loadingAuth] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Global State
  const [foodDatabase, setFoodDatabase] = useState<Food[]>(INITIAL_FOOD_DATABASE);
  const [loggedFoods, setLoggedFoods] = useState<LoggedFood[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>(INITIAL_PLANS);
  const [exerciseTemplates, setExerciseTemplates] = useState<ExerciseEntry[]>(INITIAL_EXERCISES);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [dailySteps, setDailySteps] = useState<DailySteps[]>([]);
  const [selectedNutritionDate, setSelectedNutritionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Firebase Synchronization
  useEffect(() => {
    if (!user) return;

    // Sync from Firestore
    const uid = user.uid;

    const unsubProfile = onSnapshot(doc(db, 'users', uid), (s) => {
      if (s.exists()) setUserProfile(s.data() as UserProfile);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`));

    const unsubFoodDb = onSnapshot(collection(db, 'users', uid, 'food_database'), (s) => {
      setFoodDatabase(s.docs.map(d => ({ ...d.data(), id: d.id } as Food)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/food_database`));

    const unsubLogged = onSnapshot(collection(db, 'users', uid, 'food_logs'), (s) => {
      setLoggedFoods(s.docs.map(d => ({ ...d.data(), id: d.id } as LoggedFood)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/food_logs`));

    const unsubWorkouts = onSnapshot(query(collection(db, 'users', uid, 'workouts'), orderBy('date', 'desc')), (s) => {
      setWorkoutSessions(s.docs.map(d => ({ ...d.data(), id: d.id } as WorkoutSession)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/workouts`));

    const unsubPlans = onSnapshot(collection(db, 'users', uid, 'plans'), (s) => {
      setWorkoutPlans(s.docs.map(d => ({ ...d.data(), id: d.id } as WorkoutPlan)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/plans`));

    const unsubTemplates = onSnapshot(collection(db, 'users', uid, 'exercise_templates'), (s) => {
      setExerciseTemplates(s.docs.map(d => ({ ...d.data(), id: d.id } as ExerciseEntry)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/exercise_templates`));

    const unsubSteps = onSnapshot(collection(db, 'users', uid, 'steps'), (s) => {
      setDailySteps(s.docs.map(d => d.data() as DailySteps));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/steps`));

    return () => {
      unsubProfile();
      unsubFoodDb();
      unsubLogged();
      unsubWorkouts();
      unsubPlans();
      unsubTemplates();
      unsubSteps();
    };
  }, [user]);

  const [headerAction, setHeaderAction] = useState<React.ReactNode>(null);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center font-mono text-[#3B82F6] gap-4">
        <Loader2 className="animate-spin text-[#3B82F6]" size={32} />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Initializing Secure Vault...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-8 text-center overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#3B82F6]/5 blur-[120px] rounded-full -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="size-24 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-3xl flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(59,130,246,0.15)] group hover:scale-105 transition-all">
            <Activity size={48} className="text-[#3B82F6]" />
          </div>
          
          <h1 className="text-4xl font-black font-mono tracking-tighter text-white mb-6 select-none">
            EASY <span className="text-[#3B82F6] drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">TRACKING APP</span>
          </h1>
          
          <div className="h-px w-12 bg-[#2A2A2E] mb-6" />
          
          <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-[0.25em] mb-12 max-w-[300px] leading-relaxed">
            TRACK WORKOUT, NUTRITION AND STEPS EASILY.
          </p>
          
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full max-w-[260px] py-4 bg-[#3B82F6] text-white font-mono font-bold uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.25)] hover:bg-[#3B82F6]/90 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/10"
          >
            <LogIn size={20} /> ENTER SESSION
          </button>
          
          <p className="mt-8 text-[8px] font-mono text-[#4A4A4E] uppercase tracking-widest">
            SECURE CLOUD END-TO-END ACTIVE
          </p>
        </motion.div>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  const activeTabLabel = {
    dashboard: 'DAILY OVERVIEW',
    workouts: 'WORKOUT SESSIONS',
    nutrition: 'NUTRITION TRACKER',
    database: 'SYSTEM DATABASE',
    profile: 'MY PROFILE'
  }[activeTab];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans selection:bg-[#3B82F6]/30 pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/80 backdrop-blur-md border-b border-[#2A2A2E] px-6 py-4 flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tighter text-white font-mono uppercase">
            {activeTabLabel}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {headerAction}
          <AuthButton onOpenLogin={() => setIsAuthModalOpen(true)} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-6">
        <div key={activeTab}>
          {activeTab === 'workouts' && (
            <WorkoutView 
              workoutSessions={workoutSessions}
              setWorkoutSessions={setWorkoutSessions}
              workoutPlans={workoutPlans}
              exerciseTemplates={exerciseTemplates}
              setHeaderAction={setHeaderAction}
              dailySteps={dailySteps}
              setDailySteps={setDailySteps}
            />
          )}
          {activeTab === 'nutrition' && (
            <NutritionView 
              foodDatabase={foodDatabase} 
              loggedFoods={loggedFoods}
              setLoggedFoods={setLoggedFoods}
              selectedDate={selectedNutritionDate}
              setSelectedDate={setSelectedNutritionDate}
              userProfile={userProfile}
              setHeaderAction={setHeaderAction}
            />
          )}
          {activeTab === 'database' && (
            <DatabaseView 
              foodDatabase={foodDatabase} 
              setFoodDatabase={setFoodDatabase} 
              workoutPlans={workoutPlans}
              setWorkoutPlans={setWorkoutPlans}
              exerciseTemplates={exerciseTemplates}
              setExerciseTemplates={setExerciseTemplates}
              setHeaderAction={setHeaderAction}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileView 
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              setHeaderAction={setHeaderAction}
            />
          )}
          {activeTab === 'dashboard' && (
            <DashboardView 
              loggedFoods={loggedFoods}
              userProfile={userProfile}
              workoutSessions={workoutSessions}
              workoutPlans={workoutPlans}
              exerciseTemplates={exerciseTemplates}
              dailySteps={dailySteps}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0B] border-t border-[#2A2A2E] flex justify-center pb-safe">
        <div className="flex justify-center items-center h-20 gap-[-6px]">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={18} />} 
            label="TRACKING"
          />
          <NavButton 
            active={activeTab === 'workouts'} 
            onClick={() => setActiveTab('workouts')} 
            icon={<Dumbbell size={18} />} 
            label="WORKOUT"
          />
          <NavButton 
            active={activeTab === 'nutrition'} 
            onClick={() => setActiveTab('nutrition')} 
            icon={<Utensils size={18} />} 
            label="NUTRITION"
          />
          <NavButton 
            active={activeTab === 'database'} 
            onClick={() => setActiveTab('database')} 
            icon={<ForkIcon size={18} />} 
            label="DATABASE"
          />
          <NavButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={<Activity size={18} />} 
            label="MY INFO"
          />
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 min-w-[64px] transition-all duration-300",
        active ? "text-[#3B82F6]" : "text-[#8E9299] hover:text-white"
      )}
    >
      <div className={cn(
        "size-10 rounded-lg flex items-center justify-center transition-all duration-300 border",
        active ? "bg-[#3B82F6]/20 border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-transparent border-transparent"
      )}>
        {icon}
      </div>
      <span className="text-[8px] font-mono font-bold tracking-[0.2em]">{label}</span>
      {active && (
        <div className="w-1 h-1 rounded-full bg-[#3B82F6] mt-0.5" />
      )}
    </button>
  );
}
