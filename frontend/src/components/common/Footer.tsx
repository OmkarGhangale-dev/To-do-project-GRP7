import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-[#1E2530] py-4 px-6 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
        <span>© {new Date().getFullYear()} TaskFlow. All rights reserved.</span>
        <span className="font-medium">TaskFlow v1.0</span>
      </div>
    </footer>
  );
};
