
import { useNavigate } from 'react-router-dom';
import type { PaymentWithCustomer } from '../services/api';
import { StatusBadge } from './Shared';
import { formatMoney, formatDate } from '../utils/format';
import { ChevronRight } from 'lucide-react';

export function PaymentTable({ payments, compact = false }: { payments: PaymentWithCustomer[], compact?: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            {!compact && <th className="px-4 py-3 hidden md:table-cell">Failure Reason</th>}
            {!compact && <th className="px-4 py-3 hidden lg:table-cell">Updated</th>}
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => (
            <tr 
              key={p.id} 
              className="hover:bg-slate-50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/payments/${p.id}`)}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{p.customer?.name || 'Unknown'}</div>
                {!compact && <div className="text-slate-500 text-xs">{p.customer?.email}</div>}
              </td>
              <td className="px-4 py-3 font-medium text-slate-700">
                {formatMoney(p.amount, p.currency)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
              {!compact && (
                <td className="px-4 py-3 hidden md:table-cell text-slate-500 max-w-xs truncate">
                  {p.failureReason || '-'}
                </td>
              )}
              {!compact && (
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                  {formatDate(p.updatedAt)}
                </td>
              )}
              <td className="px-4 py-3 text-right text-slate-400 group-hover:text-blue-500 transition-colors">
                <ChevronRight className="w-4 h-4 inline-block" />
              </td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan={compact ? 4 : 6} className="px-4 py-8 text-center text-slate-500">
                No payments found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
