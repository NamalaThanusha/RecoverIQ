
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function MetricCard({ title, value, subtitle, icon}: { title: string, value: string | React.ReactNode, subtitle?: string, icon?: React.ReactNode, }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
      </div>
    </div>
  );
}

const statusStyles = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  REQUIRES_ACTION: 'bg-amber-50 text-amber-700 border-amber-200',
  ALLOWED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DEFAULT: 'bg-slate-50 text-slate-700 border-slate-200'
};

export function StatusBadge({ status, className }: { status: string, className?: string }) {
  const s = status.toUpperCase();
  const style = statusStyles[s as keyof typeof statusStyles] || statusStyles.DEFAULT;
  
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", style, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
