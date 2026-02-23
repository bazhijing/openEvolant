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
  Tooltip,
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
const IconPlus = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const IconStop = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3000' : '';

type StatusFilter = 'all' | 'running' | 'paused';

/** 进化任务（来自 /api/evolutions，正在运行或暂停的 .evolution 文件） */
type Evolution = {
  id: string;
  speciesName: string;
  genePool: string;
  evaluator: string;
  policy: string;
  status: 'running' | 'paused';
  scheduleType?: 'continuous' | 'scheduled';
  generation: number;
  bestScore: number;
  progressPercent: number;
  startedAt: string;
  updatedAt: string;
};

const DEFAULT_GENE_POOL = 'default.genes';
const SELECTION_POLICY = '自然选择';

export default function Evolution() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [speciesName, setSpeciesName] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  const [iterationCount, setIterationCount] = useState('');

  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchEvolutions = () => {
    return fetch(`${API_BASE}/api/evolutions`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: { evolutions?: Evolution[] }) => {
        setEvolutions(Array.isArray(data.evolutions) ? data.evolutions : []);
      });
  };

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchEvolutions()
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Failed to fetch'))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/evolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speciesName: speciesName.trim() || undefined,
          genePool: DEFAULT_GENE_POOL,
          policy: SELECTION_POLICY,
          budgetUsd: budgetUsd.trim() ? Number(budgetUsd) : undefined,
          timeLimitMinutes: timeLimitMinutes.trim() ? Number(timeLimitMinutes) : undefined,
          iterationCount: iterationCount.trim() ? Number(iterationCount) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      setSpeciesName('');
      setBudgetUsd('');
      setTimeLimitMinutes('');
      setIterationCount('');
      setModalOpen(false);
      await fetchEvolutions();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to create evolution');
    }
  };

  const setEvolutionStatus = async (id: string, status: 'running' | 'paused') => {
    try {
      const res = await fetch(`${API_BASE}/api/evolutions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await fetchEvolutions();
    } catch {
      // ignore
    }
  };

  const stopEvolution = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/evolutions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await fetchEvolutions();
    } catch {
      // ignore
    }
  };

  const filteredEvolutions = useMemo(() => {
    if (statusFilter === 'all') return evolutions;
    if (statusFilter === 'running' || statusFilter === 'paused') {
      return evolutions.filter((e) => e.status === statusFilter);
    }
    return evolutions;
  }, [evolutions, statusFilter]);

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
                {t('evolution.newEvolution')} — {t('evolution.newEvolutionSummary')}
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

      {/* Evolution list from /api/evolutions (running / paused) */}
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-neon-red/90">
              {t('evolution.manageActive')}
            </span>
            <Chip size="sm" variant="flat" classNames={{ base: 'bg-neon-red/10 border border-neon-red/20', content: 'text-neon-red/90' }}>
              {t('evolution.activeCount', { count: evolutions.length })}
            </Chip>
          </div>
          {evolutions.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {(
                [
                  { value: 'all' as const, label: t('evolution.filterAll'), count: evolutions.length },
                  { value: 'running' as const, label: t('evolution.filterRunning'), count: evolutions.filter((e) => e.status === 'running').length },
                  { value: 'paused' as const, label: t('evolution.filterPaused'), count: evolutions.filter((e) => e.status === 'paused').length },
                ] as const
              ).map(({ value, label, count }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    statusFilter === value
                      ? value === 'all'
                        ? 'bg-neon-red/20 text-neon-red border border-neon-red/30 shadow-[0_0_12px_-4px_rgba(255,8,68,0.3)]'
                        : value === 'running'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
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
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-surface-border bg-surface-elevated/50 py-16 text-center"
            >
              <p className="text-zinc-500 text-sm">{t('evolution.loading')}</p>
            </motion.div>
          ) : loadError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-red-500/30 bg-surface-elevated/50 py-16 text-center"
            >
              <p className="text-red-400 text-sm">{loadError}</p>
            </motion.div>
          ) : filteredEvolutions.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl"
            >
              <Card
                isPressable
                onPress={() => setModalOpen(true)}
                className="h-full min-h-[200px] border-2 border-blue-400/60 bg-surface-elevated/80 shadow-[0_0_24px_-4px_rgba(59,130,246,0.4)] hover:border-blue-400 hover:shadow-[0_0_32px_-4px_rgba(59,130,246,0.5)] transition-all duration-300 cursor-pointer"
              >
                <CardBody className="flex flex-col items-center justify-center gap-3 py-12">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-blue-400">
                    <IconPlus />
                  </div>
                  <p className="text-zinc-300 text-sm font-medium">{t('evolution.noActive')}</p>
                  <p className="text-zinc-500 text-xs text-center max-w-[260px]">{t('evolution.noActiveHint')}</p>
                  <Button
                    color="primary"
                    variant="flat"
                    className="bg-blue-500/20 text-blue-400 border border-blue-400/40 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]"
                    startContent={<IconRocket />}
                    onPress={() => setModalOpen(true)}
                  >
                    {t('evolution.start')} — {t('evolution.newEvolution')}
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEvolutions.map((evolution, i) => (
                <motion.div
                  key={evolution.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="h-full"
                >
                  <Card
                    className={`h-full bg-surface-elevated/80 backdrop-blur-sm border overflow-hidden transition-all duration-300 group hover:shadow-lg ${
                      evolution.status === 'running'
                        ? 'border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_24px_-8px_rgba(16,185,129,0.25)]'
                        : 'border-surface-border hover:border-neon-red/20'
                    }`}
                  >
                    <div
                      className={`h-0.5 w-full ${
                        evolution.status === 'running'
                          ? 'bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent'
                          : 'bg-gradient-to-r from-transparent via-neon-red/40 to-transparent'
                      }`}
                    />
                    <CardBody className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              evolution.status === 'running'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                : 'bg-amber-500'
                            }`}
                          />
                          <h3 className="text-sm font-semibold text-white truncate">{evolution.speciesName}</h3>
                        </div>
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
                          </DropdownMenu>
                        </Dropdown>
                      </div>

                      <Chip
                        size="sm"
                        variant="flat"
                        classNames={{
                          base:
                            evolution.status === 'running'
                              ? 'bg-emerald-500/15 border border-emerald-500/25 w-fit'
                              : 'bg-amber-500/15 border border-amber-500/25 w-fit',
                          content:
                            evolution.status === 'running'
                              ? 'text-emerald-400 text-xs'
                              : 'text-amber-400 text-xs',
                        }}
                      >
                        {evolution.status === 'running'
                          ? t('evolution.filterRunning')
                          : t('evolution.filterPaused')}
                      </Chip>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">{t('evolution.generation')}</span>
                          <span className="font-mono text-zinc-300 tabular-nums">{evolution.generation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">{t('evolution.bestScore')}</span>
                          <span className="font-mono text-neon-red tabular-nums">{evolution.bestScore.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">{t('evolution.genePool')}</span>
                          <span className="font-mono text-zinc-300 truncate max-w-[100px]" title={evolution.genePool}>{evolution.genePool}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">{t('evolution.progress')}</span>
                          <span className="font-mono text-zinc-300 tabular-nums">{evolution.progressPercent}%</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-0.5 mt-auto items-center">
                        {evolution.status === 'running' ? (
                          <Button
                            size="sm"
                            variant="flat"
                            className="flex-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs"
                            onPress={() => setEvolutionStatus(evolution.id, 'paused')}
                          >
                            {t('evolution.pause')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="flat"
                            className="flex-1 bg-white/5 text-zinc-300 hover:bg-neon-red/10 hover:text-neon-red text-xs"
                            startContent={<IconPlay />}
                            onPress={() => setEvolutionStatus(evolution.id, 'running')}
                          >
                            {t('evolution.resume')}
                          </Button>
                        )}
                        <Tooltip content={t('evolution.stop')} placement="top" delay={300}>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            className="min-w-8 w-8 h-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                            onPress={() => stopEvolution(evolution.id)}
                          >
                            <IconStop />
                          </Button>
                        </Tooltip>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('evolution.genePool')}
                value={DEFAULT_GENE_POOL}
                isReadOnly
                description={t('evolution.genePoolUnavailable')}
                classNames={{
                  inputWrapper: 'rounded-xl bg-white/5 border border-white/10 opacity-80',
                  input: 'text-zinc-400',
                  label: 'text-zinc-500',
                }}
              />
              <Input
                label={t('evolution.policy')}
                value={t('evolution.policyNaturalSelection')}
                isReadOnly
                classNames={{
                  inputWrapper: 'rounded-xl bg-white/5 border border-white/10 opacity-80',
                  input: 'text-zinc-400',
                  label: 'text-zinc-500',
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={t('evolution.budgetUsd')}
                placeholder={t('evolution.budgetUsdPlaceholder')}
                type="number"
                min={0}
                step={0.01}
                value={budgetUsd}
                onValueChange={setBudgetUsd}
                classNames={{
                  inputWrapper: 'rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus-within:border-neon-red',
                  input: 'text-zinc-200',
                  label: 'text-zinc-400',
                }}
              />
              <Input
                label={t('evolution.timeLimitMinutes')}
                placeholder={t('evolution.timeLimitPlaceholder')}
                type="number"
                min={1}
                value={timeLimitMinutes}
                onValueChange={setTimeLimitMinutes}
                classNames={{
                  inputWrapper: 'rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus-within:border-neon-red',
                  input: 'text-zinc-200',
                  label: 'text-zinc-400',
                }}
              />
              <Input
                label={t('evolution.iterationCount')}
                placeholder={t('evolution.iterationCountPlaceholder')}
                type="number"
                min={1}
                value={iterationCount}
                onValueChange={setIterationCount}
                classNames={{
                  inputWrapper: 'rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus-within:border-neon-red',
                  input: 'text-zinc-200',
                  label: 'text-zinc-400',
                }}
              />
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
