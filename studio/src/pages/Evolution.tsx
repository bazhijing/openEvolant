import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Progress,
} from '@heroui/react';

// Icons
const IconRocket = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.84 2.58a14.927 14.927 0 014.08 2.75 14.927 14.927 0 014.08-2.75m-5.84 2.58v4.8m0 0v4.8a6 6 0 005.84-7.38" />
  </svg>
);
const IconDna = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12c0-1.2-.4-2.3-1.1-3.2l2.2-2.2a.75.75 0 000-1.06l-1.06-1.06a.75.75 0 00-1.06 0l-2.2 2.2A5.25 5.25 0 0012 4.5c-1.2 0-2.3.4-3.2 1.1L6.6 3.4a.75.75 0 00-1.06 0L4.47 4.47a.75.75 0 000 1.06l2.2 2.2a5.25 5.25 0 00-1.1 3.2c0 1.2.4 2.3 1.1 3.2l-2.2 2.2a.75.75 0 000 1.06l1.06 1.06a.75.75 0 001.06 0l2.2-2.2c.8.7 1.9 1.1 3.2 1.1s2.3-.4 3.2-1.1l2.2 2.2a.75.75 0 001.06 0l1.06-1.06a.75.75 0 000-1.06l-2.2-2.2c.7-.9 1.1-2 1.1-3.2z" />
  </svg>
);
const IconMore = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);
const IconPlay = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
);
const IconPause = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);
const IconStop = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
);
const IconClock = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconLoop = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

type RunStatus = 'running' | 'paused';
type ScheduleType = 'continuous' | 'scheduled';
type StatusFilter = 'all' | 'running' | 'paused';

type ActiveRun = {
  id: string;
  speciesName: string;
  genePool: string;
  evaluator: string;
  policy: string;
  status: RunStatus;
  scheduleType?: ScheduleType;
  generation: number;
  bestScore: number;
  progressPercent: number;
  startedAt: string;
};

const MOCK_POOLS = ['default.genes', 'reasoning-pool.genes', 'code-gen.genes'];
const MOCK_EVALUATORS = ['AI Quality', 'Cost + Latency', 'Accuracy'];
const MOCK_POLICIES = ['balanced.ns', 'aggressive.ns', 'conservative.ns'];

function genId(): string {
  return 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

export default function Evolution() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [speciesName, setSpeciesName] = useState('');
  const [genePool, setGenePool] = useState(MOCK_POOLS[0]);
  const [evaluator, setEvaluator] = useState(MOCK_EVALUATORS[0]);
  const [policy, setPolicy] = useState(MOCK_POLICIES[0]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [runs, setRuns] = useState<ActiveRun[]>(() => [
    {
      id: genId(),
      speciesName: 'Agent Reasoning v2',
      genePool: 'reasoning-pool.genes',
      evaluator: 'AI Quality',
      policy: 'balanced.ns',
      status: 'running',
      scheduleType: 'continuous',
      generation: 12,
      bestScore: 0.87,
      progressPercent: 42,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: genId(),
      speciesName: 'Code Gen Pool',
      genePool: 'code-gen.genes',
      evaluator: 'Cost + Latency',
      policy: 'aggressive.ns',
      status: 'paused',
      scheduleType: 'scheduled',
      generation: 8,
      bestScore: 0.72,
      progressPercent: 28,
      startedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  const handleStart = () => {
    const name = speciesName.trim() || t('evolution.newEvolution');
    setRuns((prev) => [
      {
        id: genId(),
        speciesName: name,
        genePool,
        evaluator,
        policy,
        status: 'running',
        scheduleType: 'continuous',
        generation: 0,
        bestScore: 0,
        progressPercent: 0,
        startedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setSpeciesName('');
    setGenePool(MOCK_POOLS[0]);
    setEvaluator(MOCK_EVALUATORS[0]);
    setPolicy(MOCK_POLICIES[0]);
    setModalOpen(false);
  };

  const togglePause = (id: string) => {
    setRuns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 'running' ? 'paused' : 'running' } : r))
    );
  };

  const stopRun = (id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
  };

  const filteredRuns = useMemo(
    () => runs.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [runs, statusFilter]
  );
  const runningCount = runs.filter((r) => r.status === 'running').length;
  const pausedCount = runs.filter((r) => r.status === 'paused').length;

  // Simulate progress for running items (frontend-only demo)
  useEffect(() => {
    const interval = setInterval(() => {
      setRuns((prev) =>
        prev.map((r) => {
          if (r.status !== 'running') return r;
          return {
            ...r,
            generation: r.generation + (Math.random() > 0.6 ? 1 : 0),
            bestScore: Math.min(0.98, r.bestScore + Math.random() * 0.015),
            progressPercent: Math.min(98, r.progressPercent + (Math.random() > 0.5 ? 1 : 0)),
          };
        })
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl relative"
    >
      {/* Subtle background decoration */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-[0.03]"
        aria-hidden
      >
      
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-red rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-neon-red rounded-full blur-3xl" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neon-red/90 mb-1.5">{t('evol')}</p>
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1 relative">{t('evolution.title')}</h1>
      <p className="text-zinc-400 text-sm mb-8 relative">{t('evolution.subtitle')}</p>

      {/* Launch new evolution — hero CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative mb-10"
      >
        <Card
          className="bg-gradient-to-br from-surface-elevated to-surface-muted border border-neon-red/20 shadow-glow overflow-hidden cursor-pointer hover:border-neon-red/40 hover:shadow-neon-red/20 transition-all duration-300 group"
          isPressable
          onPress={() => setModalOpen(true)}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,8,68,0.12),transparent)] pointer-events-none" />
          <CardBody className="relative flex flex-row items-center gap-6 p-6 sm:p-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neon-red/15 border border-neon-red/30 text-neon-red group-hover:scale-105 transition-transform">
              <IconRocket />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white mb-1">{t('evolution.launchNew')}</h2>
              <p className="text-zinc-400 text-sm">
                {t('evolution.newEvolution')} — {t('evolution.genePool')}, {t('evolution.evaluator')}, {t('evolution.policy')}.
              </p>
            </div>
            <Button
              color="danger"
              className="btn-neon-primary font-medium shrink-0"
              startContent={<IconDna />}
              onPress={() => setModalOpen(true)}
            >
              {t('evolution.start')}
            </Button>
          </CardBody>
        </Card>
      </motion.div>

      {/* Active evolutions */}
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-neon-red/90">
              {t('evolution.manageActive')}
            </span>
            <Chip size="sm" variant="flat" classNames={{ base: 'bg-neon-red/10 border border-neon-red/20', content: 'text-neon-red/90' }}>
              {t('evolution.activeCount', { count: runs.length })}
            </Chip>
          </div>
          {runs.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {(
                [
                  { value: 'all' as const, label: t('evolution.filterAll'), count: runs.length },
                  { value: 'running' as const, label: t('evolution.statusRunning'), count: runningCount },
                  { value: 'paused' as const, label: t('evolution.statusPaused'), count: pausedCount },
                ] as const
              ).map(({ value, label, count }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    statusFilter === value
                      ? value === 'all'
                        ? 'bg-neon-red/20 text-neon-red border border-neon-red/30 shadow-[0_0_12px_-4px_rgba(255,8,68,0.3)]'
                        : value === 'running'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_-4px_rgba(16,185,129,0.3)]'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_-4px_rgba(245,158,11,0.3)]'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span className="tabular-nums">{label}</span>
                  <span className="ml-1.5 opacity-80">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {filteredRuns.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-surface-border bg-surface-elevated/50 py-16 text-center"
            >
              {runs.length === 0 ? (
                <>
                  <p className="text-zinc-500 text-sm mb-1">{t('evolution.noActive')}</p>
                  <p className="text-zinc-600 text-xs">{t('evolution.noActiveHint')}</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-500 text-sm mb-1">{t('evolution.filterNoMatch')}</p>
                  <p className="text-zinc-600 text-xs">
                    {t('evolution.statusRunning')} · {runningCount} · {t('evolution.statusPaused')} · {pausedCount}
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRuns.map((run, i) => (
                <motion.div
                  key={run.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="h-full"
                >
                  <Card
                    className={`h-full bg-surface-elevated/80 backdrop-blur-sm border overflow-hidden transition-all duration-300 group hover:shadow-lg ${
                      run.status === 'running'
                        ? 'border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_24px_-8px_rgba(16,185,129,0.25)]'
                        : 'border-surface-border hover:border-amber-500/30'
                    }`}
                  >
                    {/* Top accent bar */}
                    <div
                      className={`h-0.5 w-full ${
                        run.status === 'running'
                          ? 'bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent'
                          : 'bg-gradient-to-r from-transparent via-amber-500/50 to-transparent'
                      }`}
                    />
                    <CardBody className="p-4 flex flex-col gap-3">
                      {/* Header: status dot + name + schedule badge + menu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              run.status === 'running'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                          <h3 className="text-sm font-semibold text-white truncate">{run.speciesName}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {run.scheduleType && (
                            <Chip
                              size="sm"
                              variant="flat"
                              startContent={run.scheduleType === 'continuous' ? <IconLoop /> : <IconClock />}
                              classNames={{
                                base: 'h-6 min-w-0 px-1.5 bg-white/5 border border-white/10',
                                content: 'text-[10px] text-zinc-400',
                              }}
                            >
                              {run.scheduleType === 'continuous' ? 'Continuous' : 'Scheduled'}
                            </Chip>
                          )}
                          <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="min-w-6 w-6 h-6 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-200 transition-opacity"
                              >
                                <IconMore />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Actions">
                              <DropdownItem key="view">{t('evolution.view')}</DropdownItem>
                              <DropdownItem key="pause" onPress={() => togglePause(run.id)}>
                                {run.status === 'running' ? t('evolution.pause') : t('evolution.resume')}
                              </DropdownItem>
                              <DropdownItem key="stop" className="text-danger" onPress={() => stopRun(run.id)}>
                                {t('evolution.stop')}
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        </div>
                      </div>

                      {/* Status chip */}
                      <Chip
                        size="sm"
                        variant="flat"
                        classNames={{
                          base:
                            run.status === 'running'
                              ? 'bg-emerald-500/15 border border-emerald-500/25 w-fit'
                              : 'bg-amber-500/15 border border-amber-500/25 w-fit',
                          content: run.status === 'running' ? 'text-emerald-400 text-xs' : 'text-amber-400 text-xs',
                        }}
                      >
                        {run.status === 'running' ? t('evolution.statusRunning') : t('evolution.statusPaused')}
                      </Chip>

                      {/* Metrics grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">{t('evolution.generation')}</span>
                          <span className="font-mono text-zinc-300 tabular-nums">{run.generation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">{t('evolution.bestScore')}</span>
                          <span className="font-mono text-neon-red tabular-nums">{run.bestScore.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                          <span>{t('evolution.progress')}</span>
                          <span className="font-mono tabular-nums">{run.progressPercent}%</span>
                        </div>
                        <Progress
                          size="sm"
                          value={run.progressPercent}
                          classNames={{
                            base: 'h-1.5 rounded-full bg-white/5',
                            indicator:
                              run.status === 'running'
                                ? 'bg-gradient-to-r from-emerald-500/80 to-neon-red rounded-full'
                                : 'bg-gradient-to-r from-amber-500/60 to-amber-500/40 rounded-full',
                          }}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-0.5 mt-auto">
                        <Button
                          size="sm"
                          variant="flat"
                          className="flex-1 bg-white/5 text-zinc-300 hover:bg-neon-red/10 hover:text-neon-red text-xs"
                          startContent={run.status === 'running' ? <IconPause /> : <IconPlay />}
                          onPress={() => togglePause(run.id)}
                        >
                          {run.status === 'running' ? t('evolution.pause') : t('evolution.resume')}
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 text-xs min-w-0 px-2"
                          startContent={<IconStop />}
                          onPress={() => stopRun(run.id)}
                        >
                          {t('evolution.stop')}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* New evolution modal */}
      <Modal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        classNames={{
          base: 'bg-surface-elevated border border-surface-border',
          header: 'border-b border-surface-border',
          body: 'py-6',
          footer: 'border-t border-surface-border',
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">{t('evolution.newEvolution')}</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label={t('evolution.speciesName')}
              placeholder={t('evolution.speciesNamePlaceholder')}
              value={speciesName}
              onValueChange={setSpeciesName}
              classNames={{
                inputWrapper: 'rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus-within:border-neon-red',
                input: 'text-zinc-200',
                label: 'text-zinc-400',
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">{t('evolution.genePool')}</label>
                <select
                  className="w-full rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus:border-neon-red focus:outline-none focus:ring-1 focus:ring-neon-red/30 px-3 py-2.5 text-sm text-zinc-200"
                  value={genePool}
                  onChange={(e) => setGenePool(e.target.value)}
                >
                  {MOCK_POOLS.map((p) => (
                    <option key={p} value={p} className="bg-surface-elevated text-zinc-200">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">{t('evolution.evaluator')}</label>
                <select
                  className="w-full rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus:border-neon-red focus:outline-none focus:ring-1 focus:ring-neon-red/30 px-3 py-2.5 text-sm text-zinc-200"
                  value={evaluator}
                  onChange={(e) => setEvaluator(e.target.value)}
                >
                  {MOCK_EVALUATORS.map((e) => (
                    <option key={e} value={e} className="bg-surface-elevated text-zinc-200">
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">{t('evolution.policy')}</label>
                <select
                  className="w-full rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus:border-neon-red focus:outline-none focus:ring-1 focus:ring-neon-red/30 px-3 py-2.5 text-sm text-zinc-200"
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                >
                  {MOCK_POLICIES.map((p) => (
                    <option key={p} value={p} className="bg-surface-elevated text-zinc-200">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              {t('evolution.demoOnly')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setModalOpen(false)} className="text-zinc-400">
              {t('evolution.cancel')}
            </Button>
            <Button color="danger" className="btn-neon-primary" onPress={handleStart}>
              {t('evolution.start')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
