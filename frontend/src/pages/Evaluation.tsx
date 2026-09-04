import { useEffect, useState } from 'react';

import { api } from '../services/api';
import type { EvaluationResult } from '../services/api';
import { MetricCard } from '../components/Shared';
import { LoadingState, ErrorState } from '../components/States';
import { formatMoney } from '../utils/format';
import { PlayCircle, CheckCircle2, XCircle, BarChart3, AlertTriangle, Activity } from 'lucide-react';

export function Evaluation() {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = () => {
    setLoading(true);
    api.getEvaluationResults()
      .then(res => {
        setResult(res);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        if (err.code !== 'NOT_FOUND') setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLatest();
  }, []);

  const runEvaluation = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const res = await api.runEvaluation();
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to run evaluation");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Deterministic Evaluation</h1>
          <p className="text-slate-500 mt-1">Run and review the AI agent's performance against baseline scenarios.</p>
        </div>
        <button
          onClick={runEvaluation}
          disabled={evaluating}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all"
        >
          {evaluating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running Evaluation...
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5" />
              Run Evaluation
            </>
          )}
        </button>
      </div>

      {error && <ErrorState error={error} onRetry={runEvaluation} />}

      {loading ? (
        <LoadingState message="Loading latest results..." />
      ) : !result && !error ? (
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-12 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Evaluation Data</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            The evaluation framework tests the AI agent against deterministic fixtures to ensure safe and predictable revenue recovery. Click "Run Evaluation" to generate the baseline metrics.
          </p>
        </div>
      ) : result ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Recovery Rate (Revenue)" 
              value={`${(result.recoveryRateByRevenue * 100).toFixed(1)}%`} 
              icon={<Activity className="w-5 h-5 text-indigo-500" />}
            />
            <MetricCard 
              title="Recovered Revenue" 
              value={formatMoney(result.recoveredRevenueMinor)} 
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            />
            <MetricCard 
              title="Unrecovered Revenue" 
              value={formatMoney(result.unrecoveredRevenueMinor)} 
              icon={<XCircle className="w-5 h-5 text-rose-500" />}
            />
            <MetricCard 
              title="Failed Payments Evaluated" 
              value={result.failedPaymentsEvaluated.toString()} 
              icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                Agent Actions Taken
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Retry Attempts</span>
                  <span className="text-slate-900 font-bold">{result.retryAttempts}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Reminders Sent</span>
                  <span className="text-slate-900 font-bold">{result.remindersSent}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Incentives Proposed</span>
                  <span className="text-slate-900 font-bold">{result.incentivesProposed}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="text-amber-800 font-medium">Escalations Created</span>
                  <span className="text-amber-900 font-bold">{result.escalations}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
                  <span className="text-rose-800 font-medium">Policy Blocks</span>
                  <span className="text-rose-900 font-bold">{result.policyBlocks}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Run Performance</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="text-emerald-600 text-sm font-medium mb-1">Successful Runs</div>
                    <div className="text-2xl font-bold text-emerald-700">{result.successfulAgentRuns}</div>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                    <div className="text-rose-600 text-sm font-medium mb-1">Failed Runs</div>
                    <div className="text-2xl font-bold text-rose-700">{result.failedAgentRuns}</div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4">
                  <div className="text-slate-500 text-sm mb-1">Average Recovery Steps</div>
                  <div className="text-lg font-bold text-slate-900">{result.averageRecoveryAttempts.toFixed(2)} steps</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}
