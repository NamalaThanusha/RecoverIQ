
import type { AgentRunTimeline } from '../services/api';
import { Bot, ShieldCheck, Wrench, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from './Shared';

export function AgentTimeline({ run }: { run: AgentRunTimeline }) {
  if (!run.agentActions || run.agentActions.length === 0) {
    return <div className="text-sm text-slate-500 py-4">No agent actions recorded.</div>;
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
      {run.agentActions.map((action) => (
        <div key={action.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <Bot className="w-5 h-5" />
          </div>
          
          {/* Card */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3">
              {/* Gemini Agent Step */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <Bot className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gemini Agent</h4>
                  <p className="text-sm font-medium text-slate-900">Proposed: <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{action.toolName}</span></p>
                  {action.inputParams && (
                    <pre className="mt-2 text-[10px] text-slate-500 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                      {JSON.stringify(action.inputParams, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {/* Policy Engine Step */}
              <div className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                action.policyDecision === 'ALLOWED' ? "bg-emerald-50 border-emerald-100" : 
                action.policyDecision === 'BLOCKED' ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"
              )}>
                {action.policyDecision === 'ALLOWED' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : action.policyDecision === 'BLOCKED' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">Policy Engine</h4>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-bold",
                      action.policyDecision === 'ALLOWED' ? "text-emerald-700" : 
                      action.policyDecision === 'BLOCKED' ? "text-rose-700" : "text-amber-700"
                    )}>
                      {action.policyDecision || 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution Step */}
              {action.policyDecision === 'ALLOWED' && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Wrench className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Execution</h4>
                    <div className="flex items-center gap-2 mb-1">
                      {action.executionStatus === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="text-sm font-medium text-slate-900">{action.executionStatus}</span>
                    </div>
                    {action.resultSummary && (
                      <p className="text-xs text-slate-600">{action.resultSummary}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
