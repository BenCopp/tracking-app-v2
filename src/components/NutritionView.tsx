import React, { useState } from 'react';
import { Search, Plus, Beef, Utensils, Coffee, Trash2, History, X, Salad, Apple, Carrot } from 'lucide-react';
import { cn } from '../lib/utils';
import { Food, LoggedFood, UserProfile } from '../types';
import { addDocument, deleteDocument } from '../lib/firestore';
import { auth } from '../lib/firebase';

const ICON_MAP: Record<string, any> = {
  'Beef': <Beef size={14} />,
  'Meat': <Beef size={14} />,
  'Veggie': <Salad size={14} />,
  'Fruit': <Apple size={14} />,
  'Carrot': <Carrot size={14} />,
  'ForkIcon': <Utensils size={14} />,
  'Coffee': <Coffee size={14} />,
};

interface NutritionViewProps {
  foodDatabase: Food[];
  loggedFoods: LoggedFood[];
  setLoggedFoods: React.Dispatch<React.SetStateAction<LoggedFood[]>>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  userProfile: UserProfile;
  setHeaderAction: (node: React.ReactNode) => void;
}

export default function NutritionView({ 
  foodDatabase, 
  loggedFoods, 
  setLoggedFoods, 
  selectedDate, 
  setSelectedDate, 
  userProfile,
  setHeaderAction
}: NutritionViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [weight, setWeight] = useState<number>(100);
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  React.useEffect(() => {
    setHeaderAction(
      <button 
        onClick={() => setShowHistory(prev => !prev)}
        className="flex items-center gap-1.5 text-[9px] font-mono text-[#3B82F6] hover:text-white transition-colors px-2 py-1 bg-[#151619] border border-[#2A2A2E] rounded"
      >
        <History size={12} /> HISTORY
      </button>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction]);

  const filteredFoods = loggedFoods.filter(f => f.date.startsWith(selectedDate));

  const handleAddFood = (food: Food) => {
    setSelectedFood(food);
    setWeight(food.baseWeight);
  };

  const confirmAdd = () => {
    if (!selectedFood) return;
    
    const ratio = weight / selectedFood.baseWeight;
    const newKcal = Math.round(selectedFood.baseKcal * ratio);
    
    const loggedData = {
      name: selectedFood.name,
      quantity: `${weight}g`,
      kcal: newKcal,
      icon: selectedFood.icon,
      macros: {
        p: Number((selectedFood.baseMacros.p * ratio).toFixed(1)),
        c: Number((selectedFood.baseMacros.c * ratio).toFixed(1)),
        f: Number((selectedFood.baseMacros.f * ratio).toFixed(1)),
        sugar: Number(((selectedFood.baseMacros.sugar || 0) * ratio).toFixed(1)),
        fiber: Number(((selectedFood.baseMacros.fiber || 0) * ratio).toFixed(1)),
      },
      date: `${selectedDate}T12:00:00`
    };
    
    if (auth.currentUser) {
      addDocument('food_logs', loggedData);
    } else {
      const logged: LoggedFood = {
        id: Math.random().toString(),
        ...loggedData
      };
      setLoggedFoods([logged, ...loggedFoods]);
    }
    
    setSelectedFood(null);
    setShowHistory(false);
  };

  const totalMacros = filteredFoods.reduce((acc, curr) => ({
    p: acc.p + curr.macros.p,
    c: acc.c + curr.macros.c,
    f: acc.f + curr.macros.f,
    sugar: acc.sugar + (curr.macros.sugar || 0),
    fiber: acc.fiber + (curr.macros.fiber || 0),
    kcal: acc.kcal + curr.kcal
  }), { p: 0, c: 0, f: 0, sugar: 0, fiber: 0, kcal: 0 });

  const handleDeleteLogged = (id: string) => {
    if (auth.currentUser) {
      deleteDocument('food_logs', id);
    } else {
      setLoggedFoods(prev => prev.filter(f => f.id !== id));
    }
  };

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector('[data-selected="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        // Fallback: scroll to the end (today)
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    }
  }, [selectedDate]);

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDays = () => {
    const days = [];
    const now = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Include future dates if logs exist for them
    const latestLog = loggedFoods.length > 0 
      ? loggedFoods.reduce((max, l) => l.date > max ? l.date : max, "")
      : "";
    
    if (latestLog) {
      const latestLogDate = new Date(latestLog.split('T')[0] + 'T00:00:00');
      if (latestLogDate > endDate) {
        endDate = latestLogDate;
      }
    }

    // Show 5 days total, latest first
    for (let i = 0; i < 5; i++) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toISOString().split('T')[0],
        day: d.getDate()
      });
    }
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Date Picker (Mini) */}
      <div 
        className="flex bg-[#0A0A0B] p-1 rounded-lg justify-center"
      >
        <div className="flex gap-[5px] w-full">
          {getDays().map((day) => (
            <button 
              key={day.date}
              data-selected={selectedDate === day.date}
              onClick={() => setSelectedDate(day.date)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all border whitespace-nowrap",
                selectedDate === day.date 
                  ? "bg-[#3B82F6] text-white border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                  : "bg-[#151619] text-[#8E9299] border-[#2A2A2E] hover:border-[#3B82F6]/50"
              )}
            >
              <span className="text-[9px] uppercase font-bold tracking-widest leading-none">{day.label}</span>
              <span className="text-sm font-bold leading-none">{day.day}</span>
            </button>
          ))}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-[#151619] border border-[#2A2A2E] relative transition-all hover:border-[#3B82F6]/50">
            <History size={14} className="text-[#3B82F6]" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <span className="text-[8px] font-mono font-bold text-[#8E9299] uppercase">PICK</span>
          </div>
        </div>
      </div>

      {/* Summary Rings / Progress */}
      <div className="bg-[#151619] text-[#E0E0E0] p-6 rounded-lg shadow-2xl relative overflow-hidden border border-[#2A2A2E] border-b-2 border-b-[#3B82F6]">
        <div className="flex justify-between items-end mb-8 relative z-10">
          <div>
            <h3 className="text-3xl font-mono font-bold tracking-tighter">{Math.round(totalMacros.kcal)}</h3>
            <p className="text-[8px] uppercase font-mono text-[#8E9299] tracking-widest mt-1">kcal inbound</p>
          </div>
          <div className="text-right">
            <h3 className="text-3xl font-mono font-bold text-emerald-400 tracking-tighter">{Math.max(0, userProfile.goals.kcal - Math.round(totalMacros.kcal))}</h3>
            <p className="text-[8px] uppercase font-mono text-[#8E9299] tracking-widest mt-1">kcal reserve</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 relative z-10 mb-6 font-mono">
          <MacroProgress label="PROT" current={Math.round(totalMacros.p)} target={userProfile.goals.p} color="bg-[#3B82F6]" />
          <MacroProgress label="CARB" current={Math.round(totalMacros.c)} target={userProfile.goals.c} color="bg-yellow-500" />
          <MacroProgress label="FAT" current={Math.round(totalMacros.f)} target={userProfile.goals.f} color="bg-red-500" />
        </div>
        <div className="grid grid-cols-2 gap-6 relative z-10 border-t border-[#2A2A2E] pt-6 font-mono">
          <MacroProgress label="SUGAR" current={Math.round(totalMacros.sugar)} target={userProfile.goals.sugar || 50} color="bg-orange-500" />
          <MacroProgress label="FIBER" current={Math.round(totalMacros.fiber)} target={userProfile.goals.fiber || 30} color="bg-emerald-500" />
        </div>
      </div>

      {/* Insert intake / Search form at top */}
      <div className="space-y-4">
        {!showHistory ? (
          <button 
            onClick={() => setShowHistory(true)}
            className="w-full py-4 bg-[#151619] border border-[#2A2A2E] rounded-lg flex items-center justify-center gap-2 text-[#3B82F6] font-mono font-bold text-[10px] uppercase tracking-widest shadow-lg hover:border-[#3B82F6] transition-all"
          >
            <Plus size={16} /> Insert Intake Unit
          </button>
        ) : (
          <div className="bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg p-1 space-y-1 animate-in fade-in slide-in-from-top-1">
            <div className="flex justify-between items-center p-3 border-b border-[#2A2A2E] mb-2">
              <h4 className="text-[10px] font-mono font-bold text-[#3B82F6] uppercase tracking-widest px-1">FOOD DATA RETRIEVAL</h4>
              <button 
                onClick={() => {
                  setShowHistory(false);
                  setDbSearchQuery('');
                }}
              >
                <X size={14} className="text-[#8E9299]" />
              </button>
            </div>
            
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" size={12} />
                <input 
                  type="text"
                  placeholder="SEARCH CATALOG..."
                  value={dbSearchQuery}
                  onChange={(e) => setDbSearchQuery(e.target.value)}
                  className="w-full bg-[#151619] border border-[#2A2A2E] rounded py-2 pl-9 pr-3 text-[10px] font-mono text-white focus:border-[#3B82F6] outline-none transition-colors"
                />
              </div>
            </div>
            
            <div className="grid gap-1 max-h-60 overflow-y-auto scrollbar-hide">
              {foodDatabase
                .filter(food => food.name.toLowerCase().includes(dbSearchQuery.toLowerCase()))
                .map(food => (
                <button
                  key={food.id}
                  onClick={() => handleAddFood(food)}
                  className="flex items-center gap-4 p-3 hover:bg-[#151619] text-left transition-colors group"
                >
                  <div className="size-8 bg-[#151619] border border-[#2A2A2E] flex items-center justify-center text-[#3B82F6] group-hover:border-[#3B82F6] rounded transition-colors">
                    {ICON_MAP[food.icon || 'ForkIcon']}
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-mono font-bold text-[#E0E0E0] uppercase tracking-tight">{food.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono text-[#8E9299] uppercase">{food.baseKcal}kcal / {food.baseWeight}g</span>
                      <div className="flex flex-wrap gap-[5px] opacity-60">
                        <span className="text-[7px] font-mono text-[#3B82F6]">P:{food.baseMacros.p}</span>
                        <span className="text-[7px] font-mono text-yellow-500">C:{food.baseMacros.c}</span>
                        <span className="text-[7px] font-mono text-red-500">F:{food.baseMacros.f}</span>
                        {food.baseMacros.sugar !== undefined && (
                          <span className="text-[7px] font-mono text-orange-400">S:{food.baseMacros.sugar}</span>
                        )}
                        {food.baseMacros.fiber !== undefined && (
                          <span className="text-[7px] font-mono text-emerald-400">FB:{food.baseMacros.fiber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Plus size={14} className="text-[#8E9299] group-hover:text-[#3B82F6]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Food List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1 pt-1">
          <h4 className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">
            Logged {selectedDate === getLocalDateString(new Date()) ? 'Today' : selectedDate}
          </h4>
        </div>

        {filteredFoods.map(food => (
          <div key={food.id}>
            <FoodItem 
              name={food.name} 
              quantity={food.quantity} 
              kcal={food.kcal} 
              icon={ICON_MAP[food.icon || 'ForkIcon']} 
              macros={food.macros}
              onDelete={() => handleDeleteLogged(food.id)}
            />
          </div>
        ))}
      </div>

      {/* Adjust Weight Modal/Overlay */}
      {selectedFood && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#151619] border border-[#2A2A2E] rounded-lg w-full max-w-xs overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#2A2A2E]">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 bg-[#0A0A0B] border border-[#2A2A2E] flex items-center justify-center text-[#3B82F6] rounded">
                  {ICON_MAP[selectedFood.icon || 'ForkIcon']}
                </div>
                <div>
                  <h4 className="text-sm font-mono font-bold text-white uppercase">{selectedFood.name}</h4>
                  <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">Adjust Quantity</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">Weight (g)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-3 text-white font-mono focus:border-[#3B82F6] outline-none text-center text-xl font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8E9299]">g</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0B] p-4 rounded border border-[#2A2A2E] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[#8E9299] uppercase">Total kcal:</span>
                    <span className="text-xl font-mono font-bold text-[#3B82F6] italic">
                      {Math.round(selectedFood.baseKcal * (weight / selectedFood.baseWeight))}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-[#2A2A2E] pt-3">
                    <div className="text-center">
                      <p className="text-[7px] font-mono text-[#8E9299] uppercase">Protein</p>
                      <p className="text-xs font-mono font-bold text-[#3B82F6]">{(selectedFood.baseMacros.p * (weight / selectedFood.baseWeight)).toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[7px] font-mono text-[#8E9299] uppercase">Carbs</p>
                      <p className="text-xs font-mono font-bold text-yellow-500">{(selectedFood.baseMacros.c * (weight / selectedFood.baseWeight)).toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[7px] font-mono text-[#8E9299] uppercase">Fat</p>
                      <p className="text-xs font-mono font-bold text-red-500">{(selectedFood.baseMacros.f * (weight / selectedFood.baseWeight)).toFixed(1)}g</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-[#2A2A2E]/50 pt-2">
                    <div className="text-center">
                      <p className="text-[7px] font-mono text-[#8E9299] uppercase">Sugar</p>
                      <p className="text-xs font-mono font-bold text-orange-400">{((selectedFood.baseMacros.sugar || 0) * (weight / selectedFood.baseWeight)).toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[7px] font-mono text-[#8E9299] uppercase">Fiber</p>
                      <p className="text-xs font-mono font-bold text-emerald-400">{((selectedFood.baseMacros.fiber || 0) * (weight / selectedFood.baseWeight)).toFixed(1)}g</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-[#0A0A0B] flex gap-2">
              <button 
                onClick={() => setSelectedFood(null)}
                className="flex-1 py-3 text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest hover:text-white transition-colors text-center"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAdd}
                className="flex-1 py-3 bg-[#3B82F6] text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded shadow-lg shadow-blue-500/20 text-center"
              >
                LOG DATA
              </button>
            </div>
          </div>
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

interface FoodItemProps {
  name: string;
  quantity: string;
  kcal: number;
  icon: React.ReactNode;
  macros?: { p: number, c: number, f: number, sugar?: number, fiber?: number };
  onDelete?: () => void;
}

function FoodItem({ name, quantity, kcal, icon, macros, onDelete }: FoodItemProps) {
  return (
    <div className="bg-[#151619] p-4 border-l-2 border-l-[#2A2A2E] hover:border-l-[#3B82F6] rounded border border-[#2A2A2E] flex items-center gap-4 group transition-all">
      <div className="size-10 bg-[#0A0A0B] border border-[#2A2A2E] flex items-center justify-center text-[#3B82F6] transition-colors rounded">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-xs font-mono font-bold text-[#E0E0E0] uppercase tracking-tight">{name}</h4>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-[9px] font-mono font-bold text-[#8E9299] uppercase">MASS: {quantity}</p>
          {macros && (
            <div className="flex flex-wrap gap-2">
              <span className="text-[7px] font-mono text-[#3B82F6]">P:{macros.p}</span>
              <span className="text-[7px] font-mono text-yellow-500">C:{macros.c}</span>
              <span className="text-[7px] font-mono text-red-500">F:{macros.f}</span>
              {macros.sugar !== undefined && (
                <span className="text-[7px] font-mono text-orange-400">S:{macros.sugar}</span>
              )}
              {macros.fiber !== undefined && (
                <span className="text-[7px] font-mono text-emerald-400">FB:{macros.fiber}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-right flex items-center gap-4">
        <div>
          <span className="text-sm font-mono font-bold text-[#E0E0E0] italic">{kcal}</span>
          <p className="text-[8px] font-mono text-[#8E9299] uppercase tracking-tighter">KCAL</p>
        </div>
        {onDelete && (
          <button 
            onClick={onDelete}
            className="p-2 text-[#8E9299] hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
