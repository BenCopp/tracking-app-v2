import React, { useState, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  startOfToday,
  parseISO
} from 'date-fns';
import { Plus, Trash2, CheckCircle2, ChevronRight, Play, Settings2, History, Dumbbell, X, Save, Edit2, Activity, Calendar, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { WorkoutSession, WorkoutPlan, ExerciseEntry, PerformedExercise, PerformedSet, DailySteps } from '../types';
import { syncDoc, deleteDocument, addDocument, updateDocument } from '../lib/firestore';
import { auth } from '../lib/firebase';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalIsoTimestamp = (sessionDt: string, d = new Date()) => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${sessionDt}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

interface WorkoutViewProps {
  workoutSessions: WorkoutSession[];
  setWorkoutSessions: React.Dispatch<React.SetStateAction<WorkoutSession[]>>;
  workoutPlans: WorkoutPlan[];
  exerciseTemplates: ExerciseEntry[];
  setHeaderAction: (node: React.ReactNode) => void;
  dailySteps: DailySteps[];
  setDailySteps: React.Dispatch<React.SetStateAction<DailySteps[]>>;
}

type Mode = 'selection' | 'logging';

export default function WorkoutView({ 
  workoutSessions, 
  setWorkoutSessions, 
  workoutPlans, 
  exerciseTemplates,
  setHeaderAction,
  dailySteps,
  setDailySteps
}: WorkoutViewProps) {
  const [mode, setMode] = useState<Mode>('selection');

  React.useEffect(() => {
    if (mode === 'logging') {
      setHeaderAction(
        <button 
          onClick={() => {
            setMode('selection');
            setActivePlan(null);
            setEditingSessionId(null);
            setSessionDate(getLocalDateString());
          }}
          className="p-2 bg-[#151619] border border-[#2A2A2E] rounded text-[#8E9299] hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      );
    } else {
      setHeaderAction(null);
    }
    return () => setHeaderAction(null);
  }, [mode, setHeaderAction]);

  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [sessionProgress, setSessionProgress] = useState<PerformedExercise[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Get best from last session
  const getBestForExercise = (exerciseId: string) => {
    const relevantSessions = workoutSessions.filter(s => 
      s.exercises.some(e => e.exerciseId === exerciseId)
    );
    if (relevantSessions.length === 0) return null;
    let bestSet: PerformedSet | null = null;
    let maxWeight = -1;
    relevantSessions.forEach(s => {
      const ex = s.exercises.find(e => e.exerciseId === exerciseId);
      ex?.sets.forEach(set => {
        if (set.weight > maxWeight) {
          maxWeight = set.weight;
          bestSet = set;
        } else if (set.weight === maxWeight && (bestSet ? set.reps > bestSet.reps : true)) {
          bestSet = set;
        }
      });
    });
    return bestSet;
  };

  const startSession = (plan: WorkoutPlan) => {
    setActivePlan(plan);
    const initialProgress: PerformedExercise[] = plan.exerciseIds.map(eId => ({
      exerciseId: eId,
      sets: [{ weight: 0, reps: 0 }]
    }));
    setSessionProgress(initialProgress);
    setShowDeleteConfirm(false);
    setMode('logging');
  };

  const editSession = (session: WorkoutSession) => {
    const plan = workoutPlans.find(p => p.id === session.planId);
    if (!plan) return;

    setActivePlan(plan);
    setSessionProgress(session.exercises);
    setSessionDate(format(parseISO(session.date), 'yyyy-MM-dd'));
    setEditingSessionId(session.id);
    setShowDeleteConfirm(false);
    setMode('logging');
  };

  const [selectedStepDate, setSelectedStepDate] = useState(() => getLocalDateString());
  const [sessionDate, setSessionDate] = useState(() => getLocalDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSessionDatePicker, setShowSessionDatePicker] = useState(false);
  const [showHistoryCalendar, setShowHistoryCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [stepInput, setStepInput] = useState<string>('');

  React.useEffect(() => {
    const existing = dailySteps.find(s => s.date === selectedStepDate);
    setStepInput(existing ? String(existing.count) : '');
  }, [selectedStepDate, dailySteps]);

  const handleStepCommit = () => {
    const val = parseInt(stepInput) || 0;
    if (auth.currentUser) {
      syncDoc('steps', selectedStepDate, { date: selectedStepDate, count: val });
    } else {
      setDailySteps(prev => {
        const filtered = prev.filter(s => s.date !== selectedStepDate);
        return [...filtered, { date: selectedStepDate, count: val }];
      });
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const commitSession = () => {
    if (!activePlan) return;
    
    const now = new Date();
    const timestamp = getLocalIsoTimestamp(sessionDate, now);

    if (editingSessionId) {
      if (auth.currentUser) {
        updateDocument('workouts', editingSessionId, { 
          date: timestamp, 
          exercises: sessionProgress 
        });
      } else {
        setWorkoutSessions(prev => prev.map(s => 
          s.id === editingSessionId 
            ? { ...s, date: timestamp, exercises: sessionProgress }
            : s
        ));
      }
    } else {
      const newSessionData = {
        date: timestamp,
        planId: activePlan.id,
        exercises: sessionProgress
      };
      
      if (auth.currentUser) {
        addDocument('workouts', newSessionData);
      } else {
        const newSession: WorkoutSession = {
          id: Math.random().toString(36).substr(2, 9),
          ...newSessionData
        };
        setWorkoutSessions([newSession, ...workoutSessions]);
      }
    }

    setMode('selection');
    setActivePlan(null);
    setSessionProgress([]);
    setEditingSessionId(null);
    setSessionDate(getLocalDateString());
  };

  return (
    <div className="space-y-6 text-white min-h-[60vh]">
      <AnimatePresence mode="wait">
        {mode === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3"
          >
            {/* Steps Tracking */}
            <div className="bg-[#151619] border border-[#2A2A2E] rounded-xl p-5 mb-4 group hover:border-[#3B82F6]/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-[#3B82F6]" />
                  <h3 className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">Daily Step Count</h3>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="bg-[#0A0A0B] border border-[#2A2A2E] rounded px-2 py-1 text-[10px] font-mono text-white flex items-center gap-2 hover:border-[#3B82F6] transition-all"
                  >
                    <Calendar size={12} className="text-[#3B82F6]" />
                    {format(parseISO(selectedStepDate), 'MMM dd, yyyy')}
                  </button>

                  <AnimatePresence>
                    {showDatePicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full z-[100] bg-[#151619] border border-[#2A2A2E] rounded-xl p-3 shadow-2xl min-w-[240px]"
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentMonth(subMonths(currentMonth, 1));
                            }}
                            className="p-1 hover:text-[#3B82F6] transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">
                            {format(currentMonth, 'MMMM yyyy')}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentMonth(addMonths(currentMonth, 1));
                            }}
                            className="p-1 hover:text-[#3B82F6] transition-colors"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center mb-1">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`${d}-${i}`} className="text-[8px] font-mono text-[#4A4A4E] font-bold">{d}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const monthStart = startOfMonth(currentMonth);
                            const monthEnd = endOfMonth(monthStart);
                            const startDate = startOfWeek(monthStart);
                            const endDate = endOfWeek(monthEnd);
                            const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                            return calendarDays.map((day, idx) => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const isSelected = dateKey === selectedStepDate;
                              const isCurrentMonth = isSameMonth(day, monthStart);
                              const isTodayDate = isToday(day);

                              return (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStepDate(dateKey);
                                    setShowDatePicker(false);
                                  }}
                                  className={cn(
                                    "aspect-square flex items-center justify-center text-[10px] font-mono rounded transition-all",
                                    !isCurrentMonth && "opacity-20",
                                    isSelected ? "bg-[#3B82F6] text-white font-bold" : "hover:bg-[#2A2A2E] text-[#8E9299]",
                                    isTodayDate && !isSelected && "border border-[#3B82F6]/50 text-[#3B82F6]"
                                  )}
                                >
                                  {format(day, 'd')}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStepDate(format(new Date(), 'yyyy-MM-dd'));
                            setCurrentMonth(new Date());
                            setShowDatePicker(false);
                          }}
                          className="w-full mt-3 py-2 bg-[#0A0A0B] border border-[#2A2A2E] rounded text-[8px] font-mono text-[#3B82F6] uppercase font-bold tracking-widest hover:border-[#3B82F6] transition-all"
                        >
                          Today
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    value={stepInput} 
                    onChange={(e) => setStepInput(e.target.value)}
                    placeholder="ENTER STEPS"
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg py-4 px-4 text-2xl font-mono font-bold text-white focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#2A2A2E]"
                  />
                  <button 
                    onClick={handleStepCommit}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#3B82F6] text-white rounded-md shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                </div>
                <div className="text-right min-w-[60px]">
                  <div className="text-[7px] font-mono text-[#8E9299] uppercase tracking-tighter">Day Score</div>
                  <div className="text-xl font-mono font-bold text-white tracking-tighter">STEPS</div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-[10px] font-mono text-[#8E9299] uppercase tracking-[0.3em] mb-4">Start Session</h2>
              {workoutPlans.map(plan => (
                <button 
                  key={plan.id}
                  onClick={() => startSession(plan)}
                  className="w-full mb-3 group bg-[#151619] border border-[#2A2A2E] p-5 rounded-xl flex items-center justify-between hover:border-[#3B82F6]/50 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg flex items-center justify-center text-[#8E9299] group-hover:text-[#3B82F6] transition-colors">
                      <Play size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-mono font-bold text-white uppercase group-hover:text-[#3B82F6] transition-colors">{plan.name}</h4>
                      <p className="text-[9px] font-mono text-[#8E9299] uppercase tracking-widest mt-1">
                        {plan.exerciseIds.length} ACTION NODES
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#2A2A2E] group-hover:text-[#3B82F6] transition-colors" />
                </button>
              ))}
              {workoutPlans.length === 0 && (
                <div className="text-center py-20 border border-dashed border-[#2A2A2E] rounded-xl">
                  <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest px-6">
                    No workout plans initialized. 
                    <br />Go to DB TAB to create groups.
                  </p>
                </div>
              )}
            </div>

            {workoutSessions.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[10px] font-mono text-[#8E9299] uppercase tracking-[0.3em] flex items-center gap-2">
                    <History size={12} /> Recent Logs
                  </h2>
                  <div className="relative">
                    <button 
                      onClick={() => setShowHistoryCalendar(!showHistoryCalendar)}
                      className="bg-[#0A0A0B] border border-[#2A2A2E] rounded px-2 py-1 text-[10px] font-mono text-[#3B82F6] flex items-center gap-2 hover:border-[#3B82F6] transition-all"
                    >
                      <Calendar size={12} />
                      History Calendar
                    </button>

                    <AnimatePresence>
                      {showHistoryCalendar && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full z-[100] bg-[#151619] border border-[#2A2A2E] rounded-xl p-3 shadow-2xl min-w-[240px]"
                        >
                          <div className="flex items-center justify-between mb-3 px-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentMonth(subMonths(currentMonth, 1));
                              }}
                              className="p-1 hover:text-[#3B82F6] transition-colors"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">
                              {format(currentMonth, 'MMMM yyyy')}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentMonth(addMonths(currentMonth, 1));
                              }}
                              className="p-1 hover:text-[#3B82F6] transition-colors"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-7 gap-1 text-center mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                              <div key={`${d}-${i}`} className="text-[8px] font-mono text-[#4A4A4E] font-bold">{d}</div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {(() => {
                              const monthStart = startOfMonth(currentMonth);
                              const monthEnd = endOfMonth(monthStart);
                              const startDate = startOfWeek(monthStart);
                              const endDate = endOfWeek(monthEnd);
                              const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                              return calendarDays.map((day, idx) => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const sessionsOnDay = workoutSessions.filter(s => s.date.startsWith(dateKey));
                                const hasWorkout = sessionsOnDay.length > 0;
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isTodayDate = isToday(day);

                                return (
                                  <button
                                    key={idx}
                                    disabled={!hasWorkout}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (sessionsOnDay.length > 0) {
                                        editSession(sessionsOnDay[0]); // Edit the first session on that day
                                        setShowHistoryCalendar(false);
                                      }
                                    }}
                                    className={cn(
                                      "aspect-square flex items-center justify-center text-[10px] font-mono rounded transition-all relative",
                                      !isCurrentMonth && "opacity-20",
                                      hasWorkout ? "bg-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white cursor-pointer" : "text-[#4A4A4E] cursor-default",
                                      isTodayDate && "border border-white/20"
                                    )}
                                  >
                                    {format(day, 'd')}
                                    {hasWorkout && (
                                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-current rounded-full" />
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentMonth(new Date());
                            }}
                            className="w-full mt-3 py-2 bg-[#0A0A0B] border border-[#2A2A2E] rounded text-[8px] font-mono text-[#8E9299] uppercase font-bold tracking-widest hover:border-[#3B82F6] transition-all"
                          >
                            Current Month
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="space-y-3">
                  {workoutSessions.slice(0, 10).map(session => {
                    const planName = workoutPlans.find(p => p.id === session.planId)?.name || 'UNKNOWN PLAN';
                    return (
                      <button 
                        key={session.id} 
                        onClick={() => editSession(session)}
                        className="w-full bg-[#151619] border border-[#2A2A2E] p-4 rounded-lg flex justify-between items-center hover:border-[#3B82F6]/50 transition-all text-left"
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-white uppercase">{planName}</p>
                          <p className="text-[8px] font-mono text-[#8E9299] mt-1">{format(parseISO(session.date), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[10px] font-mono text-[#3B82F6] uppercase">{session.exercises.length} EXERCISES</p>
                          </div>
                          <Edit2 size={12} className="text-[#2A2A2E] group-hover:text-[#3B82F6]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'logging' && (
          <motion.div 
            key="logging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-[#151619] border border-[#2A2A2E] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Play size={14} className="text-[#3B82F6]" fill="currentColor" />
                <div>
                  <h3 className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">Active Session</h3>
                  <h4 className="text-sm font-mono font-bold text-white uppercase">{activePlan?.name}</h4>
                </div>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowSessionDatePicker(!showSessionDatePicker)}
                  className="bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg px-3 py-2 text-[10px] font-mono text-white flex items-center gap-2 hover:border-[#3B82F6] transition-all"
                >
                  <Calendar size={12} className="text-[#3B82F6]" />
                  {format(parseISO(sessionDate), 'MMM dd, yyyy')}
                </button>

                <AnimatePresence>
                  {showSessionDatePicker && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 5, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full z-[100] bg-[#151619] border border-[#2A2A2E] rounded-xl p-3 shadow-2xl min-w-[240px]"
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentMonth(subMonths(currentMonth, 1));
                          }}
                          className="p-1 hover:text-[#3B82F6] transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">
                          {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentMonth(addMonths(currentMonth, 1));
                          }}
                          className="p-1 hover:text-[#3B82F6] transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div key={`${d}-${i}`} className="text-[8px] font-mono text-[#4A4A4E] font-bold">{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const monthStart = startOfMonth(currentMonth);
                          const monthEnd = endOfMonth(monthStart);
                          const startDate = startOfWeek(monthStart);
                          const endDate = endOfWeek(monthEnd);
                          const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                          return calendarDays.map((day, idx) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const isSelected = dateKey === sessionDate;
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isTodayDate = isToday(day);

                            return (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSessionDate(dateKey);
                                  setShowSessionDatePicker(false);
                                }}
                                className={cn(
                                  "aspect-square flex items-center justify-center text-[10px] font-mono rounded transition-all",
                                  !isCurrentMonth && "opacity-20",
                                  isSelected ? "bg-[#3B82F6] text-white font-bold" : "hover:bg-[#2A2A2E] text-[#8E9299]",
                                  isTodayDate && !isSelected && "border border-[#3B82F6]/50 text-[#3B82F6]"
                                )}
                              >
                                {format(day, 'd')}
                              </button>
                            );
                          });
                        })()}
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionDate(format(new Date(), 'yyyy-MM-dd'));
                          setCurrentMonth(new Date());
                          setShowSessionDatePicker(false);
                        }}
                        className="w-full mt-3 py-2 bg-[#0A0A0B] border border-[#2A2A2E] rounded text-[8px] font-mono text-[#3B82F6] uppercase font-bold tracking-widest hover:border-[#3B82F6] transition-all"
                      >
                        Today
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {sessionProgress.map((exProgress, exIdx) => {
              const template = exerciseTemplates.find(t => t.id === exProgress.exerciseId);
              const bestSet = getBestForExercise(exProgress.exerciseId);

              return (
                <div key={`${exProgress.exerciseId}-${exIdx}`} className="bg-[#151619] border border-[#2A2A2E] rounded-xl overflow-hidden">
                  <div className="bg-[#1C1D21] p-3 border-b border-[#2A2A2E] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Dumbbell size={14} className="text-[#3B82F6]" />
                      <span className="text-xs font-mono font-bold uppercase tracking-tight">{template?.name || 'Unknown'}</span>
                    </div>
                    {bestSet && (
                      <div className="text-[8px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded italic">
                        BEST: {bestSet.weight}KG x {bestSet.reps}
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-[8px] font-mono text-[#8E9299] px-2 mb-1">
                      <div className="col-span-2 text-center">SET</div>
                      <div className="col-span-4 text-center text-white/40">POIDS</div>
                      <div className="col-span-4 text-center">REPS</div>
                      <div className="col-span-2"></div>
                    </div>

                    {exProgress.sets.map((set, sIdx) => (
                      <div key={sIdx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2 text-center text-[10px] font-mono text-[#8E9299]">[{sIdx + 1}]</div>
                        <div className="col-span-4">
                          <input 
                            type="number"
                            value={set.weight || ''}
                            onChange={(e) => {
                              const newProgress = [...sessionProgress];
                              newProgress[exIdx].sets[sIdx].weight = Number(e.target.value);
                              setSessionProgress(newProgress);
                            }}
                            className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2 text-xs text-center font-mono focus:border-[#3B82F6] outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-4">
                          <input 
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) => {
                              const newProgress = [...sessionProgress];
                              newProgress[exIdx].sets[sIdx].reps = Number(e.target.value);
                              setSessionProgress(newProgress);
                            }}
                            className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2 text-xs text-center font-mono focus:border-[#3B82F6] outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <button 
                            onClick={() => {
                              const newProgress = [...sessionProgress];
                              newProgress[exIdx].sets = newProgress[exIdx].sets.filter((_, i) => i !== sIdx);
                              setSessionProgress(newProgress);
                            }}
                            className="p-1 text-[#2A2A2E] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => {
                        const newProgress = [...sessionProgress];
                        const lastSet = newProgress[exIdx].sets[newProgress[exIdx].sets.length - 1];
                        newProgress[exIdx].sets.push({ 
                          weight: lastSet?.weight || 0, 
                          reps: lastSet?.reps || 0 
                        });
                        setSessionProgress(newProgress);
                      }}
                      className="w-full py-1.5 border border-dashed border-[#2A2A2E] rounded text-[9px] font-mono text-[#8E9299] hover:text-[#3B82F6] hover:border-[#3B82F6]/50 transition-all uppercase"
                    >
                      + add set
                    </button>
                  </div>
                </div>
              );
            })}

            <div className={cn(
              "grid gap-4",
              editingSessionId ? "grid-cols-2" : "grid-cols-1"
            )}>
              <button 
                onClick={commitSession}
                className="py-4 bg-[#3B82F6] text-white font-mono font-bold uppercase tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98] transition-all"
              >
                {editingSessionId ? 'UPDATE SESSION' : 'COMMIT SESSION'}
              </button>
              {editingSessionId && (
                <div className="relative">
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 font-mono font-bold uppercase tracking-[0.2em] rounded-xl active:scale-[0.98] transition-all hover:bg-red-500 hover:text-white"
                    >
                      DELETE
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (auth.currentUser) {
                            deleteDocument('workouts', editingSessionId);
                          } else {
                            setWorkoutSessions(prev => prev.filter(s => s.id !== editingSessionId));
                          }
                          setMode('selection');
                          setActivePlan(null);
                          setSessionProgress([]);
                          setEditingSessionId(null);
                          setShowDeleteConfirm(false);
                          setSessionDate(getLocalDateString());
                        }}
                        className="flex-1 py-4 bg-red-600 text-white font-mono font-bold uppercase tracking-[0.2em] rounded-xl active:scale-[0.98] transition-all"
                      >
                        CONFIRM
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-4 bg-[#151619] border border-[#2A2A2E] text-[#8E9299] font-mono font-bold uppercase tracking-[0.2em] rounded-xl active:scale-[0.98] transition-all"
                      >
                        CANCEL
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
