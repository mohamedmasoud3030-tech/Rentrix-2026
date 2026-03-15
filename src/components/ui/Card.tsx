import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-slate-200/85 bg-white/94 shadow-brand backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-200 before:to-transparent dark:border-slate-800/85 dark:bg-slate-900/92 dark:before:via-slate-700/70 ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-50/95 via-white/25 to-transparent dark:from-white/[0.03] dark:via-white/[0.01]" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/45 dark:ring-white/[0.04]" />
      {children}
    </div>
  );
};

export default Card;
