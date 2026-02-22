import { useTranslation } from 'react-i18next';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Chat from './pages/Chat';
import Evolution from './pages/Evolution';
import Evaluator from './pages/Evaluator';
import Genes from './pages/Genes';
import Settings from './pages/Settings';

const navPaths = [
  { to: '/', key: 'nav.chat' },
  { to: '/evolution', key: 'nav.evolution' },
  { to: '/genes', key: 'nav.genes' },
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
  if (pathname === '/') return 'nav.chat';
  if (pathname.startsWith('/evolution')) return 'nav.evolution';
  if (pathname.startsWith('/genes')) return 'nav.genes';
  if (pathname.startsWith('/evaluator')) return 'nav.evaluator';
  if (pathname.startsWith('/settings')) return 'nav.settings';
  return 'nav.chat';
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
        <div className="p-3 border-t border-surface-border">
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
              <Route path="/" element={<PageTransition><Chat /></PageTransition>} />
              <Route path="/evolution" element={<PageTransition><Evolution /></PageTransition>} />
              <Route path="/genes" element={<PageTransition><Genes /></PageTransition>} />
              <Route path="/evaluator" element={<PageTransition><Evaluator /></PageTransition>} />
              <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
