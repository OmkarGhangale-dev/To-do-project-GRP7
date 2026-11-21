import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { taskflowIcon } from '../../assets/branding';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setError('You must accept the terms of service');
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google registration failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E2530] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#5D87FF] focus:ring-2 focus:ring-[#5D87FF]/20 transition-all';

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#111C2D] transition-colors">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2.5 mb-3">
            <img
              src={taskflowIcon}
              alt="TaskFlow"
              className="w-9 h-9 rounded-xl object-contain shadow-xs"
            />
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              TaskFlow
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create your account
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Get started with TaskFlow in seconds
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white dark:bg-[#1E2530] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xs">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Google Quick Sign-Up */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-2.5 px-4 bg-white dark:bg-[#151D2A] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-3 shadow-2xs active:scale-[0.99] disabled:opacity-50 cursor-pointer mb-5"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
          </button>

          <div className="relative flex items-center justify-center mb-5">
            <div className="w-full border-t border-slate-200 dark:border-slate-700/80" />
            <span className="px-3 bg-white dark:bg-[#1E2530] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              or use email
            </span>
            <div className="w-full border-t border-slate-200 dark:border-slate-700/80" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Omkar Ghangale"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#1E2530] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#5D87FF] focus:ring-2 focus:ring-[#5D87FF]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded-sm border-slate-300 text-[#5D87FF] focus:ring-[#5D87FF]"
              />
              <label
                htmlFor="terms"
                className="ml-2 block text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer"
              >
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-[#5D87FF] hover:bg-[#4570EA] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-[#5D87FF]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Creating account...' : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-5 border-t border-slate-100 dark:border-slate-800 mt-5">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="font-bold text-[#5D87FF] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
