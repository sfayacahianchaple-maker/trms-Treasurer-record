import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, getProfile } from '../services/authService';

export default function Login({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user } = await signIn({ email, password });
      const profile = await getProfile(user.id);

      if (!profile) {
        throw new Error('Profile not found.');
      }

      const expectedRole = loginMode === 'admin' ? 'admin' : 'zone_treasurer';
      if (profile.role !== expectedRole) {
        throw new Error(
          loginMode === 'admin'
            ? 'This account is not an Admin account.'
            : 'This account is not a User/Treasurer account.'
        );
      }

      if (onAuthSuccess) await onAuthSuccess();
      navigate(profile.role === 'admin' ? '/admin' : '/treasurer');
    } catch (err) {
      setError(err?.message || 'Email or password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-mark">TRMS</div>
          <h1>TREASURER RECORD MANAGEMENT SYSTEM</h1>
          <p>Secure access for treasurers and administrators</p>
        </div>

        <div className="login-toggle" role="tablist" aria-label="Login mode">
          <button
            type="button"
            className={`toggle-button ${loginMode === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginMode('admin')}
          >
            Admin Login
          </button>
          <button
            type="button"
            className={`toggle-button ${loginMode === 'user' ? 'active' : ''}`}
            onClick={() => setLoginMode('user')}
          >
            User Login
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : loginMode === 'admin' ? 'Admin Login' : 'User Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
