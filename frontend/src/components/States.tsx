
import { Loader2, AlertCircle } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-slate-300" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string, onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-rose-50/50 rounded-xl border border-rose-100">
      <AlertCircle className="w-8 h-8 text-rose-400 mb-4" />
      <p className="text-sm font-medium text-rose-700 mb-2">Something went wrong</p>
      <p className="text-sm text-rose-600 mb-4 text-center max-w-md">{error}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-white border border-slate-200 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string, description: string, icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 border-dashed">
      {icon && <div className="text-slate-400 mb-4">{icon}</div>}
      <p className="text-base font-medium text-slate-900 mb-1">{title}</p>
      <p className="text-sm text-slate-500 text-center max-w-sm">{description}</p>
    </div>
  );
}
