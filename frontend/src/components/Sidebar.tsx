
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '../components/Shared';

const navItems = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Payments', to: '/payments', icon: CreditCard },
  { name: 'Escalations', to: '/escalations', icon: AlertTriangle },
  { name: 'Evaluation', to: '/evaluation', icon: Activity },
];

export function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">
            R
          </div>
          <span className="font-semibold text-lg tracking-tight">RecoverIQ</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-white">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Admin User</span>
            <span className="text-xs text-slate-500">Operations</span>
          </div>
        </div>
      </div>
    </div>
  );
}
