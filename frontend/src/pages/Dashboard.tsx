import { useEffect, useState } from 'react';

import { api } from '../services/api';
import type { EvaluationResult, PaymentWithCustomer } from '../services/api';
import { MetricCard } from '../components/Shared';
import { PaymentTable } from '../components/PaymentTable';
import { formatMoney } from '../utils/format';
import { AlertCircle, ShieldAlert, Activity, DollarSign } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const [metrics, setMetrics] = useState<EvaluationResult | null>(null);
  const [payments, setPayments] = useState<PaymentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getEvaluationResults().catch(e => {
        // If not found, it's fine, just means no eval run yet
        if (e.code === 'NOT_FOUND') return null;
        throw e;
      }),
      api.getPayments('FAILED').then(res => res.slice(0, 5))
    ])
    .then(([evalRes, paymentsRes]) => {
      if (!mounted) return;
      setMetrics(evalRes);
      setPayments(paymentsRes);
      setLoading(false);
    })
    .catch(err => {
      if (!mounted) return;
      setError(err.message);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your recovery operations</p>
      </div>

      {!metrics ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
          <Activity className="text-blue-500 w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">No evaluation data available</h3>
            <p className="text-blue-700 text-sm mt-1 mb-3">
              Run an evaluation to populate the dashboard metrics with deterministic baseline data.
            </p>
            <button 
              onClick={() => navigate('/evaluation')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Go to Evaluation
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Revenue at Risk" 
            value={formatMoney(metrics.totalRevenueAtRiskMinor)} 
            icon={<AlertCircle className="w-5 h-5" />}
          />
          <MetricCard 
            title="Recovered Revenue" 
            value={formatMoney(metrics.recoveredRevenueMinor)} 
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
          />
          <MetricCard 
            title="Recovery Rate" 
            value={`${(metrics.recoveryRateByCount * 100).toFixed(1)}%`} 
            subtitle={`${metrics.recoverySuccessCount} of ${metrics.failedPaymentsEvaluated} failed`}
            icon={<Activity className="w-5 h-5 text-blue-500" />}
          />
          <MetricCard 
            title="Policy Blocks" 
            value={metrics.policyBlocks.toString()} 
            icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Failures</h2>
          <button 
            onClick={() => navigate('/payments')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </button>
        </div>
        {payments.length > 0 ? (
          <PaymentTable payments={payments} compact />
        ) : (
          <EmptyState title="No recent failures" description="All payments are successful." />
        )}
      </div>
    </div>
  );
}
