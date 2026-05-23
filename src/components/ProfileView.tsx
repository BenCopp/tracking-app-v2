import React, { useState } from 'react';
import { User, UserCircle, Ruler, Weight, Target, Utensils, Save } from 'lucide-react';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { updateProfile } from '../lib/firestore';
import { auth } from '../lib/firebase';

interface ProfileViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setHeaderAction: (node: React.ReactNode) => void;
}

export default function ProfileView({ userProfile, setUserProfile, setHeaderAction }: ProfileViewProps) {
  const [formData, setFormData] = useState<UserProfile>(userProfile);

  const saveProfile = () => {
    if (auth.currentUser) {
      updateProfile(formData);
    } else {
      setUserProfile(formData);
    }
    // Using a more subtle toast would be better, but keeping consistency
    alert('PROFILE SYNC SUCCESSFUL');
  };

  React.useEffect(() => {
    setHeaderAction(
      <button 
        onClick={saveProfile}
        className="bg-[#3B82F6] text-white px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2 border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
      >
        <Save size={14} /> COMMIT BIO
      </button>
    );
    return () => setHeaderAction(null);
  }, [formData, setUserProfile, setHeaderAction]);

  const updateCaloricCeiling = (macros: { p: number, c: number, f: number }) => {
    return Math.round((macros.p * 4) + (macros.c * 4) + (macros.f * 9));
  };

  const handleUpdate = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const val = Number(value);
        const updatedParent = {
          ...(prev[parent as keyof UserProfile] as object),
          [child]: val
        } as any;

        // If macros changed, update kcal automatically
        if (parent === 'goals' && (child === 'p' || child === 'c' || child === 'f')) {
          updatedParent.kcal = updateCaloricCeiling(updatedParent);
        }

        return {
          ...prev,
          [parent]: updatedParent
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: Number(value)
      }));
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-2 gap-4">
        <BioCard 
          icon={<Ruler size={16} />} 
          label="HEIGHT" 
          value={formData.height} 
          unit="CM" 
          onChange={(v) => handleUpdate('height', v)}
        />
        <BioCard 
          icon={<Weight size={16} />} 
          label="WEIGHT" 
          value={formData.weight} 
          unit="KG" 
          onChange={(v) => handleUpdate('weight', v)}
        />
        <BioCard 
          icon={<UserCircle size={16} />} 
          label="AGE" 
          value={formData.age} 
          unit="YRS" 
          onChange={(v) => handleUpdate('age', v)}
        />
        <BioCard 
          icon={<Target size={16} />} 
          label="GOAL MASS" 
          value={formData.goalWeight} 
          unit="KG" 
          onChange={(v) => handleUpdate('goalWeight', v)}
        />
      </div>

      <div className="bg-[#151619] border border-[#2A2A2E] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2E] bg-[#1C1D21]/50 flex items-center gap-3">
          <Utensils size={16} className="text-[#3B82F6]" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest">MACRO ALLOCATION GOALS</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <GoalInput 
            label="CALORIC CEILING" 
            value={formData.goals.kcal} 
            unit="KCAL" 
            color="text-[#3B82F6]"
            onChange={(v) => handleUpdate('goals.kcal', v)}
          />
          <div className="grid grid-cols-3 gap-3">
            <GoalInput 
              label="PROT" 
              value={formData.goals.p} 
              unit="G" 
              color="text-[#3B82F6]"
              onChange={(v) => handleUpdate('goals.p', v)}
            />
            <GoalInput 
              label="CARB" 
              value={formData.goals.c} 
              unit="G" 
              color="text-yellow-500"
              onChange={(v) => handleUpdate('goals.c', v)}
            />
            <GoalInput 
              label="FAT" 
              value={formData.goals.f} 
              unit="G" 
              color="text-red-500"
              onChange={(v) => handleUpdate('goals.f', v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <GoalInput 
              label="SUGAR" 
              value={formData.goals.sugar || 50} 
              unit="G" 
              color="text-orange-500"
              onChange={(v) => handleUpdate('goals.sugar', v)}
            />
            <GoalInput 
              label="FIBER" 
              value={formData.goals.fiber || 30} 
              unit="G" 
              color="text-emerald-500"
              onChange={(v) => handleUpdate('goals.fiber', v)}
            />
          </div>
        </div>
      </div>

      {/* Bio-metrics Info Box Removed */}
    </div>
  );
}

function BioCard({ icon, label, value, unit, onChange }: { icon: React.ReactNode, label: string, value: number, unit: string, onChange: (v: string) => void }) {
  return (
    <div className="bg-[#151619] border border-[#2A2A2E] p-4 rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-[#8E9299]">
        {icon}
        <span className="text-[8px] font-mono font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <input 
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-none p-0 text-xl font-mono font-bold text-white w-full focus:ring-0 outline-none"
        />
        <span className="text-[10px] font-mono text-[#8E9299] mb-1">{unit}</span>
      </div>
    </div>
  );
}

function GoalInput({ label, value, unit, color, onChange }: { label: string, value: number, unit: string, color: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[8px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input 
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded p-3 text-sm font-mono font-bold focus:border-[#3B82F6] outline-none transition-all",
            color
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#8E9299]">{unit}</span>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
