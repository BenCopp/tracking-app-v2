import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';
import { 
  Calendar,
  TrendingUp,
  Dumbbell,
  ChevronRight,
  ChevronDown,
  Utensils,
  Activity,
  PieChart as PieChartIcon
} from 'lucide-react';
import { LoggedFood, UserProfile, WorkoutSession, WorkoutPlan, ExerciseEntry, DailySteps } from '../types';
import { motion } from 'motion/react';

interface DashboardViewProps {
  loggedFoods: LoggedFood[];
  userProfile: UserProfile;
  workoutSessions: WorkoutSession[];
  workoutPlans: WorkoutPlan[];
  exerciseTemplates: ExerciseEntry[];
  dailySteps: DailySteps[];
}

export default function DashboardView({ 
  loggedFoods, 
  userProfile, 
  workoutSessions,
  workoutPlans,
  exerciseTemplates,
  dailySteps
}: DashboardViewProps) {
  const [period, setPeriod] = React.useState('7D');
  const [metric, setMetric] = React.useState<'kcal' | 'p' | 'c' | 'f' | 'sugar' | 'fiber'>('kcal');
  const [customRange, setCustomRange] = React.useState(() => {
    const d = new Date();
    const startD = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
    const getLocalStr = (date: Date) => {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    };
    return {
      start: getLocalStr(startD),
      end: getLocalStr(d)
    };
  });
  
  // Progressive Overload States
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>(workoutPlans[0]?.id || '');
  const [selectedExerciseId, setSelectedExerciseId] = React.useState<string>('');
  const [overloadPeriod, setOverloadPeriod] = React.useState<'7I' | '30I' | '6M' | 'ALL'>('30I');
  const [viewMode, setViewMode] = React.useState<'training' | 'nutrition' | 'activity'>('training');

  const getConsistencyHistory = () => {
    const history = [];
    let days = period === '7D' ? 7 : period === '30D' ? 30 : period === '6M' ? 180 : 365;
    
    // Calculate effective end date: current date or latest log date, whichever is later
    const now = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const latestLog = loggedFoods.length > 0 
      ? loggedFoods.reduce((max, l) => l.date > max ? l.date : max, "")
      : "";
    
    if (latestLog) {
      const latestDate = new Date(latestLog.split('T')[0]);
      if (latestDate > endDate) {
        endDate = latestDate;
      }
    }
    
    if (period === 'CUSTOM') {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    }

    const isLongTerm = days > 30;

    if (isLongTerm) {
      // Monthly aggregation
      const months: Map<string, { kcal: number, p: number, c: number, f: number, sugar: number, fiber: number, days: number, label: string, year: number, month: number }> = new Map();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const groupKey = `${d.getFullYear()}-${d.getMonth()}`;
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const dayLogs = loggedFoods.filter(l => l.date.startsWith(dateStr));
        
        const totals = dayLogs.reduce((acc, l) => ({
          kcal: acc.kcal + l.kcal,
          p: acc.p + l.macros.p,
          c: acc.c + l.macros.c,
          f: acc.f + l.macros.f,
          sugar: acc.sugar + (l.macros.sugar || 0),
          fiber: acc.fiber + (l.macros.fiber || 0)
        }), { kcal: 0, p: 0, c: 0, f: 0, sugar: 0, fiber: 0 });

        if (!months.has(groupKey)) {
          months.set(groupKey, { 
            kcal: 0, p: 0, c: 0, f: 0, sugar: 0, fiber: 0,
            days: 0, 
            label: monthLabel,
            year: d.getFullYear(),
            month: d.getMonth()
          });
        }
        const current = months.get(groupKey)!;
        current.kcal += totals.kcal;
        current.p += totals.p;
        current.c += totals.c;
        current.f += totals.f;
        current.sugar += totals.sugar;
        current.fiber += totals.fiber;
        current.days += 1;
      }

      // Sort months chronologically
      return Array.from(months.values())
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        .map((data) => ({
          label: data.label,
          kcal: Math.round(data.kcal / data.days),
          p: Math.round(data.p / data.days),
          c: Math.round(data.c / data.days),
          f: Math.round(data.f / data.days),
          sugar: Math.round(data.sugar / data.days),
          fiber: Math.round(data.fiber / data.days),
          isMonthly: true
        }));
    }

    // Daily aggregation
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const dayLogs = loggedFoods.filter(l => l.date.startsWith(dateStr));
      
      const totals = dayLogs.reduce((acc, l) => ({
        kcal: acc.kcal + l.kcal,
        p: acc.p + l.macros.p,
        c: acc.c + l.macros.c,
        f: acc.f + l.macros.f,
        sugar: acc.sugar + (l.macros.sugar || 0),
        fiber: acc.fiber + (l.macros.fiber || 0)
      }), { kcal: 0, p: 0, c: 0, f: 0, sugar: 0, fiber: 0 });

      history.push({
        date: dateStr,
        ...totals,
        day: d.getDate(),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' })[0],
        label: d.getDate().toString()
      });
    }
    return history;
  };

  const consistencyData = getConsistencyHistory();
  
  // Nutrition Summary for Today
  const todayDate = new Date().toISOString().split('T')[0];
  const todayLogs = loggedFoods.filter(l => l.date.startsWith(todayDate));
  const todayMacros = todayLogs.reduce((acc, curr) => ({
    p: acc.p + curr.macros.p,
    c: acc.c + curr.macros.c,
    f: acc.f + curr.macros.f,
    sugar: acc.sugar + (curr.macros.sugar || 0),
    fiber: acc.fiber + (curr.macros.fiber || 0),
    kcal: acc.kcal + curr.kcal
  }), { p: 0, c: 0, f: 0, sugar: 0, fiber: 0, kcal: 0 });

  const currentMetricValue = consistencyData[consistencyData.length - 1]?.[metric] || 0;
  const metricGoal = metric === 'kcal' 
    ? userProfile.goals.kcal 
    : metric === 'p'
    ? userProfile.goals.p
    : metric === 'c'
    ? userProfile.goals.c
    : metric === 'f'
    ? userProfile.goals.f
    : metric === 'sugar'
    ? (userProfile.goals.sugar || 50)
    : (userProfile.goals.fiber || 30);
  const metricLabel = metric === 'kcal' ? 'KCAL' : metric === 'p' ? 'PROT' : metric === 'c' ? 'CARB' : metric === 'f' ? 'FAT' : metric === 'sugar' ? 'SUGAR' : 'FIBER';
  const metricUnit = metric === 'kcal' ? 'KCAL' : 'G';

  const METRIC_COLORS: Record<string, string> = {
    kcal: '#10B981', // Emerald
    p: '#3B82F6',    // Blue
    c: '#EAB308',    // Yellow
    f: '#EF4444',    // Red
    sugar: '#F97316',// Orange
    fiber: '#10B981',// Emerald
  };
  const activeColor = METRIC_COLORS[metric] || '#3B82F6';

  // Progressive Overload Data Processing
  const availableExercises = React.useMemo(() => {
    if (!selectedPlanId) return [];
    const plan = workoutPlans.find(p => p.id === selectedPlanId);
    if (!plan) return [];
    return exerciseTemplates.filter(e => plan.exerciseIds.includes(e.id));
  }, [selectedPlanId, workoutPlans, exerciseTemplates]);

  // Set default exercise when plan changes
  React.useEffect(() => {
    if (availableExercises.length > 0 && !availableExercises.find(e => e.id === selectedExerciseId)) {
      setSelectedExerciseId(availableExercises[0].id);
    }
  }, [availableExercises, selectedExerciseId]);

  const overloadData = React.useMemo(() => {
    if (!selectedExerciseId) return [];

    // 1. Get ALL sessions for this plan to establish absolute iteration numbers
    const allRelevantSessions = workoutSessions
      .filter(s => s.planId === selectedPlanId)
      .sort((a, b) => a.date.localeCompare(b.date));

    const rawData: any[] = [];
    let absoluteIteration = 1;

    allRelevantSessions.forEach(session => {
      const exerciseEntry = session.exercises.find(e => e.exerciseId === selectedExerciseId);
      if (exerciseEntry && exerciseEntry.sets.length > 0) {
        const sortedSets = [...exerciseEntry.sets].sort((a, b) => {
          if (b.weight !== a.weight) return b.weight - a.weight;
          return b.reps - a.reps;
        });
        const bestSet = sortedSets[0];
        
        const sessionDate = new Date(session.date);
        rawData.push({
          iteration: absoluteIteration++,
          date: sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: sessionDate,
          monthKey: `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`,
          monthLabel: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(sessionDate),
          weight: bestSet.weight,
          reps: bestSet.reps,
          volume: exerciseEntry.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0)
        });
      }
    });

    // 2. Apply filters to rawData
    let filteredData = rawData;
    if (overloadPeriod === '7I') filteredData = rawData.slice(-7);
    else if (overloadPeriod === '30I') filteredData = rawData.slice(-30);
    else if (overloadPeriod === '6M') {
      const minDate = new Date();
      minDate.setMonth(minDate.getMonth() - 6);
      filteredData = rawData.filter(d => d.fullDate >= minDate);
    }

    // 3. Monthly grouping if > 30 points OR 6M/ALL period selected
    const monthlyGroups = new Map<string, { weight: number, reps: number, label: string }>();
    const shouldGroupMonthly = filteredData.length > 30 || overloadPeriod === '6M' || overloadPeriod === 'ALL';

    if (shouldGroupMonthly && filteredData.length > 0) {
      filteredData.forEach(d => {
        const key = d.monthKey;
        // Only set if not already present to keep the FIRST session of the month
        if (!monthlyGroups.has(key)) {
          monthlyGroups.set(key, { weight: d.weight, reps: d.reps, label: d.monthLabel });
        }
      });

      return Array.from(monthlyGroups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([_, g]) => ({
          displayLabel: g.label,
          weight: g.weight,
          reps: g.reps,
          isMonthly: true,
          iteration: g.label // for Tooltip compatibility
        }));
    }

    return filteredData.map((d, idx) => ({
      ...d,
      displayLabel: (idx + 1).toString(), // Relative iteration: 1, 2, 3... for the view
      iteration: d.iteration // absolute iteration for tooltips
    }));
  }, [selectedPlanId, selectedExerciseId, workoutSessions, overloadPeriod]);

  const archiveData = React.useMemo(() => {
    let days = period === '7D' ? 7 : period === '30D' ? 30 : period === '6M' ? 180 : period === 'ALL' ? 365 : 7;
    const now = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'CUSTOM') {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    }

    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      
      const sessionsOnDay = workoutSessions.filter(s => s.date.startsWith(dateStr));
      const totalSets = sessionsOnDay.reduce((acc, s) => acc + s.exercises.reduce((exAcc, ex) => exAcc + ex.sets.length, 0), 0);
      
      let intensity = 0;
      if (totalSets > 0) {
        if (totalSets > 12) intensity = 3;
        else if (totalSets > 6) intensity = 2;
        else intensity = 1;
      }
      
      result.push({ date: dateStr, intensity });
    }
    return result;
  }, [workoutSessions, period, customRange]);

  const stepHistory = React.useMemo(() => {
    let days = period === '7D' ? 7 : period === '30D' ? 30 : period === '6M' ? 180 : 365;
    const now = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'CUSTOM') {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    }

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const count = dailySteps.find(s => s.date === dateStr)?.count || 0;
      
      let label = '';
      if (days <= 7) {
        label = d.toLocaleDateString('en-US', { weekday: 'short' })[0];
      } else if (days <= 31) {
        label = d.getDate().toString();
      } else {
        label = d.toLocaleDateString('en-US', { month: 'short' });
      }

      result.push({ 
        date: dateStr, 
        count,
        label,
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }

    if (days > 31) {
      // Monthly aggregation
      const months: Map<string, { count: number, days: number, label: string, year: number, month: number }> = new Map();
      for (const item of result) {
        const groupKey = `${item.year}-${item.month}`;
        if (!months.has(groupKey)) {
          months.set(groupKey, { 
            count: 0, 
            days: 0, 
            label: item.label,
            year: item.year,
            month: item.month
          });
        }
        const current = months.get(groupKey)!;
        current.count += item.count;
        current.days += 1;
      }
      return Array.from(months.values())
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        .map(m => ({
          label: m.label,
          count: Math.round(m.count / m.days),
          date: `${m.label} ${m.year}`,
          isMonthly: true
        }));
    }

    return result;
  }, [dailySteps, period, customRange]);

  const todaySteps = dailySteps.find(s => s.date === todayDate)?.count || 0;

  const [hoveredDay, setHoveredDay] = React.useState<any>(null);

  return (
    <div className="space-y-3">
      {/* Main View Toggle */}
      <div className="flex bg-[#151619] p-1 rounded-xl border border-[#2A2A2E] sticky top-0 z-50 shadow-2xl">
        <button
          onClick={() => setViewMode('training')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all",
            viewMode === 'training' 
              ? "bg-[#3B82F6] text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
              : "text-[#8E9299] hover:text-white hover:bg-[#2A2A2E]"
          )}
        >
          <Dumbbell size={14} />
          Training
        </button>
        <button
          onClick={() => setViewMode('nutrition')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all",
            viewMode === 'nutrition' 
              ? "bg-[#3B82F6] text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
              : "text-[#8E9299] hover:text-white hover:bg-[#2A2A2E]"
          )}
        >
          <Utensils size={14} />
          Nutrition
        </button>
        <button
          onClick={() => setViewMode('activity')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all",
            viewMode === 'activity' 
              ? "bg-[#3B82F6] text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
              : "text-[#8E9299] hover:text-white hover:bg-[#2A2A2E]"
          )}
        >
          <Activity size={14} />
          Activity
        </button>
      </div>

      {viewMode === 'training' && (
        <div className="space-y-3">
          {/* Progressive Overload Period Filters (Separated) */}
          <div className="flex bg-[#151619] p-1 rounded-lg border border-[#2A2A2E] overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-full">
              {[
                { id: '7I', label: '7 Iter' },
                { id: '30I', label: '30 Iter' },
                { id: '6M', label: '6 Months' },
                { id: 'ALL', label: 'All' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setOverloadPeriod(p.id as any)}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    overloadPeriod === p.id 
                      ? "bg-[#3B82F6] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                      : "text-[#8E9299] hover:text-white hover:bg-[#2A2A2E]"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overload Summary Card */}
          <div className="bg-[#151619] text-[#E0E0E0] p-4 rounded-lg shadow-2xl relative overflow-hidden border border-[#2A2A2E] border-b-2 border-b-[#3B82F6]">
            <div className="grid grid-cols-3 items-end mb-4 relative z-10">
              <div className="group/stat cursor-help relative">
                <h3 className="text-3xl font-mono font-bold tracking-tighter">
                  {overloadData[0]?.weight || 0}
                  <span className="text-sm ml-1 text-[#8E9299]">kg</span>
                </h3>
                <p className="text-[8px] uppercase font-mono text-[#8E9299] tracking-widest mt-1">start weight</p>
                {overloadData[0] && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-[#0A0A0B] border border-[#2A2A2E] rounded text-[8px] font-mono whitespace-nowrap opacity-0 group-hover/stat:opacity-100 transition-opacity z-50">
                    RECORDED: {overloadData[0].date}
                  </div>
                )}
              </div>
              
              <div className="text-center group/stat cursor-help relative">
                <h3 className="text-3xl font-mono font-bold tracking-tighter text-[#3B82F6]">
                  {overloadData[0]?.reps || 0}
                  <span className="text-sm ml-1 opacity-50">reps</span>
                </h3>
                <p className="text-[8px] uppercase font-mono text-[#8E9299] tracking-widest mt-1">start reps</p>
              </div>

              <div className="text-right group/stat cursor-help relative">
                {(() => {
                  const latest = overloadData[overloadData.length - 1];
                  const first = overloadData[0];
                  const diff = (latest && first) ? latest.weight - first.weight : 0;
                  const isPos = diff > 0;
                  return (
                    <>
                      <h3 className={cn(
                        "text-3xl font-mono font-bold tracking-tighter",
                        isPos ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-white"
                      )}>
                        {isPos ? '+' : ''}{Math.round(diff * 10) / 10}
                        <span className="text-sm ml-1 opacity-50">kg</span>
                      </h3>
                      <p className="text-[8px] uppercase font-mono text-[#8E9299] tracking-widest mt-1">
                        total progression
                      </p>
                      {latest && (
                        <div className="absolute top-full right-0 mt-2 p-2 bg-[#0A0A0B] border border-[#2A2A2E] rounded text-[8px] font-mono whitespace-nowrap opacity-0 group-hover/stat:opacity-100 transition-opacity z-50">
                          LATEST: {latest.displayLabel === latest.date ? latest.date : `Iter ${latest.iteration} (${latest.date})`}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="space-y-1">
                <label className="text-[7px] font-mono text-[#8E9299] uppercase ml-1">Workout Session</label>
                <select 
                  value={selectedPlanId} 
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg px-2 py-1.5 text-[10px] font-mono text-white focus:ring-1 focus:ring-[#3B82F6]"
                >
                  {workoutPlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] font-mono text-[#8E9299] uppercase ml-1">Target Exercise</label>
                <select 
                  value={selectedExerciseId} 
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg px-2 py-1.5 text-[10px] font-mono text-white focus:ring-1 focus:ring-[#3B82F6]"
                >
                  {availableExercises.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Overload Chart Card */}
          <section className="bg-[#151619] border border-[#2A2A2E] rounded-xl overflow-hidden p-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest flex items-center gap-2">
                <Dumbbell size={12} className="text-[#3B82F6]" /> PROGRESSIVE OVERLOAD TREND
              </h3>
            </div>

            <div key={`${overloadPeriod}-${selectedExerciseId}`} className="h-48 w-full pr-4">
              {overloadData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={overloadData} 
                    margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorOverload" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2E" />
                    <XAxis 
                      dataKey="displayLabel" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8E9299', fontSize: 10, fontFamily: 'monospace' }} 
                      dy={10}
                      padding={{ left: 10, right: 10 }}
                      interval={overloadData.length > 12 ? 'preserveStartEnd' : 0}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8E9299', fontSize: 8, fontFamily: 'monospace' }}
                      width={30}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-[#0A0A0B] border border-[#2A2A2E] p-2 rounded shadow-xl space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-[8px] font-mono text-[#8E9299] uppercase">
                                  {item.isMonthly ? 'MONTH:' : 'ITERATION:'}
                                </span>
                                <span className="text-[10px] font-mono text-white font-bold">{item.iteration}</span>
                              </div>
                              {!item.isMonthly && (
                                <div className="flex justify-between gap-4">
                                  <span className="text-[8px] font-mono text-[#8E9299] uppercase">DATE:</span>
                                  <span className="text-[10px] font-mono text-[#3B82F6]">{item.date}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-4 border-t border-[#2A2A2E] pt-1">
                                <span className="text-[8px] font-mono text-[#8E9299] uppercase">
                                  {item.isMonthly ? 'FIRST WT:' : 'MAX WT:'}
                                </span>
                                <span className="text-[10px] font-mono text-white font-bold">
                                  {payload[0].value} kg
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-[8px] font-mono text-[#8E9299] uppercase">
                                  {item.isMonthly ? 'FIRST REPS:' : 'REPS:'}
                                </span>
                                <span className="text-[10px] font-mono text-[#3B82F6] font-bold">
                                  {item.reps}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#3B82F6" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorOverload)" 
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#4A4A4E] border border-dashed border-[#2A2A2E] rounded-lg bg-[#0A0A0B]/50">
                  <Dumbbell size={24} className="mb-2 opacity-20" />
                  <p className="text-[9px] font-mono uppercase tracking-widest text-center px-6">
                    Not enough data for this combination.<br/>Perform at least 2 sessions to see trend.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {viewMode === 'activity' && (
        <div className="space-y-3">
          {/* Linked Universal Filters */}
          <div className="space-y-2">
            <div className="flex bg-[#151619] p-1 rounded-lg border border-[#2A2A2E] overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 min-w-full">
                {['7D', '30D', '6M', 'ALL', 'CUSTOM'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      period === p 
                        ? "bg-[#3B82F6] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                        : "text-[#8E9299] hover:text-white hover:bg-[#2A2A2E]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {period === 'CUSTOM' && (
              <div className="flex items-center gap-3 bg-[#0A0A0B] border border-[#2A2A2E] p-3 rounded-lg">
                <Calendar size={14} className="text-[#3B82F6]" />
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex flex-col flex-1">
                    <span className="text-[7px] font-mono text-[#8E9299] uppercase mb-1">Start</span>
                    <input 
                      type="date" 
                      value={customRange.start}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="bg-transparent border-none text-[10px] font-mono text-white focus:ring-0 p-0"
                    />
                  </div>
                  <div className="w-[1px] h-4 bg-[#2A2A2E]" />
                  <div className="flex flex-col flex-1 text-right">
                    <span className="text-[7px] font-mono text-[#8E9299] uppercase mb-1">End</span>
                    <input 
                      type="date" 
                      value={customRange.end}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="bg-transparent border-none text-[10px] font-mono text-white focus:ring-0 p-0 text-right"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Steps Tracking Summary */}
          <section className="bg-[#151619] border border-[#2A2A2E] rounded-xl p-4 space-y-2 group">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} className="text-[#3B82F6]" /> DAILY ACTIVITY
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#3B82F6]">{todaySteps.toLocaleString()} / 10K</span>
            </div>
            
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stepHistory}
                  onMouseMove={(state: any) => {
                    if (state && state.activePayload) {
                      setHoveredDay(state.activePayload[0].payload);
                    }
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <Bar 
                    dataKey="count" 
                    fill="#3B82F6" 
                    radius={[2, 2, 0, 0]} 
                    opacity={0.8}
                    className="cursor-pointer"
                  >
                    {stepHistory.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.date === todayDate ? "#3B82F6" : "#2A2A2E"} 
                        opacity={entry.count > 0 ? 1 : 0.3}
                        className="hover:fill-[#3B82F6] transition-all duration-300"
                      />
                    ))}
                  </Bar>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8E9299', fontSize: 8, fontFamily: 'monospace' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)', radius: 4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const isTodayDate = data.date === todayDate;
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="bg-[#0A0A0B] border border-[#3B82F6]/50 p-3 rounded-lg shadow-2xl backdrop-blur-md"
                          >
                            <p className="text-[7px] font-mono text-[#8E9299] uppercase mb-1">{isTodayDate ? 'Captured Today' : data.date}</p>
                            <div className="flex items-baseline gap-2">
                              <p className="text-xl font-mono text-white font-bold tracking-tighter">{payload[0].value.toLocaleString()}</p>
                              <p className="text-[10px] font-mono text-[#3B82F6] font-bold">STEPS</p>
                            </div>
                            <div className="mt-2 w-full bg-[#151619] h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#3B82F6] h-full" 
                                style={{ width: `${Math.min(100, (Number(payload[0].value) / 10000) * 100)}%` }}
                              />
                            </div>
                          </motion.div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Training Archive */}
          <section className="bg-[#151619] border border-[#2A2A2E] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} className="text-[#3B82F6]" /> TRAINING ARCHIVE
              </h3>
              {hoveredDay && (
                <motion.span 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="text-[9px] font-mono text-white/50 bg-[#2A2A2E] px-2 py-0.5 rounded"
                >
                  {hoveredDay.date}: {hoveredDay.intensity > 0 ? `${hoveredDay.intensity} sessions` : 'Rest Day'}
                </motion.span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {archiveData.map((d, i) => (
                <motion.div 
                  key={i} 
                  onMouseEnter={() => setHoveredDay(d)}
                  onMouseLeave={() => setHoveredDay(null)}
                  whileHover={{ scale: 1.2, zIndex: 10 }}
                  className={cn(
                    "w-[10px] h-[10px] rounded-[2px] transition-colors cursor-pointer",
                    d.intensity === 3 ? "bg-[#3B82F6]" : 
                    d.intensity === 2 ? "bg-[#3B82F6]/60" : 
                    d.intensity === 1 ? "bg-[#3B82F6]/30" : "bg-[#2A2A2E]/30",
                    hoveredDay?.date === d.date && "ring-1 ring-white/50"
                  )}
                />
              ))}
            </div>
            <p className="text-[7px] font-mono text-[#4A4A4E] uppercase tracking-widest text-right">
              {period === 'CUSTOM' ? `Custom Range (${archiveData.length} days)` : 
               period === 'ALL' ? 'Last Year' : 
               `Last ${archiveData.length} days`}
            </p>
          </section>
        </div>
      )}

      {viewMode === 'nutrition' && (
        <div className="space-y-3">
          {/* Linked Universal Filters */}
          <div className="space-y-2">
            <div className="flex bg-[#151619] p-1 rounded-lg border border-[#2A2A2E] overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 min-w-full">
                {['7D', '30D', '6M', 'ALL', 'CUSTOM'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      period === p 
                        ? "bg-[#3B82F6] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                        : "text-[#8E9299] hover:text-white hover:bg-[#2A2A2E]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {period === 'CUSTOM' && (
              <div className="flex items-center gap-3 bg-[#0A0A0B] border border-[#2A2A2E] p-3 rounded-lg">
                <Calendar size={14} className="text-[#3B82F6]" />
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex flex-col flex-1">
                    <span className="text-[7px] font-mono text-[#8E9299] uppercase mb-1">Start</span>
                    <input 
                      type="date" 
                      value={customRange.start}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="bg-transparent border-none text-[10px] font-mono text-white focus:ring-0 p-0"
                    />
                  </div>
                  <div className="w-[1px] h-4 bg-[#2A2A2E]" />
                  <div className="flex flex-col flex-1 text-right">
                    <span className="text-[7px] font-mono text-[#8E9299] uppercase mb-1">End</span>
                    <input 
                      type="date" 
                      value={customRange.end}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="bg-transparent border-none text-[10px] font-mono text-white focus:ring-0 p-0 text-right"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Today's Nutrition Summary */}
          <div className="bg-[#151619] text-[#E0E0E0] p-4 rounded-lg shadow-2xl relative overflow-hidden border border-[#2A2A2E] border-b-2 border-b-emerald-400">
            <div className="flex justify-between items-end mb-4 relative z-10">
              <div>
                <h3 className="text-3xl font-mono font-bold tracking-tighter">{Math.round(todayMacros.kcal)}</h3>
                <p className="text-[8px] uppercase font-mono text-[#8E9299] tracking-widest mt-1">kcal today</p>
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-mono font-bold text-emerald-400 tracking-tighter">{Math.max(0, userProfile.goals.kcal - Math.round(todayMacros.kcal))}</h3>
                <p className="text-[8px] uppercase font-mono text-[#8E9299] tracking-widest mt-1">kcal reserve</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 relative z-10 mb-4">
              <MacroProgress label="PROT" current={Math.round(todayMacros.p)} target={userProfile.goals.p} color="bg-emerald-400" />
              <MacroProgress label="CARB" current={Math.round(todayMacros.c)} target={userProfile.goals.c} color="bg-blue-400" />
              <MacroProgress label="FAT" current={Math.round(todayMacros.f)} target={userProfile.goals.f} color="bg-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-6 relative z-10 border-t border-[#2A2A2E]/50 pt-3">
              <MacroProgress label="SUGAR" current={Math.round(todayMacros.sugar)} target={userProfile.goals.sugar || 50} color="bg-orange-400" />
              <MacroProgress label="FIBER" current={Math.round(todayMacros.fiber)} target={userProfile.goals.fiber || 30} color="bg-emerald-400" />
            </div>
            
            <div className="absolute -bottom-10 -right-10 opacity-[0.03] text-emerald-400">
              <Utensils size={200} />
            </div>
          </div>

          {/* Caloric Trend */}
          <section className="bg-[#151619] border border-[#2A2A2E] rounded-xl overflow-hidden p-4">
            <div className="mb-3">
              <h3 className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={12} /> Nutrition tracking
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(['kcal', 'p', 'c', 'f', 'sugar', 'fiber'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    "flex-1 min-w-[50px] py-1 px-1.5 rounded border font-mono text-[8.5px] font-bold uppercase tracking-widest transition-all text-center",
                    metric === m 
                      ? "bg-[#3B82F6] text-white border-[#3B82F6]" 
                      : "bg-[#0A0A0B] text-[#8E9299] border-[#2A2A2E] hover:border-[#3B82F6]/50"
                  )}
                >
                  {m === 'kcal' ? 'KCAL' : m === 'p' ? 'PROT' : m === 'c' ? 'CARB' : m === 'f' ? 'FAT' : m === 'sugar' ? 'SUGAR' : 'FIBER'}
                </button>
              ))}
            </div>
            
            <div className="h-48 w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={consistencyData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2E" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8E9299', fontSize: 10, fontFamily: 'monospace' }} 
                    dy={10}
                    padding={{ left: 10, right: 10 }}
                    interval={period === '7D' ? 0 : 'preserveStartEnd'}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8E9299', fontSize: 8, fontFamily: 'monospace' }}
                    width={30}
                    domain={[0, (dataMax: number) => Math.max(dataMax, metricGoal) + (metric === 'kcal' ? 500 : 50)]} 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const value = Math.round(payload[0].value as number);
                        const diff = value - metricGoal;
                        const isOver = diff > 0;

                        return (
                          <div className="bg-[#0A0A0B] border border-[#2A2A2E] p-2 rounded shadow-xl space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-[8px] font-mono text-[#8E9299] uppercase">VALUE:</span>
                              <span className="text-[10px] font-mono text-white font-bold">{value} {metricUnit}</span>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-[#2A2A2E] pt-1">
                              <span className="text-[8px] font-mono text-[#8E9299] uppercase">GOAL:</span>
                              <span className="text-[10px] font-mono text-[#EF4444] font-bold">{metricGoal} {metricUnit}</span>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-[#2A2A2E] pt-1">
                              <span className="text-[8px] font-mono text-[#8E9299] uppercase">DIFF:</span>
                              <span className={cn("text-[8px] font-mono font-bold", isOver ? "text-red-400" : "text-green-400")}>
                                {isOver ? '+' : ''}{diff} {metricUnit}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={metricGoal} 
                    stroke="#EF4444" 
                    strokeDasharray="3 3" 
                    strokeWidth={2}
                    label={{ 
                      position: 'right', 
                      value: 'GOAL', 
                      fill: '#EF4444', 
                      fontSize: 10, 
                      fontFamily: 'monospace',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey={metric} 
                    stroke={activeColor} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorMetric)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MacroProgress({ label, current, target, color }: { label: string, current: number, target: number, color: string }) {
  const percentage = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</span>
        <span className="text-[10px] font-mono font-bold text-white">{current}g</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
