import { useEffect, useState } from 'react';

import { api } from '../services/api';
import type { ApprovalRequest } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { StatusBadge } from '../components/Shared';
import { formatMoney, formatDate } from '../utils/format';
import { ShieldAlert, Check, X } from 'lucide-react';

export function Escalations() {
  const [escalations, setEscalations] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getEscalations()
      .then(res => {
        if (!mounted) return;
        setEscalations(res);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) return <LoadingState message="Loading escalations..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Escalations Queue</h1>
        <p className="text-slate-500 mt-1">Review cases escalated by the AI agent</p>
      </div>

      {escalations.length === 0 ? (
        <EmptyState 
          title="No pending escalations" 
          description="The AI agent is handling all cases automatically or there are no new failures."
          icon={<ShieldAlert className="w-8 h-8 text-emerald-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {escalations.map(esc => (
            <div key={esc.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="bg-amber-50 p-6 md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-amber-900">Escalated Case</span>
                </div>
                <StatusBadge status={esc.status} className="mb-4" />
                <div className="text-xs text-amber-700 space-y-1">
                  <div>Requested: {formatDate(esc.requestedAt)}</div>
                  <div className="font-mono bg-white/50 px-1 py-0.5 rounded inline-block mt-2">Action: {esc.proposedAction}</div>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Reason for Escalation</h3>
                  <p className="text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                    {esc.reason}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
                    <div>
                      <span className="block text-slate-500 mb-1">Customer</span>
                      <span className="font-medium text-slate-900">{esc.payment?.customer?.name || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1">Payment Amount</span>
                      <span className="font-medium text-slate-900">{esc.payment ? formatMoney(esc.payment.amount, esc.payment.currency) : '-'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1">Payment Status</span>
                      <span><StatusBadge status={esc.payment?.status || 'UNKNOWN'} /></span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1">Retry Count</span>
                      <span className="font-medium text-slate-900">{esc.payment?.retryCount}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm">
                    <Check className="w-4 h-4" /> Approve Action
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-sm font-medium transition-colors shadow-sm">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
