import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Notifications state ────────────────────────────────────────────
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const notifRef = useRef(null);

  // ── Profile state ──────────────────────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  // Derived: unread count shown on badge (visible without opening panel)
  const unreadCount = notifs.filter(n => !n.is_read).length;

  // ── Fetch notifications (silent, no loading spinner on bg poll) ────
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifs(res.data || []);
    } catch { /* silent */ }
  }, []);

  // Load immediately on mount, poll every 30 s, and update on live socket events
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);

    const handleSocketEvent = (e) => {
      if (e.detail.event === 'new_notification') {
        fetchNotifs();
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [fetchNotifs]);

  // ── Mark individual as read ────────────────────────────────────────
  const markOneRead = async (id) => {
    // Optimistic update first so the UI reacts instantly
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch { /* revert on error */ fetchNotifs(); }
  };

  // ── Mark all as read ───────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch { fetchNotifs(); }
  };

  // ── Toggle panels ──────────────────────────────────────────────────
  const toggleNotifs  = () => { setShowNotifs(v => !v); setShowProfile(false); };
  const toggleProfile = () => { setShowProfile(v => !v); setShowNotifs(false); };

  // ── Close on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const formatTime = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000)    return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <header className="h-[56px] min-h-[56px] bg-white border-b border-[#e1e3e4] flex items-center px-6 gap-4 relative z-30">

      {/* Search */}
      <div className="flex-1 max-w-[480px] relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px] pointer-events-none">
          search
        </span>
        <input
          type="text"
          placeholder="Search goals, colleagues, or resources..."
          className="w-full h-9 pl-9 pr-3 bg-[#f3f4f5] border border-transparent rounded-[6px] text-[13px] text-[#191c1d] placeholder:text-[#3d4947]/50 focus:outline-none focus:border-[#00685f] focus:bg-white transition-colors"
        />
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">

        {/* ── Notifications Bell ───────────────────────────────── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={toggleNotifs}
            className="w-9 h-9 flex items-center justify-center rounded-[8px] hover:bg-[#f3f4f5] text-[#3d4947] transition-colors relative"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[21px]">notifications</span>
            {/* Badge — always visible once count > 0 */}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {showNotifs && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] bg-white border border-[#e1e3e4] rounded-[12px] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f5]">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#191c1d]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="h-5 px-1.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[12px] text-[#00685f] hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[340px] overflow-y-auto divide-y divide-[#f9fafb]">
                {notifs.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <span className="material-symbols-outlined text-[36px] text-[#D0D5DD]">notifications_none</span>
                    <p className="text-[13px] text-[#667085] mt-2">You're all caught up!</p>
                  </div>
                ) : (
                  notifs.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.is_read ? 'bg-[#f0faf9]' : 'hover:bg-[#f9fafb]'}`}
                    >
                      {/* Unread dot */}
                      <div className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${!n.is_read ? 'bg-[#00685f]' : 'bg-transparent border border-[#D0D5DD]'}`} />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[#191c1d] leading-snug">{n.message}</p>
                        <p className="text-[11px] text-[#667085] mt-1">{formatTime(n.created_at)}</p>
                      </div>

                      {/* Mark-as-read button (only shown when unread) */}
                      {!n.is_read && (
                        <button
                          onClick={() => markOneRead(n.id)}
                          title="Mark as read"
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#d1f5f0] text-[#00685f] transition-colors mt-0.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#e1e3e4] mx-1" />

        {/* ── Profile Dropdown ─────────────────────────────────── */}
        <div ref={profileRef} className="relative">
          <button
            onClick={toggleProfile}
            className="flex items-center gap-2 hover:bg-[#f3f4f5] rounded-[8px] px-2 py-1 transition-colors"
            aria-label="Profile menu"
          >
            <div className="w-7 h-7 rounded-full bg-[#008378] flex items-center justify-center text-white text-[11px] font-semibold select-none">
              {initials}
            </div>
            <span className="material-symbols-outlined text-[16px] text-[#3d4947]">
              {showProfile ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[180px] bg-white border border-[#e1e3e4] rounded-[12px] shadow-2xl overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => { setShowProfile(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#344054] hover:bg-[#f9fafb] transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[17px] text-[#667085]">person</span>
                  View Profile
                </button>

                <div className="mx-4 h-px bg-[#f3f4f5]" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[17px]">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}