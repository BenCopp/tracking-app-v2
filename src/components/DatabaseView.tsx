import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Dumbbell, Plus, Search, Edit2, Trash2, X, CheckCircle2, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { Food, WorkoutPlan, ExerciseEntry } from '../types';
import FoodDatabaseView from './FoodDatabaseView';
import { addDocument, updateDocument, deleteDocument } from '../lib/firestore';
import { auth } from '../lib/firebase';

interface DatabaseViewProps {
  foodDatabase: Food[];
  setFoodDatabase: React.Dispatch<React.SetStateAction<Food[]>>;
  workoutPlans: WorkoutPlan[];
  setWorkoutPlans: React.Dispatch<React.SetStateAction<WorkoutPlan[]>>;
  exerciseTemplates: ExerciseEntry[];
  setExerciseTemplates: React.Dispatch<React.SetStateAction<ExerciseEntry[]>>;
  setHeaderAction: (node: React.ReactNode) => void;
}

type SubTab = 'food' | 'workout';

export default function DatabaseView({
  foodDatabase,
  setFoodDatabase,
  workoutPlans,
  setWorkoutPlans,
  exerciseTemplates,
  setExerciseTemplates,
  setHeaderAction
}: DatabaseViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('food');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isAddingFood, setIsAddingFood] = useState(false);
  
  // State for workout plan editing
  const [editingPlanName, setEditingPlanName] = useState(false);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [isSearchingEx, setIsSearchingEx] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [customExName, setCustomExName] = useState('');

  const currentPlan = workoutPlans.find(p => p.id === selectedPlanId);

  const handleCreateCustomEx = (name: string) => {
    if (!name.trim() || !currentPlan) return;
    
    // Check if a template with this name already exists
    const existing = exerciseTemplates.find(e => e.name.toLowerCase() === name.trim().toLowerCase());
    
    if (existing) {
      if (!currentPlan.exerciseIds.includes(existing.id)) {
        if (auth.currentUser) {
          updateDocument('plans', currentPlan.id, { 
            exerciseIds: [...currentPlan.exerciseIds, existing.id] 
          });
        } else {
          setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? { 
            ...p, 
            exerciseIds: [...p.exerciseIds, existing.id] 
          } : p));
        }
      }
      setCustomExName('');
      return;
    }

    const newExData = { 
      name: name.trim(), 
      category: 'Custom' 
    };
    if (auth.currentUser) {
      addDocument('exercise_templates', newExData).then(id => {
        if (id) {
          updateDocument('plans', currentPlan.id, { 
            exerciseIds: [...currentPlan.exerciseIds, id] 
          });
        }
      });
    } else {
      const newEx = {
        id: Math.random().toString(36).substr(2, 9),
        ...newExData
      };
      setExerciseTemplates(prev => [...prev, newEx]);
      setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? { 
        ...p, 
        exerciseIds: [...p.exerciseIds, newEx.id] 
      } : p));
    }
    setCustomExName('');
  };

  const createGroup = () => {
    const newPlanData = {
      name: 'NEW WORKOUT GROUP',
      exerciseIds: []
    };
    
    if (auth.currentUser) {
      addDocument('plans', newPlanData).then(id => {
        if (id) setSelectedPlanId(id);
      });
    } else {
      const newPlan: WorkoutPlan = {
        id: Math.random().toString(36).substr(2, 9),
        ...newPlanData
      };
      setWorkoutPlans([...workoutPlans, newPlan]);
      setSelectedPlanId(newPlan.id);
    }
    setIsEditingPlan(true);
  };

  React.useEffect(() => {
    if (activeSubTab === 'workout') {
      if (isEditingPlan && currentPlan) {
        setHeaderAction(
          <button 
            onClick={() => setIsEditingPlan(false)}
            className="p-2 bg-[#151619] border border-[#2A2A2E] rounded text-[#8E9299] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        );
      } else {
        setHeaderAction(
          <button 
            onClick={createGroup}
            className="flex items-center justify-center p-2 bg-[#3B82F6] text-white rounded hover:bg-[#3B82F6]/90 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
          >
            <Plus size={18} />
          </button>
        );
      }
    } else {
      setHeaderAction(
        <button 
          onClick={() => setIsAddingFood(true)}
          className="bg-[#3B82F6] text-white p-2.5 rounded shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus size={18} />
        </button>
      );
    }
    return () => setHeaderAction(null);
  }, [activeSubTab, isEditingPlan, currentPlan, setHeaderAction]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex bg-[#0A0A0B] p-1 rounded-xl border border-[#2A2A2E]">
        <button 
          onClick={() => { setActiveSubTab('food'); setIsEditingPlan(false); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono font-bold transition-all",
            activeSubTab === 'food' ? "bg-[#151619] text-white shadow-lg" : "text-[#8E9299] hover:text-white"
          )}
        >
          <Utensils size={14} /> FOOD INDEX
        </button>
        <button 
          onClick={() => setActiveSubTab('workout')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono font-bold transition-all",
            activeSubTab === 'workout' ? "bg-[#151619] text-white shadow-lg" : "text-[#8E9299] hover:text-white"
          )}
        >
          <Dumbbell size={14} /> WORKOUT SETS
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'food' && (
          <motion.div
            key="food"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <FoodDatabaseView 
              foodDatabase={foodDatabase} 
              setFoodDatabase={setFoodDatabase} 
              isAdding={isAddingFood}
              setIsAdding={setIsAddingFood}
            />
          </motion.div>
        )}

        {activeSubTab === 'workout' && (
          <motion.div
            key="workout"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {!isEditingPlan ? (
              <div className="grid gap-3">
                {workoutPlans.map(plan => (
                  <button 
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setIsEditingPlan(true);
                    }}
                    className="group bg-[#151619] border border-[#2A2A2E] p-5 rounded-xl flex items-center justify-between hover:border-[#3B82F6]/50 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg flex items-center justify-center text-[#8E9299] group-hover:text-[#3B82F6] transition-colors">
                        <Dumbbell size={20} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-mono font-bold text-white uppercase group-hover:text-[#3B82F6] transition-colors">{plan.name}</h4>
                        <p className="text-[9px] font-mono text-[#8E9299] uppercase tracking-widest mt-1">
                          {plan.exerciseIds.length} NODES STORED
                        </p>
                      </div>
                    </div>
                    <History size={16} className="text-[#2A2A2E] group-hover:text-[#3B82F6] transition-colors" />
                  </button>
                ))}
                {workoutPlans.length === 0 && (
                  <div className="text-center py-20 border border-dashed border-[#2A2A2E] rounded-xl">
                    <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">No Workout Groups Defined</p>
                    <button 
                      onClick={createGroup}
                      className="mt-4 text-[#3B82F6] text-xs font-mono font-bold hover:underline"
                    >
                      + INITIALIZE NEW GROUP
                    </button>
                  </div>
                )}
              </div>
            ) : currentPlan && (
              <div className="space-y-6">
                {/* Rename Group */}
                <div className="bg-[#151619] border border-[#2A2A2E] rounded-xl p-4">
                  <label className="text-[8px] font-mono text-[#2A2A2E] uppercase mb-1 block">SCHEMA ID</label>
                  {editingPlanName ? (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => {
                          if (tempName.trim()) {
                            if (auth.currentUser) {
                              updateDocument('plans', currentPlan.id, { name: tempName });
                            } else {
                              setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? { ...p, name: tempName } : p));
                            }
                          }
                          setEditingPlanName(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (tempName.trim()) {
                              if (auth.currentUser) {
                                updateDocument('plans', currentPlan.id, { name: tempName });
                              } else {
                                setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? { ...p, name: tempName } : p));
                              }
                            }
                            setEditingPlanName(false);
                          }
                        }}
                        className="flex-1 bg-[#0A0A0B] border border-[#3B82F6] rounded px-3 py-2 text-xs font-mono text-white outline-none"
                      />
                      <button className="text-[#3B82F6]"><CheckCircle2 size={18} /></button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setEditingPlanName(true);
                        setTempName(currentPlan.name);
                      }}
                      className="flex items-center justify-between cursor-pointer group"
                    >
                      <h3 className="text-lg font-mono font-black text-white uppercase group-hover:text-[#3B82F6] transition-colors">
                        {currentPlan.name}
                      </h3>
                      <Edit2 size={14} className="text-[#2A2A2E] group-hover:text-[#3B82F6]" />
                    </div>
                  )}
                </div>

                {/* Exercise List */}
                <div className="space-y-2">
                  <label className="text-[8px] font-mono text-[#8E9299] uppercase tracking-widest ml-1 mb-2 block">CHILD NODES</label>
                  {currentPlan.exerciseIds.map((exId, idx) => {
                    const ex = exerciseTemplates.find(t => t.id === exId);
                    return (
                      <div key={`${exId}-${idx}`} className="bg-[#151619] border border-[#2A2A2E] p-3 rounded-lg flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-[10px] font-mono text-[#2A2A2E]">[{idx + 1}]</span>
                          {editingExId === exId ? (
                            <input 
                              type="text"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              onBlur={() => {
                                if (tempName.trim()) {
                                  if (auth.currentUser) {
                                    updateDocument('exercise_templates', exId, { name: tempName });
                                  } else {
                                    setExerciseTemplates(prev => prev.map(t => t.id === exId ? { ...t, name: tempName } : t));
                                  }
                                }
                                setEditingExId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (tempName.trim()) {
                                    if (auth.currentUser) {
                                      updateDocument('exercise_templates', exId, { name: tempName });
                                    } else {
                                      setExerciseTemplates(prev => prev.map(t => t.id === exId ? { ...t, name: tempName } : t));
                                    }
                                  }
                                  setEditingExId(null);
                                }
                              }}
                              className="flex-1 bg-[#0A0A0B] border border-[#3B82F6] rounded px-2 py-0.5 text-xs font-mono text-white outline-none"
                            />
                          ) : (
                            <p 
                              onClick={() => {
                                setEditingExId(exId);
                                setTempName(ex?.name || '');
                              }}
                              className="text-xs font-mono font-bold text-white uppercase cursor-pointer hover:text-[#3B82F6]"
                            >
                              {ex?.name || 'UNKNOWN NODE'}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const updatedIds = currentPlan.exerciseIds.filter((_, i) => i !== idx);
                              if (auth.currentUser) {
                                updateDocument('plans', currentPlan.id, { exerciseIds: updatedIds });
                              } else {
                                setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? {
                                  ...p,
                                  exerciseIds: updatedIds
                                } : p));
                              }
                            }}
                            className="p-1 text-[#2A2A2E] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2">
                    {!isSearchingEx ? (
                      <button 
                        onClick={() => setIsSearchingEx(true)}
                        className="w-full py-3 border border-dashed border-[#2A2A2E] rounded-xl text-[#3B82F6] font-mono font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-[#3B82F6]/5 transition-all"
                      >
                        <Plus size={14} />
                        LINK EXERCISE DATA
                      </button>
                    ) : (
                      <div className="bg-[#0A0A0B] border border-[#2A2A2E] rounded-xl p-3 space-y-3">
                        <div className="flex gap-2 mb-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" size={14} />
                            <input 
                              type="text"
                              placeholder="FILTER OR CREATE NODE..."
                              value={exSearch}
                              onChange={(e) => setExSearch(e.target.value)}
                              className="w-full bg-[#151619] border border-[#2A2A2E] rounded-lg py-2 pl-9 pr-3 text-[10px] font-mono text-white focus:border-[#3B82F6] outline-none"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => { 
                              setIsSearchingEx(false); 
                              setExSearch(''); 
                            }} 
                            className="p-2 bg-[#151619] border border-[#2A2A2E] rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto pr-1 custom-scrollbar space-y-4">
                          {exSearch ? (
                            <div className="space-y-1">
                              {/* Create New Option */}
                              {!exerciseTemplates.some(e => e.name.toLowerCase() === exSearch.toLowerCase()) && (
                                <button 
                                  onClick={() => {
                                    const newExData = { 
                                      name: exSearch.trim(), 
                                      category: 'Custom' 
                                    };
                                    if (auth.currentUser) {
                                      addDocument('exercise_templates', newExData).then(id => {
                                        if (id) {
                                          updateDocument('plans', currentPlan.id, { 
                                            exerciseIds: [...currentPlan.exerciseIds, id] 
                                          });
                                        }
                                      });
                                    } else {
                                      const newEx = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        ...newExData
                                      };
                                      setExerciseTemplates(prev => [...prev, newEx]);
                                      setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? { 
                                        ...p, 
                                        exerciseIds: [...p.exerciseIds, newEx.id] 
                                      } : p));
                                    }
                                    setExSearch('');
                                  }}
                                  className="w-full p-4 border border-dashed border-[#3B82F6] bg-[#3B82F6]/5 rounded-xl text-[#3B82F6] text-[10px] font-mono uppercase font-bold text-center hover:bg-[#3B82F6]/10 transition-all mb-2"
                                >
                                  + INITIALIZE "{exSearch.toUpperCase()}" AS NEW NODE
                                </button>
                              )}

                              {exerciseTemplates
                                .filter(e => e.name.toLowerCase().includes(exSearch.toLowerCase()))
                                .map(ex => (
                                  <button 
                                    key={ex.id}
                                    onClick={() => {
                                      if (!currentPlan.exerciseIds.includes(ex.id)) {
                                        if (auth.currentUser) {
                                          updateDocument('plans', currentPlan.id, { 
                                            exerciseIds: [...currentPlan.exerciseIds, ex.id] 
                                          });
                                        } else {
                                          setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? { 
                                            ...p, 
                                            exerciseIds: [...p.exerciseIds, ex.id] 
                                          } : p));
                                        }
                                      }
                                      setExSearch('');
                                    }}
                                    className={cn(
                                      "w-full p-3 rounded-lg border text-left flex justify-between items-center group font-mono transition-all",
                                      currentPlan.exerciseIds.includes(ex.id)
                                        ? "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]"
                                        : "bg-[#151619] border-[#2A2A2E] hover:border-[#3B82F6]/50 text-white"
                                    )}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-bold">{ex.name}</span>
                                      <span className="text-[7px] text-[#8E9299] uppercase">{ex.category}</span>
                                    </div>
                                    {currentPlan.exerciseIds.includes(ex.id) ? (
                                      <CheckCircle2 size={14} />
                                    ) : (
                                      <Plus size={14} className="text-[#3B82F6]" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-[#151619] border border-[#2A2A2E] p-4 rounded-xl space-y-3">
                                <label className="text-[8px] font-mono font-bold text-[#8E9299] uppercase tracking-widest block">INITIALIZE CUSTOM NODE</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    placeholder="NODE NAME..."
                                    value={customExName}
                                    onChange={(e) => setCustomExName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && customExName.trim()) {
                                        handleCreateCustomEx(customExName);
                                      }
                                    }}
                                    className="flex-1 bg-[#0A0A0B] border border-[#2A2A2E] rounded px-3 py-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none transition-colors"
                                  />
                                  <button
                                    onClick={() => {
                                      if (customExName.trim()) {
                                        handleCreateCustomEx(customExName);
                                      }
                                    }}
                                    className="px-4 bg-[#3B82F6] text-white rounded text-[10px] font-mono font-bold uppercase hover:bg-[#3B82F6]/90 transition-all active:scale-95"
                                  >
                                    CREATE
                                  </button>
                                </div>
                              </div>

                              {Array.from(new Set(exerciseTemplates.map(e => e.category))).sort().map(cat => (
                                <div key={cat} className="space-y-2">
                                  <h5 className="text-[8px] font-mono text-[#2A2A2E] uppercase font-bold tracking-widest px-1">{cat}</h5>
                                  <div className="grid grid-cols-1 gap-1">
                                    {exerciseTemplates.filter(e => e.category === cat).map(ex => (
                                      <button 
                                        key={ex.id}
                                        onClick={() => {
                                          if (auth.currentUser) {
                                            updateDocument('plans', currentPlan.id, { 
                                              exerciseIds: [...currentPlan.exerciseIds, ex.id] 
                                            });
                                          } else {
                                            setWorkoutPlans(prev => prev.map(p => p.id === currentPlan.id ? { ...p, exerciseIds: [...p.exerciseIds, ex.id] } : p));
                                          }
                                        }}
                                        className={cn(
                                          "w-full p-3 rounded-lg border text-left flex justify-between items-center transition-all group",
                                          currentPlan.exerciseIds.includes(ex.id) 
                                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]"
                                            : "bg-[#151619] border-[#2A2A2E] hover:border-[#3B82F6]/50 text-[#8E9299] hover:text-white"
                                        )}
                                      >
                                        <span className="text-[10px] font-mono uppercase">{ex.name}</span>
                                        {currentPlan.exerciseIds.includes(ex.id) ? (
                                          <CheckCircle2 size={12} />
                                        ) : (
                                          <Plus size={12} className="opacity-0 group-hover:opacity-100" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#2A2A2E]">
                  <button 
                    onClick={() => {
                      if (auth.currentUser) {
                        deleteDocument('plans', currentPlan.id);
                      } else {
                        setWorkoutPlans(prev => prev.filter(p => p.id !== currentPlan.id));
                      }
                      setIsEditingPlan(false);
                    }}
                    className="w-full py-2 text-[9px] font-mono text-red-400/50 hover:text-red-400 uppercase font-bold transition-colors"
                  >
                    PURGE GROUP FILES
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
