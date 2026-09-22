"use client";
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 cursor-pointer rounded-xl disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap px-6 shrink-0';
  const variants: Record<string, string> = {
    primary: `bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.95] shadow-md shadow-[var(--accent)]/10`,
    secondary: `bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--border-1)] hover:bg-[var(--accent-glow)]`,
    ghost: `bg-transparent text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)]`,
    danger: `bg-[var(--error)] text-white hover:opacity-90 shadow-md shadow-[var(--error)]/10`,
  };
  const sizes: Record<string, string> = {
    sm: 'h-9 text-xs',
    md: 'h-11 text-sm',
    lg: 'h-14 text-base px-8',
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
}

export function Card({ children, className = '', hover = false, onClick }: { children: ReactNode; className?: string; hover?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`glass-card rounded-2xl ${hover ? 'hover:border-[var(--border-2)] hover:shadow-[0_2px_8px_rgba(30,27,58,0.07),0_8px_32px_rgba(99,102,241,0.06)] transition-all duration-200 cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'accent' | 'success' | 'warning' | 'error' }) {
  const variants: Record<string, string> = {
    default: 'bg-[var(--bg-2)] text-[var(--text-2)] border border-[var(--border-0)]',
    accent: 'bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--border-1)]',
    success: 'bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20',
    warning: 'bg-[var(--warning-light)] text-[var(--warning)] border border-[var(--warning)]/20',
    error: 'bg-[var(--error-light)] text-[var(--error)] border border-[var(--error)]/20',
  };
  return <span className={`inline-flex items-center !px-4 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap leading-none ${variants[variant]}`}>{children}</span>;
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 rounded-full bg-[var(--bg-3)] overflow-hidden ${className}`}>
      <div className="h-full rounded-full gradient-accent transition-all duration-500 ease-out" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-4 py-3 rounded-2xl border border-[var(--border-1)] bg-white/10 dark:bg-black/10 text-[var(--text-0)] text-sm font-bold placeholder:text-[var(--text-3)] placeholder:font-normal focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all duration-200 outline-none ${className || ''}`}
      {...props}
    />
  );
}
export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full px-4 py-3 pr-[26px] rounded-2xl border border-[var(--border-1)] bg-white/10 dark:bg-black/10 text-[var(--text-0)] text-sm font-bold placeholder:text-[var(--text-3)] placeholder:font-normal focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all duration-200 outline-none resize-none ${className || ''}`}
      {...props}
    />
  );
}