import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { X, Mail, Lock, User, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Clear form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setError(null);
      setResetSent(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSent(false);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      let msg = err.message.replace('Firebase:', '').trim();
      if (err.code === 'auth/operation-not-allowed') {
        msg = "EMAIL/PASSWORD AUTH IS NOT ENABLED IN FIREBASE CONSOLE. PLEASE ENABLE IT UNDER AUTHENTICATION > SIGN-IN METHOD.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("PLEASE ENTER YOUR EMAIL ADDRESS FIRST");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#151619] border border-[#2A2A2E] rounded-2xl p-8 shadow-2xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-[#8E9299] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-tighter mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest mb-8">
              {isSignUp ? 'Join the secure fitness cloud' : 'Access your hyper-personalized logs'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest ml-1">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A4E]" size={16} />
                    <input 
                      required
                      type="text"
                      className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded-xl py-3 pl-10 pr-4 text-sm font-mono focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-all text-white"
                      placeholder="YOUR NAME"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A4E]" size={16} />
                  <input 
                    required
                    type="email"
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded-xl py-3 pl-10 pr-4 text-sm font-mono focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-all text-white"
                    placeholder="EMAIL@EXAMPLE.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-mono font-bold text-[#8E9299] uppercase tracking-widest">Password</label>
                  {!isSignUp && (
                    <button 
                      type="button"
                      onClick={handleResetPassword}
                      className="text-[8px] font-mono text-[#3B82F6] uppercase tracking-widest hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A4E]" size={16} />
                  <input 
                    required={!resetSent}
                    type="password"
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2E] rounded-xl py-3 pl-10 pr-4 text-sm font-mono focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-all text-white"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[9px] font-mono uppercase leading-tight">
                  {error}
                </div>
              )}

              {resetSent && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-[9px] font-mono uppercase flex items-center gap-2">
                  <Send size={12} /> RESET EMAIL SENT. CHECK YOUR INBOX.
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#3B82F6] text-white font-mono font-bold uppercase tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? 'SIGN UP' : 'LOGIN')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setResetSent(false);
                }}
                className="text-[9px] font-mono text-[#8E9299] uppercase tracking-widest hover:text-white transition-colors"
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
