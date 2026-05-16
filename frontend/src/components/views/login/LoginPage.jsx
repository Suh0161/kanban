import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, ArrowRight, Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2, X, MessageSquare, Paperclip, Calendar, CheckSquare } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import { apiFetch } from '../../../api/client.js';
import './css/login.css';

// Fake board data matching our actual card structure
const BOARD_COLS = [
  {
    title: 'To Do',
    cards: [
      { id: 1, code: 'SKY-1000', title: 'User auth flow', tag: 'Feature', priority: 'high',
        desc: 'Implement JWT-based login, registration, and session management with bcrypt password hashing.',
        comments: 3, attachments: 1, due: 'Jun 2', assignee: 'Alice' },
      { id: 2, code: 'SKY-1001', title: 'API rate limiting', tag: 'Security', priority: 'critical',
        desc: 'Add rate limiting middleware to prevent brute-force attacks. Lock accounts after 5 failed attempts.',
        comments: 5, attachments: 0, due: 'May 28', assignee: null },
      { id: 3, code: 'SKY-1002', title: 'Dark mode polish', tag: 'Design', priority: 'low',
        desc: 'Review all CSS variables and ensure consistent dark theme across all views and modals.',
        comments: 1, attachments: 2, due: null, assignee: 'Bob' },
    ],
  },
  {
    title: 'In Progress',
    cards: [
      { id: 4, code: 'SKY-1003', title: 'Kanban drag-drop', tag: 'Feature', priority: 'high',
        desc: 'Integrate @hello-pangea/dnd for smooth card reordering within and between columns.',
        comments: 7, attachments: 0, due: 'May 30', assignee: 'Alice' },
      { id: 5, code: 'SKY-1004', title: 'Sprint planning', tag: 'Planning', priority: 'medium',
        desc: 'Build backlog view with sprint staging, grooming readiness indicators, and planning health metrics.',
        comments: 2, attachments: 1, due: 'Jun 5', assignee: 'Carol' },
    ],
  },
  {
    title: 'Review',
    cards: [
      { id: 6, code: 'SKY-1005', title: 'Webhook delivery', tag: 'Backend', priority: 'medium',
        desc: 'Implement outbound webhook system with HMAC signing, retry logic, and delivery logs.',
        comments: 4, attachments: 0, due: 'May 27', assignee: 'Bob' },
      { id: 7, code: 'SKY-1006', title: 'Member roles', tag: 'Feature', priority: 'high',
        desc: 'Add owner/admin/member role system with proper permission checks on all workspace endpoints.',
        comments: 6, attachments: 1, due: 'May 29', assignee: 'Alice' },
      { id: 8, code: 'SKY-1007', title: 'Audit logging', tag: 'Security', priority: 'critical',
        desc: 'Log all significant user actions with timestamps, user IDs, and entity references for compliance.',
        comments: 2, attachments: 0, due: 'May 26', assignee: 'Carol' },
    ],
  },
  {
    title: 'Done',
    cards: [
      { id: 9,  code: 'SKY-1008', title: 'JWT sessions', tag: 'Security', priority: 'high',
        desc: 'Implemented JWT authentication with 7-day expiry and secure localStorage token management.',
        comments: 3, attachments: 0, due: null, assignee: 'Bob' },
      { id: 10, code: 'SKY-1009', title: 'Custom fields', tag: 'Feature', priority: 'medium',
        desc: 'Added workspace-level custom field definitions (text, number, dropdown, date) that appear on all tasks.',
        comments: 8, attachments: 2, due: null, assignee: 'Alice' },
    ],
  },
];

const PRIORITY_DOT = {
  critical: 'var(--color-red)',
  high:     'var(--color-orange)',
  medium:   'var(--color-yellow)',
  low:      'var(--color-blue)',
};

function getPasswordStrength(pw) {
  return [pw.length >= 8, /[A-Z]/.test(pw), /[a-z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
}

function StrengthBar({ password }) {
  if (!password) return null;
  const score = getPasswordStrength(password);
  const colors = ['', '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#30d158'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  return (
    <div className="lp-strength">
      <div className="lp-strength-bars">
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ background: i <= score ? colors[score] : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <span style={{ color: colors[score] || 'rgba(255,255,255,0.3)' }}>{labels[score]}</span>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ready, setReady] = useState(false);
  const [peekCard, setPeekCard] = useState(null);
  const [showHint, setShowHint] = useState(false);

  // Animated card that "moves" across columns
  const [activeCard, setActiveCard] = useState(null);
  const timerRef = useRef(null);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [rName, setRName]       = useState('');
  const [rEmail, setREmail]     = useState('');
  const [rPw, setRPw]           = useState('');
  const [rConfirm, setRConfirm] = useState('');
  const [showRPw, setShowRPw]   = useState(false);
  const [terms, setTerms]       = useState(false);
  const [dataConsent, setDataConsent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Show hint after board loads, hide after 4s
  useEffect(() => {
    if (!ready) return;
    const t1 = setTimeout(() => setShowHint(true), 800);
    const t2 = setTimeout(() => setShowHint(false), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [ready]);

  // Cycle through cards to highlight them
  useEffect(() => {
    const allCards = BOARD_COLS.flatMap((col, ci) => col.cards.map((card, ri) => ({ ...card, ci, ri })));
    let i = 0;
    timerRef.current = setInterval(() => {
      setActiveCard(allCards[i % allCards.length].id);
      i++;
    }, 1800);
    return () => clearInterval(timerRef.current);
  }, []);

  const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      sessionStorage.setItem('jokel-welcome', '1');
      // Clear any persisted view so user always lands on Boards
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('jokel-active-view-')) localStorage.removeItem(k);
      });
      navigate('/workspace');
    } else {
      setError(result.error || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (rPw !== rConfirm) { setError('Passwords do not match'); return; }
    if (getPasswordStrength(rPw) < 4) { setError('Password is too weak'); return; }
    if (!terms || !dataConsent) { setError('Please accept both consent checkboxes'); return; }
    setLoading(true);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: rEmail.trim().toLowerCase(), name: rName.trim(), password: rPw }),
      });
      setSuccess('Account created — you can now sign in.');
      switchMode('login');
      setEmail(rEmail.trim().toLowerCase());
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`lp-root ${ready ? 'lp-ready' : ''}`}>

      {/* ── Animated board background ── */}
      <div className="lp-board-bg" aria-hidden="true">
        <div className="lp-board-fade-top" />
        <div className="lp-board-fade-bottom" />
        <div className="lp-board-fade-left" />
        <div className="lp-board-fade-right" />
        {/* Floating hint */}
        {showHint && !peekCard && (
          <div className="lp-board-hint">
            <span>👆</span> Click any card to preview
          </div>
        )}
        <div className="lp-board-inner">
          {BOARD_COLS.map((col, ci) => (
            <div key={col.title} className="lp-col" style={{ '--ci': ci }}>
              {/* Column header — matches .column-header */}
              <div className="lp-col-header">
                <h3 className="lp-col-title">{col.title}</h3>
                <span className="lp-col-count">{col.cards.length}</span>
              </div>
              {/* Cards — matches .column-content */}
              <div className="lp-col-cards">
                {col.cards.map((card, ri) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`lp-card ${activeCard === card.id ? 'lp-card-active' : ''}`}
                    style={{ '--ri': ri, '--ci': ci }}
                    onClick={() => { setPeekCard(card); clearInterval(timerRef.current); }}
                    title="Click to preview"
                  >
                  {/* Code row — matches .card-header / .card-id */}
                    <div className="lp-card-code">
                      <span
                        className="lp-card-dot"
                        style={{ background: PRIORITY_DOT[card.priority] }}
                      />
                      {card.code}
                    </div>

                    {/* Title — matches .card-title */}
                    <div className="lp-card-title">{card.title}</div>

                    {/* Tag — matches .tag.type-label */}
                    <div className="lp-card-tags">
                      <span className="lp-card-tag">{card.tag}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Auth panel ── */}
      <div className="lp-panel">
        {/* Logo */}
        <div className="lp-logo">
          <div className="lp-logo-icon"><Layers size={16} /></div>
          <span>Jokel</span>
        </div>

        {/* Tabs */}
        <div className="lp-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Create account</button>
          <div className="lp-tab-pill" style={{ transform: `translateX(${mode === 'login' ? '0%' : '100%'})` }} />
        </div>

        {/* Heading — only one at a time */}
        <div className="lp-heading">
          <h1>{mode === 'login' ? 'Welcome back' : 'Get started'}</h1>
          <p>{mode === 'login' ? 'Sign in to your workspace.' : 'Create your free account.'}</p>
        </div>

        {success && <div className="lp-banner lp-success"><CheckCircle2 size={14} />{success}</div>}
        {error   && <div className="lp-banner lp-error"><AlertCircle size={14} />{error}</div>}

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="lp-form" key="login" noValidate>
            <div className="lp-field" style={{ '--i': 0 }}>
              <label htmlFor="l-email">Email</label>
              <div className="lp-input-wrap">
                <Mail size={13} />
                <input id="l-email" type="email" autoComplete="email" autoFocus
                  placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="lp-field" style={{ '--i': 1 }}>
              <div className="lp-field-row">
                <label htmlFor="l-pw">Password</label>
                <button type="button" className="lp-ghost-btn">Forgot?</button>
              </div>
              <div className="lp-input-wrap">
                <Lock size={13} />
                <input id="l-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="lp-eye" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div className="lp-field" style={{ '--i': 2 }}>
              <button type="submit" className="lp-submit" disabled={loading || !email || !password}>
                {loading ? <span className="lp-spinner" /> : <><span>Sign in</span><ArrowRight size={14} /></>}
              </button>
            </div>
          </form>
        )}

        {/* Register form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="lp-form" key="register" noValidate>
            <div className="lp-field" style={{ '--i': 0 }}>
              <label htmlFor="r-name">Full name</label>
              <div className="lp-input-wrap">
                <User size={13} />
                <input id="r-name" type="text" autoComplete="name" autoFocus
                  placeholder="Your name" value={rName}
                  onChange={e => setRName(e.target.value)} maxLength={100} required />
              </div>
            </div>
            <div className="lp-field" style={{ '--i': 1 }}>
              <label htmlFor="r-email">Email</label>
              <div className="lp-input-wrap">
                <Mail size={13} />
                <input id="r-email" type="email" autoComplete="email"
                  placeholder="you@company.com" value={rEmail}
                  onChange={e => setREmail(e.target.value)} required />
              </div>
            </div>
            <div className="lp-field" style={{ '--i': 2 }}>
              <label htmlFor="r-pw">Password</label>
              <div className="lp-input-wrap">
                <Lock size={13} />
                <input id="r-pw" type={showRPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Min 8 chars, mixed case + symbol" value={rPw}
                  onChange={e => setRPw(e.target.value)} required />
                <button type="button" className="lp-eye" onClick={() => setShowRPw(v => !v)} tabIndex={-1}>
                  {showRPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <StrengthBar password={rPw} />
            </div>
            <div className="lp-field" style={{ '--i': 3 }}>
              <label htmlFor="r-confirm">Confirm password</label>
              <div className="lp-input-wrap">
                <Lock size={13} />
                <input id="r-confirm" type="password" autoComplete="new-password"
                  placeholder="Repeat password" value={rConfirm}
                  onChange={e => setRConfirm(e.target.value)} required />
              </div>
            </div>
            <div className="lp-consents" style={{ '--i': 4 }}>
              <label className="lp-consent">
                <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
                <span>I agree to the <Link to="/terms" className="lp-link" target="_blank">Terms</Link> and <Link to="/privacy" className="lp-link" target="_blank">Privacy Policy</Link></span>
              </label>
              <label className="lp-consent">
                <input type="checkbox" checked={dataConsent} onChange={e => setDataConsent(e.target.checked)} />
                <span>I consent to data processing for the Jokel service</span>
              </label>
            </div>
            <div className="lp-field" style={{ '--i': 5 }}>
              <button type="submit" className="lp-submit"
                disabled={loading || !rName || !rEmail || !rPw || !rConfirm || !terms || !dataConsent}>
                {loading ? <span className="lp-spinner" /> : <><span>Create account</span><ArrowRight size={14} /></>}
              </button>
            </div>
          </form>
        )}

        <div className="lp-footer">
          <Link to="/privacy" target="_blank">Privacy</Link>
          <span>·</span>
          <Link to="/terms" target="_blank">Terms</Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} Jokel</span>
        </div>
      </div>

      {/* ── Card peek modal ── */}
      {peekCard && (
        <div className="lp-peek-backdrop" onClick={() => setPeekCard(null)}>
          <div className="lp-peek" onClick={e => e.stopPropagation()}>
            <div className="lp-peek-header">
              <div className="lp-peek-code">
                <span className="lp-card-dot" style={{ background: PRIORITY_DOT[peekCard.priority] }} />
                {peekCard.code}
                <span className="lp-peek-priority">{peekCard.priority}</span>
              </div>
              <button type="button" className="lp-peek-close" onClick={() => setPeekCard(null)}>
                <X size={14} />
              </button>
            </div>

            <h3 className="lp-peek-title">{peekCard.title}</h3>

            <div className="lp-peek-tags">
              <span className="lp-card-tag">{peekCard.tag}</span>
              {peekCard.due && (
                <span className="lp-peek-due">
                  <Calendar size={11} /> {peekCard.due}
                </span>
              )}
            </div>

            <p className="lp-peek-desc">{peekCard.desc}</p>

            <div className="lp-peek-meta">
              <span><MessageSquare size={12} /> {peekCard.comments} comments</span>
              <span><Paperclip size={12} /> {peekCard.attachments} attachments</span>
              <span><CheckSquare size={12} /> 0/3 checklist</span>
            </div>

            <div className="lp-peek-footer">
              <div className="lp-peek-assignee">
                {peekCard.assignee ? (
                  <>
                    <img
                      src={`https://api.dicebear.com/7.x/notionists-neutral/png?seed=${peekCard.assignee}`}
                      alt={peekCard.assignee}
                      className="lp-peek-avatar"
                    />
                    <span>{peekCard.assignee}</span>
                  </>
                ) : (
                  <span className="lp-peek-unassigned">Unassigned</span>
                )}
              </div>
              <div className="lp-peek-cta">
                <span>Sign in to open this task</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
