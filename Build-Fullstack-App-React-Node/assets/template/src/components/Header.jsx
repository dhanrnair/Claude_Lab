import { Link, NavLink } from 'react-router-dom';
import { signOut, useSession } from '../services/auth';

export default function Header() {
  const { data: session, isPending } = useSession();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">__APP_NAME__</Link>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          {!isPending && (session ? (
            <>
              <span className="muted small">{session.user.name}</span>
              <button type="button" className="link-button" onClick={() => signOut()}>Sign out</button>
            </>
          ) : (
            <NavLink to="/signin">Sign in</NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
