import { useEffect, useState } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { PaymentDetail as PaymentDetailType, RecoveryContext, AgentRunTimeline as AgentRunTimelineType } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { StatusBadge } from '../components/Shared';
import { AgentTimeline } from '../components/AgentTimeline';
import { formatMoney, formatDate } from '../utils/format';
import { ArrowLeft, User, CreditCard, Activity, PlayCircle } from 'lucide-react';

export function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [payment, setPayment] = useState<PaymentDetailType | null>(null);
  const [context, setContext] = useState<RecoveryContext | null>(null);
  const [run, setRun] = useState<AgentRunTimelineType | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    
    api.getPayment(id)
      .then(async (payRes) => {
        setPayment(payRes);
        
        // Load context
        try {
          const ctxRes = await api.getPaymentContext(id);
          setContext(ctxRes);
        } catch (e) {
          console.warn("Could not load context");
        }

        // Load timeline if there's a recent run
        if (payRes.agentRuns && payRes.agentRuns.length > 0) {
          try {
            const runRes = await api.getAgentRun(payRes.agentRuns[0].id);
            setRun(runRes);
          } catch (e) {
            console.warn("Could not load agent run");
          }
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleTriggerAgent = async () => {
    if (!id) return;
    setTriggering(true);
    try {
      await api.triggerAgent(id);
      loadData(); // Reload everything to show new run
    } catch (e: any) {
      alert("Failed to trigger agent: " + e.message);
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return <LoadingState message="Loading payment details..." />;
  if (error || !payment) return <ErrorState error={error || 'Not found'} onRetry={loadData} />;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/payments')}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
            Payment {payment.id.split('-')[0]}...
            <StatusBadge status={payment.status} />
          </h1>
          <p className="text-slate-500 mt-1">Created {formatDate(payment.createdAt)}</p>
        </div>
        <div className="ml-auto">
          {payment.status === 'FAILED' && (
            <button
              onClick={handleTriggerAgent}
              disabled={triggering}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium shadow-sm transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              {triggering ? 'Running...' : 'Trigger AI Recovery'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
            <CreditCard className="w-5 h-5 text-slate-400" />
            Payment Details
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500 mb-1">Amount</dt>
              <dd className="font-medium text-slate-900 text-lg">{formatMoney(payment.amount, payment.currency)}</dd>
            </div>
            {payment.failureReason && (
              <div>
                <dt className="text-slate-500 mb-1">Failure Reason</dt>
                <dd className="text-slate-900">{payment.failureReason}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500 mb-1">Retry Count</dt>
              <dd className="text-slate-900">{payment.retryCount}</dd>
            </div>
          </dl>
        </div>

        {/* Customer Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
            <User className="w-5 h-5 text-slate-400" />
            Customer
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500 mb-1">Name</dt>
              <dd className="font-medium text-slate-900">{payment.customer.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-1">Email</dt>
              <dd className="text-slate-900">{payment.customer.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-1">Lifetime Value</dt>
              <dd className="text-slate-900">{formatMoney(payment.customer.lifetimeValue)}</dd>
            </div>
          </dl>
        </div>

        {/* Context Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
            <Activity className="w-5 h-5 text-slate-400" />
            Recovery Context
          </div>
          {context ? (
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-slate-500">Retryable</dt>
                <dd><StatusBadge status={context.isRetryable ? 'YES' : 'NO'} className={context.isRetryable ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-rose-50 text-rose-700'} /></dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-500">High Value Customer</dt>
                <dd><StatusBadge status={context.isHighValue ? 'YES' : 'NO'} className={context.isHighValue ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'} /></dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-500">Prev. Failures</dt>
                <dd className="font-medium text-slate-900">{context.previousFailureCount}</dd>
              </div>
            </dl>
          ) : (
            <div className="text-sm text-slate-500">Context unavailable</div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">AI Agent Recovery Timeline</h2>
        {run ? (
          <AgentTimeline run={run} />
        ) : (
          <EmptyState 
            title="No Recovery Attempts Yet" 
            description="The AI agent has not run on this payment yet. Click 'Trigger AI Recovery' to start." 
          />
        )}
      </div>
    </div>
  );
}
