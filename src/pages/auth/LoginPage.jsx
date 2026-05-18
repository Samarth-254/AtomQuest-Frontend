import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as loginRequest, requestPasswordReset } from '../../api/authApi';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, user, token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'MANAGER') {
        navigate('/manager/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, token, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await loginRequest({
        email: formData.email,
        password: formData.password,
      });

      const { user, token } = response.data;
      login(user, token);

      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    try {
      await requestPasswordReset({ email: forgotEmail.trim() });
      toast.success('Reset link sent. Check your inbox.');
      setShowForgot(false);
      setForgotEmail('');
    } catch (error) {
      const msg = error.response?.data?.message || 'Unable to send reset link.';
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-6">
      <main className="w-full max-w-[600px] bg-white border border-[#d9e3e4] rounded-[8px] px-8 py-8 sm:px-10 sm:py-10 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-[8px] bg-[#008378] flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-[#00685f] text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              target
            </span>
          </div>

          <h1 className="text-[24px] leading-[32px] tracking-[-0.01em] font-semibold text-[#191c1d] mb-2">
            Welcome to AtomQuest
          </h1>

          <p className="text-[14px] leading-[20px] font-normal text-[#3d4947]">
            Sign in to access your enterprise portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-[13px] leading-[18px] font-medium text-[#191c1d]"
            >
              Email Address
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[20px] pointer-events-none">
                mail
              </span>

              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="w-full h-12 pl-10 pr-3 border border-[#bcc9c6] rounded-[8px] bg-white text-[14px] leading-[20px] text-[#191c1d] placeholder:text-[#3d4947]/40 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-[13px] leading-[18px] font-medium text-[#191c1d]"
              >
                Password
              </label>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgot(true);
                  setForgotEmail(formData.email || '');
                }}
                className="text-[12px] leading-[16px] font-medium text-[#00685f] hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[20px] pointer-events-none">
                lock
              </span>

              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full h-12 pl-10 pr-3 border border-[#bcc9c6] rounded-[8px] bg-white text-[14px] leading-[20px] text-[#191c1d] placeholder:text-[#3d4947]/40 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 rounded-[8px] bg-[#00685f] hover:bg-[#005049] text-white text-[13px] leading-[18px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#edeeef] text-center">
          <p className="text-[14px] leading-[20px] text-[#3d4947]">
            Need access?{' '}
            <a href="#" className="text-[#00685f] font-medium hover:underline">
              Contact your Administrator
            </a>
          </p>
        </div>
      </main>

      <footer className="mt-12 text-center">
        <p className="text-[12px] leading-[16px] font-medium text-[#3d4947]/70">
          © 2026 AtomQuest HR. Secure Enterprise Portal.
        </p>
      </footer>

      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !forgotLoading && setShowForgot(false)}
          />
          <div className="bg-white rounded-[12px] shadow-2xl border border-[#e1e3e4] w-full max-w-[420px] overflow-hidden relative z-10">
            <div className="px-6 py-5 border-b border-[#f3f4f5] flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#191c1d]">Reset your password</h2>
              <button
                onClick={() => !forgotLoading && setShowForgot(false)}
                className="w-8 h-8 rounded-[6px] hover:bg-[#f3f4f5] flex items-center justify-center text-[#586270]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleForgotSubmit} className="px-6 py-5 space-y-4">
              <p className="text-[13px] text-[#586270]">
                Enter your account email. We will send a password reset link if it exists.
              </p>
              <div>
                <label className="block text-[12px] font-medium text-[#191c1d] mb-2">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full h-11 px-3 border border-[#bcc9c6] rounded-[8px] bg-white text-[14px] text-[#191c1d] focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  disabled={forgotLoading}
                  className="h-9 px-4 rounded-[8px] border border-[#D0D5DD] text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="h-9 px-4 rounded-[8px] bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-medium transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      Sending...
                    </>
                  ) : 'Send reset link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}