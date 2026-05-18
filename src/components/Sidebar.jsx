import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItemsByRole = {
  EMPLOYEE: [
    { label: 'Dashboard', icon: 'grid_view', path: '/dashboard' },
    { label: 'My Goals', icon: 'my_location', path: '/my-goals' },
    { label: 'Check-ins', icon: 'fact_check', path: '/checkin' },
    { label: 'Goal Builder', icon: 'edit_note', path: '/goal-builder' },
  ],
  MANAGER: [
    { label: 'Dashboard', icon: 'grid_view', path: '/manager/dashboard' },
    { label: 'Team Members', icon: 'group', path: '/manager/team-members' },
    { label: 'Shared Goals', icon: 'sync', path: '/manager/shared-goals' },
    { label: 'Reports', icon: 'bar_chart', path: '/manager/reports' },
    { label: 'Analytics', icon: 'query_stats', path: '/manager/analytics' },
  ],
  ADMIN: [
    { label: 'Dashboard', icon: 'grid_view', path: '/admin/dashboard' },
    { label: 'User Management', icon: 'manage_accounts', path: '/admin/users' },
    { label: 'Team Members', icon: 'group', path: '/admin/team-members' },
    { label: 'Goal Sheets', icon: 'assignment', path: '/admin/goal-sheets' },
    { label: 'Cycle Management', icon: 'event_repeat', path: '/admin/cycles' },
    { label: 'Audit Logs', icon: 'policy', path: '/admin/audit' },
    { label: 'Escalations', icon: 'notifications_active', path: '/admin/escalations' },
    { label: 'Reports', icon: 'bar_chart', path: '/admin/reports' },
    { label: 'Analytics', icon: 'query_stats', path: '/admin/analytics' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = navItemsByRole[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-[240px] min-w-[240px] h-screen bg-[#f3f4f5] border-r border-[#e1e3e4] flex flex-col">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-[#e1e3e4]">
        <div className="text-[16px] font-semibold text-[#191c1d] leading-tight">
          AtomQuest
        </div>
        <div className="text-[12px] text-[#3d4947] mt-0.5">HR Portal</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#00685f]/10 text-[#00685f]'
                  : 'text-[#3d4947] hover:bg-[#e7e8e9] hover:text-[#191c1d]'
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User at bottom */}
      <div className="px-4 py-4 border-t border-[#e1e3e4] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#008378] flex items-center justify-center text-white text-[12px] font-semibold shrink-0">
          {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[#191c1d] truncate">
            {user?.name || 'User'}
          </div>
          <div className="text-[11px] text-[#3d4947] truncate">
            {user?.role || ''}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-[#3d4947] hover:text-[#191c1d] transition-colors"
          title="Logout"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </aside>
  );
}