import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPassword } from '../../api/authApi';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = query.get('token') || '';
  const email = query.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !email) {
      toast.error('Reset link is missing or invalid.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, token, newPassword: password });
      toast.success('Password updated. Please log in.');
      navigate('/login');
    } catch (error) {
      const msg = error.response?.data?.message || 'Unable to reset password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-6">
      <main className="w-full max-w-[520px] bg-white border border-[#d9e3e4] rounded-[8px] px-8 py-8 sm:px-10 sm:py-10 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-[8px] bg-[#008378] flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-[#00685f] text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock_reset
            </span>
          </div>

          <h1 className="text-[24px] leading-[32px] tracking-[-0.01em] font-semibold text-[#191c1d] mb-2">
            Reset your password
          </h1>

          <p className="text-[14px] leading-[20px] font-normal text-[#3d4947]">
            Enter a new password for {email || 'your account'}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] leading-[18px] font-medium text-[#191c1d]">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 px-3 border border-[#bcc9c6] rounded-[8px] bg-white text-[14px] leading-[20px] text-[#191c1d] placeholder:text-[#3d4947]/40 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] leading-[18px] font-medium text-[#191c1d]">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 px-3 border border-[#bcc9c6] rounded-[8px] bg-white text-[14px] leading-[20px] text-[#191c1d] placeholder:text-[#3d4947]/40 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 rounded-[8px] bg-[#00685f] hover:bg-[#005049] text-white text-[13px] leading-[18px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Updating...
              </>
            ) : 'Update Password'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#edeeef] text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-[#00685f] font-medium text-[13px] hover:underline"
          >
            Back to login
          </button>
        </div>
      </main>
    </div>
  );
}
