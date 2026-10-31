import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { signIn, signUp, useSession } from '../services/auth';

// One page for both sign in and sign up (?mode=signup).
export default function Account({ mode }) {
  const isSignUp = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const next = location.state?.from || '/';

  if (session) return <Navigate to={next} replace />;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = isSignUp
      ? await signUp.email({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      : await signIn.email({ email: form.email.trim(), password: form.password });
    setLoading(false);
    if (err) return setError(err.message || 'Something went wrong');
    navigate(next, { replace: true });
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h1>{isSignUp ? 'Create account' : 'Sign in'}</h1>
      <form className="search card" onSubmit={submit}>
        {isSignUp && (
          <label className="field"><span>Name</span>
            <input value={form.name} required onChange={set('name')} autoComplete="name" />
          </label>
        )}
        <label className="field"><span>Email</span>
          <input type="email" value={form.email} required onChange={set('email')} autoComplete="email" />
        </label>
        <label className="field"><span>Password</span>
          <input type="password" value={form.password} required minLength={8} onChange={set('password')}
            autoComplete={isSignUp ? 'new-password' : 'current-password'} />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      <p className="muted small">
        {isSignUp
          ? <>Already have an account? <a href="/signin" onClick={(e) => { e.preventDefault(); navigate('/signin', { state: location.state }); }}>Sign in</a></>
          : <>New here? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup', { state: location.state }); }}>Create an account</a></>}
      </p>
    </>
  );
}
