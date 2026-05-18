import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const fieldClass = "w-full h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] text-[#191c1d] bg-[#f9fafb] cursor-not-allowed";

export default function ProfilePage() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const handleChangePassword = () => {
    toast('Password change requests should be sent to your HR admin.', { icon: 'ℹ️' });
  };

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#101828]">My Profile</h1>
        <p className="text-[14px] text-[#667085] mt-0.5">Your account information and role details.</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white border border-[#E4E9ED] rounded-[12px] p-6 flex items-center gap-5 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#008378] flex items-center justify-center text-white text-[22px] font-bold shrink-0 select-none">
          {initials}
        </div>
        <div>
          <div className="text-[18px] font-semibold text-[#101828]">{user?.name || '—'}</div>
          <div className="text-[14px] text-[#667085] mt-0.5">{user?.email}</div>
          <span className="mt-2 inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E7F4F2] text-[#006C63] uppercase tracking-wide">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white border border-[#E4E9ED] rounded-[12px] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-[#101828] mb-2">Account Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[12px] font-medium text-[#344054] mb-1.5 uppercase tracking-wide">Full Name</label>
            <input readOnly value={user?.name || ''} className={fieldClass} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#344054] mb-1.5 uppercase tracking-wide">Email</label>
            <input readOnly value={user?.email || ''} className={fieldClass} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#344054] mb-1.5 uppercase tracking-wide">Role</label>
            <input readOnly value={user?.role || ''} className={fieldClass} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#344054] mb-1.5 uppercase tracking-wide">Department</label>
            <input readOnly value={user?.department || 'Not assigned'} className={fieldClass} />
          </div>
        </div>

        {/* <div className="pt-4 border-t border-[#F2F4F7]">
          <button
            onClick={handleChangePassword}
            className="h-9 px-4 rounded-[8px] border border-[#D0D5DD] text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Change Password
          </button>
        </div> */}
      </div>
    </div>
  );
}
