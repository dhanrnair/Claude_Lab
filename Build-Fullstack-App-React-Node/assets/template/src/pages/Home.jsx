import { useEffect, useMemo, useState } from 'react';
import { getResources } from '../services/api';

// Every page that fetches data handles three states: loading, error, loaded.
// Never leave the user on "Loading…" if the request fails.
export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    getResources()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => ['All', ...new Set(items.map((i) => i.category))], [items]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => category === 'All' || i.category === category)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }, [items, query, category]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">Could not load data: {error}</p>;

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="chips">
        {categories.map((c) => (
          <button key={c} className={c === category ? 'chip active' : 'chip'} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="muted">Nothing matches your search.</p>
      ) : (
        <div className="grid">
          {visible.map((i) => (
            <div key={i.id} className="card">
              <div className="card-image">{i.image}</div>
              <h3>{i.name}</h3>
              <p className="muted">{i.category}</p>
              <p>{i.description}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
