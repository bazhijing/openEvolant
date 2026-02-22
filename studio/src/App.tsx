import { useTranslation } from 'react-i18next';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Evolution from './pages/Evolution';
import Evaluator from './pages/Evaluator';
import Genes from './pages/Genes';
import NaturalSelector from './pages/NaturalSelector';
import Settings from './pages/Settings';

const navPaths = [
  { to: '/', key: 'nav.home' },
  { to: '/chat', key: 'nav.chat' },
  { to: '/evolution', key: 'nav.evolution' },
  { to: '/genes', key: 'nav.genes' },
  { to: '/ns', key: 'nav.naturalSelector' },
  { to: '/evaluator', key: 'nav.evaluator' },
  { to: '/settings', key: 'nav.settings' },
] as const;

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function getHeaderKey(pathname: string): string {
  if (pathname === '/') return 'nav.home';
  if (pathname.startsWith('/chat')) return 'nav.chat';
  if (pathname.startsWith('/evolution')) return 'nav.evolution';
  if (pathname.startsWith('/genes')) return 'nav.genes';
  if (pathname.startsWith('/ns')) return 'nav.naturalSelector';
  if (pathname.startsWith('/evaluator')) return 'nav.evaluator';
  if (pathname.startsWith('/settings')) return 'nav.settings';
  return 'nav.home';
}

export default function App() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-surface text-zinc-200 font-sans">
        
      <aside className="w-[220px] shrink-0 border-r border-surface-border bg-surface-elevated/80 backdrop-blur-sm flex flex-col">
        <div className="p-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-red shadow-neon-red-sm animate-pulse" />
            <h2 className="text-sm font-semibold tracking-tight text-white">{t('app.title')}</h2>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navPaths.map(({ to, key }) => {
            const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link key={to} to={to} className="block">
                <motion.span
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-neon-red/15 text-neon-red border border-neon-red/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                  }`}
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {t(key)}
                </motion.span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-surface-border space-y-3">
          <a
            href="https://discord.gg/kueXC3vMKZ"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-[#5865F2]/20 border border-[#5865F2]/40 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            {t('app.discord')}
          </a>
          <p className="text-[11px] text-zinc-500 tracking-wide">{t('app.brand')}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-surface-border flex items-center px-6 bg-surface/50 backdrop-blur-sm">
          <span className="text-sm text-zinc-500 capitalize">
            {t(getHeaderKey(location.pathname))}
          </span>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/chat" element={<PageTransition><Chat /></PageTransition>} />
              <Route path="/evolution" element={<PageTransition><Evolution /></PageTransition>} />
              <Route path="/genes" element={<PageTransition><Genes /></PageTransition>} />
              <Route path="/ns" element={<PageTransition><NaturalSelector /></PageTransition>} />
              <Route path="/evaluator" element={<PageTransition><Evaluator /></PageTransition>} />
              <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
