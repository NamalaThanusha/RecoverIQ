import { useEffect, useState } from 'react';

import { api } from '../services/api';
import type { PaymentWithCustomer } from '../services/api';
import { PaymentTable } from '../components/PaymentTable';
import { LoadingState, ErrorState } from '../components/States';

export function PaymentsList() {
  const [payments, setPayments] = useState<PaymentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getPayments(filter)
      .then(res => {
        if (!mounted) return;
        setPayments(res);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [filter]);

  if (error) return <ErrorState error={error} onRetry={() => setFilter(filter)} />;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-1">Manage and review payment status</p>
        </div>
        
        <div className="inline-flex bg-slate-100 p-1 rounded-lg">
          {['All', 'FAILED', 'SUCCESS', 'PENDING', 'REQUIRES_ACTION'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === status 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {status === 'All' ? 'All' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <PaymentTable payments={payments} />
      )}
    </div>
  );
}
