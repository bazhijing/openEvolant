import { Routes, Route, Link } from 'react-router-dom';
import Chat from './pages/Chat';
import Evolution from './pages/Evolution';
import Settings from './pages/Settings';

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 200, padding: 16, borderRight: '1px solid #27272a' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Evolant Studio</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>
            <Link to="/" style={{ color: '#a1a1aa', textDecoration: 'none' }}>聊天</Link>
          </li>
          <li style={{ marginBottom: 8 }}>
            <Link to="/evolution" style={{ color: '#a1a1aa', textDecoration: 'none' }}>进化管理</Link>
          </li>
          <li style={{ marginBottom: 8 }}>
            <Link to="/settings" style={{ color: '#a1a1aa', textDecoration: 'none' }}>设置</Link>
          </li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/evolution" element={<Evolution />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
