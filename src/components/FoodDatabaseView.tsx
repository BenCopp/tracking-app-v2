import React, { useState } from 'react';
import { Plus, Search, Beef, Utensils as ForkIcon, Coffee, Trash2, Edit2, X, Save, Calendar, ArrowRight, Salad, Apple, Carrot } from 'lucide-react';
import { cn } from '../lib/utils';
import { Food, LoggedFood } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { addDocument, updateDocument, deleteDocument } from '../lib/firestore';
import { auth } from '../lib/firebase';

const ICON_OPTIONS = [
  { name: 'Meat', icon: <Beef size={16} /> },
  { name: 'Veggie', icon: <Salad size={16} /> },
  { name: 'Fruit', icon: <Apple size={16} /> },
  { name: 'Carrot', icon: <Carrot size={16} /> },
  { name: 'ForkIcon', icon: <ForkIcon size={16} /> },
  { name: 'Coffee', icon: <Coffee size={16} /> },
];

const ICON_MAP: Record<string, any> = {
  'Beef': <Beef size={18} />,
  'Meat': <Beef size={18} />,
  'Veggie': <Salad size={18} />,
  'Fruit': <Apple size={18} />,
  'Carrot': <Carrot size={18} />,
  'ForkIcon': <ForkIcon size={18} />,
  'Coffee': <Coffee size={18} />,
};

interface FoodDatabaseViewProps {
  foodDatabase: Food[];
  setFoodDatabase: React.Dispatch<React.SetStateAction<Food[]>>;
  isAdding: boolean;
  setIsAdding: (val: boolean) => void;
}

const sanitizeForFirestore = (obj: any): any => {
  const clean = (item: any): any => {
    if (Array.isArray(item)) {
      return item.map(clean).filter(v => v !== undefined);
    }
    if (item !== null && typeof item === 'object') {
      const res: any = {};
      for (const key in item) {
        if (item[key] !== undefined) {
          res[key] = clean(item[key]);
        }
      }
      return res;
    }
    return item;
  };
  return clean(obj);
};

export default function FoodDatabaseView({ foodDatabase, setFoodDatabase, isAdding, setIsAdding }: FoodDatabaseViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFood, setEditingFood] = useState<Food | null>(null);

  const filteredFoods = foodDatabase.filter(food => 
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (auth.currentUser) {
      deleteDocument('food_database', id);
    } else {
      setFoodDatabase(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleSave = (food: Food) => {
    const sanitizedFood = sanitizeForFirestore(food);
    if (editingFood) {
      if (auth.currentUser) {
        const { id, ...data } = sanitizedFood;
        updateDocument('food_database', id, data);
      } else {
        setFoodDatabase(prev => prev.map(f => f.id === food.id ? sanitizedFood : f));
      }
      setEditingFood(null);
    } else {
      if (auth.currentUser) {
        addDocument('food_database', sanitizedFood);
      } else {
        setFoodDatabase(prev => [...prev, sanitizedFood]);
      }
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" size={14} />
        <input 
          type="text"
          placeholder="FILTER INVENTORY..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#151619] border border-[#2A2A2E] rounded-lg py-3 pl-10 pr-4 text-xs font-mono text-white focus:border-[#3B82F6] outline-none transition-colors"
        />
      </div>

      <div className="grid gap-3 pb-8">
        {filteredFoods.map(food => (
          <div 
            key={food.id}
            className="bg-[#151619] p-4 rounded-lg border border-[#2A2A2E] flex items-center gap-4 group"
          >
            <div className="size-12 bg-[#0A0A0B] border border-[#2A2A2E] flex items-center justify-center text-[#3B82F6] rounded">
              {ICON_MAP[food.icon] || <ForkIcon size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-mono font-bold text-white uppercase truncate">{food.name}</h4>
                {food.isRecipe && (
                  <span className="bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[6.5px] font-mono px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">RECIPE</span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[8px] font-mono uppercase text-[#8E9299]">
                <span>{food.baseKcal}kcal</span>
                <span>/</span>
                <span>{food.baseWeight}g</span>
                <div className="flex flex-wrap gap-1.5 items-center ml-2 border-l border-[#2A2A2E] pl-3">
                  <span className="text-[#3B82F6]">P:{food.baseMacros.p}</span>
                  <span className="text-yellow-500">C:{food.baseMacros.c}</span>
                  <span className="text-red-400">F:{food.baseMacros.f}</span>
                  {food.baseMacros.sugar !== undefined && (
                    <span className="text-orange-400">S:{food.baseMacros.sugar}</span>
                  )}
                  {food.baseMacros.fiber !== undefined && (
                    <span className="text-emerald-400">FB:{food.baseMacros.fiber}</span>
                  )}
                </div>
              </div>
              {food.isRecipe && food.ingredients && food.ingredients.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-[#2A2A2E]/40 flex flex-wrap gap-1.5">
                  {food.ingredients.map((ing, idx) => {
                    const ingDetail = foodDatabase.find(fd => fd.id === ing.foodId);
                    return ingDetail ? (
                      <span key={idx} className="bg-[#0A0A0B] border border-[#2A2A2E] text-[7.5px] text-[#8E9299] px-1.5 py-0.5 rounded font-mono uppercase">
                        {ingDetail.name} ({ing.weight}g)
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setEditingFood(food)}
                className="p-2 text-[#8E9299] hover:text-[#3B82F6] transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => handleDelete(food.id)}
                className="p-2 text-[#8E9299] hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {(isAdding || editingFood) && (
          <FoodModal 
            food={editingFood || undefined} 
            foodDatabase={foodDatabase}
            onClose={() => {
              setIsAdding(false);
              setEditingFood(null);
            }} 
            onSave={handleSave} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FoodModal({ food, foodDatabase, onClose, onSave }: { food?: Food, foodDatabase: Food[], onClose: () => void, onSave: (f: Food) => void }) {
  const [name, setName] = useState(food?.name || '');
  const [isRecipe, setIsRecipe] = useState(food?.isRecipe || false);
  const [recipeIngredients, setRecipeIngredients] = useState<{ foodId: string; weight: number }[]>(food?.ingredients || []);
  
  // Standard entry attributes
  const [weight, setWeight] = useState(food?.baseWeight || 100);
  const [kcal, setKcal] = useState(food?.baseKcal || 0);
  const [p, setP] = useState(food?.baseMacros.p || 0);
  const [c, setC] = useState(food?.baseMacros.c || 0);
  const [f, setF] = useState(food?.baseMacros.f || 0);
  const [sugar, setSugar] = useState(food?.baseMacros.sugar || 0);
  const [fiber, setFiber] = useState(food?.baseMacros.fiber || 0);
  const [icon, setIcon] = useState(food?.icon || 'ForkIcon');

  // Ingredient picker temp states
  const [selectedIngId, setSelectedIngId] = useState('');
  const [selectedIngWeight, setSelectedIngWeight] = useState(100);
  const [ingSearch, setIngSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const updateCalories = (prot: number, carb: number, fat: number) => {
    setKcal(Math.round((prot * 4) + (carb * 4) + (fat * 9)));
  };

  const handleMacroChange = (field: 'p' | 'c' | 'f', value: number) => {
    if (field === 'p') {
      setP(value);
      updateCalories(value, c, f);
    } else if (field === 'c') {
      setC(value);
      updateCalories(p, value, f);
    } else if (field === 'f') {
      setF(value);
      updateCalories(p, c, value);
    }
  };

  // Compute live stats for recipes
  const computedRecipeStats = React.useMemo(() => {
    if (!isRecipe) return null;
    let totalWeight = 0;
    let totalKcal = 0;
    let totalP = 0;
    let totalC = 0;
    let totalF = 0;
    let totalSugar = 0;
    let totalFiber = 0;

    recipeIngredients.forEach(ri => {
      const ingFood = foodDatabase.find(fd => fd.id === ri.foodId);
      if (ingFood) {
        const ratio = ri.weight / ingFood.baseWeight;
        totalWeight += ri.weight;
        totalKcal += ingFood.baseKcal * ratio;
        totalP += ingFood.baseMacros.p * ratio;
        totalC += ingFood.baseMacros.c * ratio;
        totalF += ingFood.baseMacros.f * ratio;
        totalSugar += (ingFood.baseMacros.sugar || 0) * ratio;
        totalFiber += (ingFood.baseMacros.fiber || 0) * ratio;
      }
    });

    return {
      baseWeight: Math.round(totalWeight) || 100,
      baseKcal: Math.round(totalKcal),
      baseMacros: {
        p: Number(totalP.toFixed(1)),
        c: Number(totalC.toFixed(1)),
        f: Number(totalF.toFixed(1)),
        sugar: Number(totalSugar.toFixed(1)),
        fiber: Number(totalFiber.toFixed(1))
      }
    };
  }, [isRecipe, recipeIngredients, foodDatabase]);

  const handleAddIngredient = () => {
    if (!selectedIngId) return;
    const existingIdx = recipeIngredients.findIndex(ri => ri.foodId === selectedIngId);
    if (existingIdx > -1) {
      const updated = [...recipeIngredients];
      updated[existingIdx].weight += Number(selectedIngWeight);
      setRecipeIngredients(updated);
    } else {
      setRecipeIngredients([...recipeIngredients, { foodId: selectedIngId, weight: Number(selectedIngWeight) }]);
    }
    // reset selection
    setSelectedIngId('');
    setSelectedIngWeight(100);
    setIngSearch('');
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleUpdateIngredientWeight = (index: number, newWeight: number) => {
    const updated = [...recipeIngredients];
    updated[index].weight = Math.max(1, newWeight);
    setRecipeIngredients(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalWeight = isRecipe && computedRecipeStats ? computedRecipeStats.baseWeight : Number(weight);
    const finalKcal = isRecipe && computedRecipeStats ? computedRecipeStats.baseKcal : Number(kcal);
    const finalMacros = isRecipe && computedRecipeStats ? computedRecipeStats.baseMacros : {
      p: Number(p),
      c: Number(c),
      f: Number(f),
      sugar: Number(sugar),
      fiber: Number(fiber)
    };

    onSave({
      id: food?.id || Math.random().toString(),
      name,
      baseWeight: finalWeight,
      baseKcal: finalKcal,
      baseMacros: finalMacros,
      icon,
      isRecipe,
      ingredients: isRecipe ? recipeIngredients : undefined
    });
  };

  // Exclude current food being edited to prevent loop
  const dropDownFoods = foodDatabase.filter(f => !food || f.id !== food.id);

  const filteredIngredients = React.useMemo(() => {
    if (!ingSearch.trim()) return dropDownFoods;
    const query = ingSearch.toLowerCase().trim();
    return dropDownFoods.filter(f => f.name.toLowerCase().includes(query));
  }, [dropDownFoods, ingSearch]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#151619] border border-[#2A2A2E] rounded-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-5 border-b border-[#2A2A2E] flex justify-between items-center bg-[#151619] shrink-0">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-tight">
            {food ? 'RECONFIGURE ENTRY' : 'NEW DATA NODE'}
          </h3>
          <button onClick={onClose} type="button" className="p-1.5 hover:bg-[#2A2A2E] rounded-md transition-colors">
            <X size={16} className="text-[#8E9299]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {/* Node mode switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0A0A0B] border border-[#2A2A2E] rounded-lg">
            <button
              type="button"
              onClick={() => setIsRecipe(false)}
              className={cn(
                "py-1.5 text-[9px] font-mono font-bold uppercase rounded transition-all",
                !isRecipe ? "bg-[#151619] text-[#3B82F6] shadow-sm border border-[#2A2A2E]" : "text-[#8E9299] hover:text-white"
              )}
            >
              Standard Food
            </button>
            <button
              type="button"
              onClick={() => setIsRecipe(true)}
              className={cn(
                "py-1.5 text-[9px] font-mono font-bold uppercase rounded transition-all",
                isRecipe ? "bg-[#151619] text-orange-400 shadow-sm border border-[#2A2A2E]" : "text-[#8E9299] hover:text-white"
              )}
            >
              Recipe Composter
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">
              {isRecipe ? 'RECIPE IDENTIFIER' : 'FOOD IDENTIFIER'}
            </label>
            <input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2.5 text-xs font-mono text-white focus:border-[#3B82F6] outline-none uppercase"
              placeholder={isRecipe ? "e.g. GNOCCHI CARBONARA DISH" : "e.g. GRILLED SALMON"}
            />
          </div>

          {isRecipe ? (
            /* RECIPE COMPOSER WORKFLOW */
            <div className="space-y-4 border-t border-[#2A2A2E]/50 pt-4">
              <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest block">COMPOSING INGREDIENTS</label>
              
              {/* Active list inside recipe */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {recipeIngredients.map((ri, index) => {
                  const ingFood = foodDatabase.find(fd => fd.id === ri.foodId);
                  if (!ingFood) return null;
                  const ratio = ri.weight / ingFood.baseWeight;
                  const ingKcal = Math.round(ingFood.baseKcal * ratio);
                  return (
                    <div key={ri.foodId} className="flex items-center justify-between gap-3 bg-[#0A0A0B] border border-[#2A2A2E] p-2.5 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono font-bold text-white uppercase truncate">{ingFood.name}</p>
                        <p className="text-[8px] font-mono text-[#8E9299]">{ingKcal} kcal ({ri.weight}g)</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number"
                          value={ri.weight}
                          onChange={(e) => handleUpdateIngredientWeight(index, Number(e.target.value))}
                          className="w-16 bg-[#151619] border border-[#2A2A2E] rounded px-1.5 py-1 text-center text-xs text-white focus:border-[#3B82F6] outline-none font-mono"
                        />
                        <span className="text-[9px] font-mono text-[#8E9299] uppercase pr-2">G</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="text-[#8E9299] hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {recipeIngredients.length === 0 && (
                  <p className="text-[10px] font-mono text-center text-[#8E9299] py-4 bg-[#0A0A0B] border border-dashed border-[#2A2A2E] rounded uppercase">Empty Recipe. Pick ingredients below.</p>
                )}
              </div>

              {/* Add new ingredient box */}
              <div className="grid gap-2 p-3 bg-[#0A0A0B] border border-[#2A2A2E]/80 rounded-lg">
                <span className="text-[7.5px] font-mono font-bold text-orange-400 uppercase tracking-widest block">SEARCH & ATTACH INGREDIENT</span>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3 relative">
                    <input
                      type="text"
                      placeholder="TYPE TO SEARCH..."
                      value={ingSearch}
                      onChange={(e) => {
                        setIngSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full bg-[#151619] border border-[#2A2A2E] rounded px-2.5 py-1.5 text-xs text-white focus:border-[#3B82F6] outline-none font-mono uppercase truncate"
                    />
                    {showDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#111214] border border-[#2A2A2E] rounded shadow-2xl z-20 scrollbar-thin">
                          {filteredIngredients.length > 0 ? (
                            filteredIngredients.map(f => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setSelectedIngId(f.id);
                                  setIngSearch(f.name);
                                  setShowDropdown(false);
                                }}
                                className={cn(
                                  "w-full text-left px-2.5 py-2 text-[10px] font-mono uppercase transition-colors hover:bg-[#3B82F6]/10 hover:text-white border-b border-[#2A2A2E]/30 last:border-b-0",
                                  selectedIngId === f.id ? "text-[#3B82F6] bg-[#3B82F6]/5" : "text-[#8E9299]"
                                )}
                              >
                                <div className="font-bold truncate">{f.name}</div>
                                <div className="text-[8px] opacity-60 mt-0.5">{f.baseKcal}kcal / {f.baseWeight}g</div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-[10px] font-mono text-[#8E9299] uppercase text-center">No matches</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="MASS"
                    value={selectedIngWeight}
                    onChange={(e) => setSelectedIngWeight(Number(e.target.value))}
                    className="col-span-2 bg-[#151619] border border-[#2A2A2E] rounded px-2 py-1.5 text-xs text-white text-center focus:border-[#3B82F6] outline-none font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="w-full py-1.5 bg-[#151619] hover:bg-[#2A2A2E] border border-[#2A2A2E] text-white text-[9px] font-mono font-bold uppercase transition-all rounded"
                >
                  + ATTACH DISH COMPONENT
                </button>
              </div>

              {/* Live calculated results preview */}
              {computedRecipeStats && (
                <div className="bg-[#10b981]/5 border border-[#10b981]/15 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-[#10b981]/10">
                    <span className="text-[9px] font-mono font-bold text-[#10b981] uppercase tracking-widest">LIVE RECIPE CALCULATOR</span>
                    <span className="bg-[#10b981]/25 text-[#10b981] font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {computedRecipeStats.baseWeight}g
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <p className="text-[8px] text-[#8E9299]">TOTAL ENERGY</p>
                      <p className="text-white font-bold">{computedRecipeStats.baseKcal} kcal</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <p className="text-[7px] text-[#3B82F6]">P</p>
                        <p className="text-white font-bold text-[11px]">{computedRecipeStats.baseMacros.p}g</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-yellow-500">C</p>
                        <p className="text-white font-bold text-[11px]">{computedRecipeStats.baseMacros.c}g</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-red-500">F</p>
                        <p className="text-white font-bold text-[11px]">{computedRecipeStats.baseMacros.f}g</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-[#10b981]/5 pt-2 text-[10px] font-mono">
                    <div>
                      <span className="text-[8px] text-orange-400">SUGAR:</span> <span className="text-white font-bold">{computedRecipeStats.baseMacros.sugar}g</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-emerald-400">FIBER:</span> <span className="text-white font-bold">{computedRecipeStats.baseMacros.fiber}g</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD MANUAL FOOD ATTRIBUTES FORM */
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">BASE MASS (G)</label>
                  <input 
                    type="number"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2.5 text-xs font-mono text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">CALORIES</label>
                  <input 
                    type="number"
                    required
                    value={kcal}
                    onChange={(e) => setKcal(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2.5 text-xs font-mono text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[7px] font-mono font-bold text-[#3B82F6] uppercase tracking-widest">PROT (G)</label>
                  <input 
                    type="number" step="0.1"
                    value={p}
                    onChange={(e) => handleMacroChange('p', Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[7px] font-mono font-bold text-yellow-500 uppercase tracking-widest">CARB (G)</label>
                  <input 
                    type="number" step="0.1"
                    value={c}
                    onChange={(e) => handleMacroChange('c', Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[7px] font-mono font-bold text-red-400 uppercase tracking-widest">FAT (G)</label>
                  <input 
                    type="number" step="0.1"
                    value={f}
                    onChange={(e) => handleMacroChange('f', Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[7px] font-mono font-bold text-orange-400 uppercase tracking-widest">SUGAR (G)</label>
                  <input 
                    type="number" step="0.1"
                    value={sugar}
                    onChange={(e) => setSugar(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[7px] font-mono font-bold text-emerald-400 uppercase tracking-widest">FIBER (G)</label>
                  <input 
                    type="number" step="0.1"
                    value={fiber}
                    onChange={(e) => setFiber(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">VISUAL MARKER</label>
            <div className="flex gap-2">
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setIcon(opt.name)}
                  className={cn(
                    "flex-1 py-1.5 flex items-center justify-center rounded border transition-all",
                    icon === opt.name ? "bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6]" : "bg-[#0A0A0B] border-[#2A2A2E] text-[#8E9299]"
                  )}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          </div>

          <div className="p-5 border-t border-[#2A2A2E] bg-[#151619] shrink-0">
            <button 
              type="submit"
              disabled={isRecipe && recipeIngredients.length === 0}
              className={cn(
                "w-full py-4 text-white font-mono font-bold text-[10px] uppercase tracking-[0.2em] rounded-lg transition-all shadow-lg active:scale-95",
                isRecipe && recipeIngredients.length === 0 
                  ? "bg-[#2A2A2E] text-[#8E9299] cursor-not-allowed shadow-none" 
                  : "bg-[#3B82F6] hover:bg-blue-600 shadow-blue-500/20"
              )}
            >
              COMMIT DETAILS
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
