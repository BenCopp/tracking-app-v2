import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, LogOut, User } from 'lucide-react';
import { AuthModal } from './AuthModal';

export function AuthButton({ onOpenLogin }: { onOpenLogin: () => void }) {
  const [user, setUser] = React.useState(auth.currentUser);

  React.useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (user) {
    return (
      <button 
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151619] border border-[#2A2A2E] text-xs font-mono text-[#8E9299] hover:text-white transition-all"
      >
        <User size={14} className="text-[#3B82F6]" />
        {(user.displayName || user.email?.split('@')[0])?.toUpperCase()}
        <LogOut size={12} className="ml-1" />
      </button>
    );
  }

  return (
    <button 
      onClick={onOpenLogin}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-xs font-mono font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105 transition-all"
    >
      <LogIn size={14} />
      Login
    </button>
  );
}
