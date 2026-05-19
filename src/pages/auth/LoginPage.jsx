import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as loginRequest, requestPasswordReset } from '../../api/authApi';
import toast from 'react-hot-toast';
import leftImage from '../../assets/left.png';

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

  const DEMO_CREDENTIALS = {
    admin: {
      email: 'admin@atomberg.com',
      password: 'password123',
      label: 'Admin',
    },
    manager: {
      email: 'rajesh@atomberg.com',
      password: 'password123',
      label: 'Manager',
    },
    employee: {
      email: 'priya@atomberg.com',
      password: 'password123',
      label: 'Employee',
    },
  };

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

  const runLogin = async (email, password) => {
    setLoading(true);
    try {
      const response = await loginRequest({ email, password });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    runLogin(formData.email, formData.password);
  };

  const handleLoginAs = (role) => {
    const cred = DEMO_CREDENTIALS[role];
    if (!cred || loading) return;
    setFormData({ email: cred.email, password: cred.password });
    runLogin(cred.email, cred.password);
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
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', position: 'fixed', top: 0, left: 0 }}>
      {/* LEFT SIDE */}
      <div style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden' }}>
        <img
          src={leftImage}
          alt="AtomQuest HR"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* RIGHT SIDE */}
      <div style={{ flex: '0 0 50%', backgroundColor: '#f0f2f1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>

          {/* Login Card */}
          <div style={{ width: '100%', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #d9dedd', padding: '28px 28px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: '#191c1d' }}>
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@atomberg.com"
                  style={{ width: '100%', height: '44px', padding: '0 14px', border: '1px solid #c9d4d2', borderRadius: '8px', fontSize: '14px', color: '#191c1d', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.target.style.borderColor = '#00685f'; e.target.style.boxShadow = '0 0 0 3px rgba(0,104,95,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#c9d4d2'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 500, color: '#191c1d' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(formData.email || ''); }}
                    style={{ fontSize: '13px', fontWeight: 500, color: '#00685f', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{ width: '100%', height: '44px', padding: '0 14px', border: '1px solid #c9d4d2', borderRadius: '8px', fontSize: '14px', color: '#191c1d', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.target.style.borderColor = '#00685f'; e.target.style.boxShadow = '0 0 0 3px rgba(0,104,95,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#c9d4d2'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', height: '44px', borderRadius: '8px', backgroundColor: '#00685f', color: '#ffffff', fontSize: '15px', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#005049'; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#00685f'; }}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>progress_activity</span>
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
                  </>
                )}
              </button>

              {/* Need access */}
              <p style={{ fontSize: '13px', textAlign: 'center', color: '#6b7573', margin: 0 }}>
                Need access?{' '}
                <a href="mailto:support@atomberg.com" style={{ color: '#00685f', fontWeight: 600, textDecoration: 'none' }}>
                  Contact your Administrator
                </a>
              </p>
            </form>
          </div>

          {/* Quick Demo Login — outside the card */}
          <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9eaaa8', margin: 0 }}>
              Quick Demo Login
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {Object.entries(DEMO_CREDENTIALS).map(([role, cred]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleLoginAs(role)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingLeft: '16px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'background-color 0.15s',
                    backgroundColor:
                      role === 'admin' ? '#eef8f6' :
                      role === 'manager' ? '#f0f4ff' :
                      '#ecfdf5',
                    border: `1px solid ${
                      role === 'admin' ? '#bfe2dc' :
                      role === 'manager' ? '#c2d6ff' :
                      '#a7f3d0'
                    }`,
                    color:
                      role === 'admin' ? '#00685f' :
                      role === 'manager' ? '#3b82f6' :
                      '#059669',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {role === 'admin' ? 'key' : role === 'manager' ? 'analytics' : 'badge'}
                  </span>
                  Login as {cred.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>


      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !forgotLoading && setShowForgot(false)}
          />
          <div className="bg-white rounded-2xl shadow-2xl border border-[#e1e3e4] w-full max-w-[420px] overflow-hidden relative z-10">
            <div className="px-6 py-5 border-b border-[#f3f4f5] flex items-center justify-between bg-[#f9fbfa]">
              <h2 className="text-[16px] font-bold text-[#191c1d]">Reset your password</h2>
              <button
                onClick={() => !forgotLoading && setShowForgot(false)}
                className="w-8 h-8 rounded-full hover:bg-[#e0e8e5] flex items-center justify-center text-[#586270] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleForgotSubmit} className="px-6 py-6 space-y-5">
              <p className="text-[14px] text-[#586270] leading-relaxed">
                Enter your account email. We will send a password reset link if it exists.
              </p>
              <div>
                <label className="block text-[13px] font-semibold text-[#191c1d] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  placeholder="name@atomberg.com"
                  className="w-full h-11 px-4 border border-[#c9d4d2] rounded-xl bg-[#f9fbfa] text-[14px] text-[#191c1d] focus:bg-white focus:outline-none focus:border-[#00685f] focus:ring-4 focus:ring-[#00685f]/10 transition-all"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  disabled={forgotLoading}
                  className="h-10 px-5 rounded-xl border border-[#D0D5DD] text-[#344054] text-[14px] font-medium hover:bg-[#F9FAFB] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="h-10 px-5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[14px] font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}