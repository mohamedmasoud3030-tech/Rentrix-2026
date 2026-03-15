import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 shadow-brand backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/90 before:to-transparent after:pointer-events-none after:absolute after:inset-x-8 after:top-0 after:h-24 after:rounded-full after:bg-[radial-gradient(circle,rgba(14,165,233,0.12),transparent_68%)] dark:border-slate-800/85 dark:bg-slate-900/86 dark:before:via-slate-700/80 dark:after:bg-[radial-gradient(circle,rgba(14,165,233,0.1),transparent_70%)] ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/55 via-white/20 to-transparent dark:from-white/[0.04] dark:via-white/[0.015]" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/35 dark:ring-white/[0.04]" />
      {children}
    </div>
  );
};

export default Card;
