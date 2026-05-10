import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import './css/login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const result = login(email, password);
      if (result.success) {
        sessionStorage.setItem('jokel-welcome', '1');
        navigate('/workspace');
      } else {
        setError(result.error);
        setIsLoading(false);
      }
    }, 600);
  };

  const fillDemo = () => {
    setEmail('demo@demo.com');
    setPassword('Demo123');
    setError('');
  };

  return (
    <div className="login-page">

      <div className="login-brand">
        <div className="login-brand-icon">
          <Layers size={20} />
        </div>
        <span className="login-brand-text">Jokel</span>
      </div>

      <div className="login-card">

        <div className="login-header">
          <h1>Welcome back</h1>
          <p>Sign in to your workspace to continue.</p>
        </div>

        {/* Demo account hint */}
        <button type="button" className="login-demo-pill" onClick={fillDemo}>
          <Sparkles size={14} />
          <span>Use demo account</span>
          <span className="login-demo-hint">demo@demo.com / Demo123</span>
        </button>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label>Email address</label>
            <div className="login-input-wrap">
              <Mail size={15} className="login-input-icon" />
              <input
                type="email"
                autoFocus
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="login-input-wrap">
              <Lock size={15} className="login-input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="login-remember">
              <input type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>
            <button type="button" className="login-forgot">Forgot password?</button>
          </div>

          <button type="submit" className="login-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="login-spinner" />
            ) : (
              <>
                Sign in <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button className="login-guest" onClick={() => navigate('/workspace')}>
          Continue as guest
        </button>
      </div>

      <div className="login-footer">
        <span>Don't have an account?</span>
        <button className="login-signup">Create account</button>
      </div>
    </div>
  );
}
