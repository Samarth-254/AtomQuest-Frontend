import { useEffect, useState } from 'react';
import { createUser, deleteUser, listUsers, suspendUser } from '../../api/adminApi';

const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Success',
  'Quality Assurance'
];

const roleStyles = {
  ADMIN: 'bg-[#F4F3FF] text-[#6941C6]',
  MANAGER: 'bg-[#EEF4FF] text-[#3538CD]',
  EMPLOYEE: 'bg-[#ECFDF3] text-[#027A48]',
};

const initialForm = { name: '', email: '', password: '', role: 'EMPLOYEE', department: '', managerId: '' };

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [suspending, setSuspending] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // user object
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await listUsers();
      const all = res.data || [];
      setUsers(all);
      setManagers(all.filter(u => u.role === 'MANAGER'));
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !search || [u.name, u.email, u.department].some(v => (v || '').toLowerCase().includes(q));
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchQ && matchRole;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department.trim() || undefined,
        managerId: form.managerId || undefined,
      });
      setShowModal(false);
      setForm(initialForm);
      showToast(`User "${form.name}" created successfully!`);
      load();
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (user) => {
    setSuspending(user.id);
    try {
      const res = await suspendUser(user.id);
      const action = res.data?.user?.is_suspended ? 'suspended' : 'reinstated';
      showToast(`"${user.name}" ${action}.`, res.data?.user?.is_suspended ? 'warning' : 'success');
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Action failed.', 'error');
    } finally {
      setSuspending(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteUser(deleteConfirm.id);
      showToast(`"${deleteConfirm.name}" removed.`, 'success');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to remove user.', 'error');
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const toastColors = {
    success: 'bg-[#101828] text-white',
    warning: 'bg-[#B54708] text-white',
    error:   'bg-[#B42318] text-white',
  };
  const toastIcons = { success: 'check_circle', warning: 'warning', error: 'error' };

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-5">

        {/* Toast */}
        {toast.msg && (
          <div className={`fixed top-4 right-4 z-50 ${toastColors[toast.type]} text-[13px] font-medium px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2`}>
            <span className="material-symbols-outlined text-[16px]">{toastIcons[toast.type]}</span>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#101828]">User Management</h1>
            <p className="text-[14px] text-[#667085] mt-0.5">{users.length} total users across all roles</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setSaveError(''); setForm(initialForm); }}
            className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Add User
          </button>
        </section>

        {/* Role summary cards */}
        {loading && (
          <section className="grid grid-cols-3 gap-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-[#E4E9ED] rounded-[12px] h-[74px]"></div>
            ))}
          </section>
        )}
        {!loading && !error && (
          <section className="grid grid-cols-3 gap-4">
            {ROLES.map(r => {
              const count = users.filter(u => u.role === r).length;
              const suspended = users.filter(u => u.role === r && u.is_suspended).length;
              const icons = { ADMIN: 'admin_panel_settings', MANAGER: 'supervisor_account', EMPLOYEE: 'person' };
              const accents = { ADMIN: 'bg-[#6941C6]', MANAGER: 'bg-[#3538CD]', EMPLOYEE: 'bg-[#006C63]' };
              return (
                <div key={r} className="bg-white border border-[#E4E9ED] rounded-[12px] p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[8px] ${accents[r]} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-[18px] text-white">{icons[r]}</span>
                  </div>
                  <div>
                    <div className="text-[22px] font-bold text-[#101828] leading-none">{count}</div>
                    <div className="text-[12px] text-[#667085] capitalize mt-0.5">
                      {r.toLowerCase()}s {suspended > 0 && <span className="text-[#B54708]">· {suspended} suspended</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Filters */}
        <section className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] text-[16px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, department..."
              className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
            />
          </div>
          <div className="flex gap-1 bg-white border border-[#D0D5DD] rounded-[8px] p-1">
            {['All', ...ROLES].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors ${roleFilter === r ? 'bg-[#006C63] text-white' : 'text-[#344054] hover:bg-[#F9FAFB]'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        {/* Table */}
        <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
          {loading && (
            <div className="p-5 space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="w-20 h-4 bg-gray-200 rounded hidden sm:block"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded hidden md:block"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded hidden lg:block"></div>
                  <div className="w-16 h-5 bg-gray-200 rounded shrink-0"></div>
                  <div className="w-24 h-8 bg-gray-200 rounded shrink-0"></div>
                </div>
              ))}
            </div>
          )}
          {error && !loading && <div className="px-5 py-6 text-center text-[13px] text-[#B42318]">{error}</div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                    {['User', 'Role', 'Department', 'Manager', 'Joined', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-[#667085]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-[#667085]">No users found.</td></tr>
                  )}
                  {filtered.map(user => (
                    <tr
                      key={user.id}
                      className={`hover:bg-[#F9FAFB] transition-colors ${user.is_suspended ? 'opacity-60' : ''}`}
                    >
                      <td className="px-5 py-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold ${user.is_suspended ? 'bg-[#F2F4F7] text-[#98A2B3]' : 'bg-[#006C63]/10 text-[#006C63]'}`}>
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[#101828]">{user.name}</div>
                          <div className="text-[11px] text-[#667085]">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[6px] ${roleStyles[user.role] || 'bg-[#F2F4F7] text-[#344054]'}`}>{user.role}</span>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-[#344054]">{user.department || '—'}</td>
                      <td className="px-5 py-3 text-[13px] text-[#344054]">{user.manager_name || '—'}</td>
                      <td className="px-5 py-3 text-[12px] text-[#667085]">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3">
                        {user.is_suspended
                          ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#FEF3F2] text-[#B42318]">
                              <span className="material-symbols-outlined text-[12px]">block</span>Suspended
                            </span>
                          : <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#ECFDF3] text-[#027A48]">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>Active
                            </span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {/* Suspend / Reinstate */}
                          <button
                            onClick={() => handleSuspend(user)}
                            disabled={suspending === user.id}
                            title={user.is_suspended ? 'Reinstate user' : 'Suspend user'}
                            className={`h-8 px-3 rounded-[6px] border text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                              user.is_suspended
                                ? 'border-[#027A48] text-[#027A48] hover:bg-[#ECFDF3]'
                                : 'border-[#B54708] text-[#B54708] hover:bg-[#FFF6ED]'
                            }`}
                          >
                            {suspending === user.id
                              ? <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                              : <span className="material-symbols-outlined text-[13px]">{user.is_suspended ? 'lock_open' : 'person_off'}</span>
                            }
                            {user.is_suspended ? 'Reinstate' : 'Suspend'}
                          </button>

                          {/* Remove */}
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            title="Remove user permanently"
                            className="h-8 px-3 rounded-[6px] border border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3 border-t border-[#F2F4F7]">
            <span className="text-[13px] text-[#667085]">Showing {filtered.length} of {users.length} users</span>
          </div>
        </section>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[480px] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F2F4F7] flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-bold text-[#101828]">Create New User</h2>
                <p className="text-[13px] text-[#667085] mt-0.5">Fill in user details below.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-[6px] hover:bg-[#F2F4F7] flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[18px] text-[#667085]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {saveError && (
                <div className="text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] px-3 py-2">{saveError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]" placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]" placeholder="rahul@company.com" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Password *</label>
                  <input required type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]" placeholder="Min 6 characters" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Role *</label>
                  <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]">
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Department</label>
                  <select value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]">
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Manager</label>
                  <select value={form.managerId} onChange={e => setForm(p => ({...p, managerId: e.target.value}))}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]">
                    <option value="">No manager</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 h-10 rounded-[8px] border border-[#D0D5DD] bg-white text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 h-10 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      Creating...
                    </>
                  ) : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="px-6 pt-6 pb-5">
              <div className="w-12 h-12 rounded-full bg-[#FEF3F2] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[22px] text-[#B42318]">person_remove</span>
              </div>
              <h2 className="text-[17px] font-bold text-[#101828]">Remove User</h2>
              <p className="text-[13px] text-[#667085] mt-1.5">
                Are you sure you want to permanently remove <strong className="text-[#101828]">{deleteConfirm.name}</strong>?
                This action cannot be undone and will delete all associated data.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 rounded-[8px] border border-[#D0D5DD] bg-white text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-10 rounded-[8px] bg-[#B42318] hover:bg-[#912018] text-white text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    Removing...
                  </>
                ) : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
