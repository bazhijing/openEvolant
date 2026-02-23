import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Input,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@heroui/react';
const IconSearch = () => (
  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const IconMore = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
);
const IconSparkles = () => (
  <svg className="w-4 h-4 text-neon-red/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
);
const IconCalendar = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const IconTrending = () => (
  <svg className="w-4 h-4 text-neon-red/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3000' : '';

/** 前端展示用：基因组（来自 /api/config/genes） */
type Genome = {
  id: string;
  name: string;
  generation: number;
  score: number;
  updatedAt: string;
  status: 'stable' | 'evolving' | 'archived';
  geneCount: number;
  source?: 'preset' | 'user';
};

const statusColors: Record<Genome['status'], 'success' | 'warning' | 'default'> = {
  stable: 'success',
  evolving: 'warning',
  archived: 'default',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString();
}

export default function Genes() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Genome['status'] | 'all'>('all');
  const [genomes, setGenomes] = useState<Genome[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetch(`${API_BASE}/api/config/genes`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: { genomes?: Genome[] }) => {
        setGenomes(Array.isArray(data.genomes) ? data.genomes : []);
      })
      .catch((e) => setLoadError(e?.message ?? 'Failed to fetch'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = genomes;
    if (statusFilter !== 'all') {
      list = list.filter((g) => g.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [genomes, search, statusFilter]);

  const avgScore = genomes.length > 0
    ? (genomes.reduce((a, g) => a + g.score, 0) / genomes.length).toFixed(2)
    : '0.00';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neon-red/90 mb-1.5">{t('GENES')}</p>
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">
        {t('genes.title')}
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        {t('genes.subtitle')}
      </p>

      {/* 统计与筛选区 */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-6 text-zinc-400 text-sm">
          <span className="flex items-center gap-1.5">
            <IconSparkles />
            {t('genes.totalGenomes', { count: genomes.length })}
          </span>
          <span className="flex items-center gap-1.5">
            <IconTrending />
            {t('genes.avgScore', { score: avgScore })}
          </span>
        </div>
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder={t('genes.searchPlaceholder')}
            value={search}
            onValueChange={setSearch}
            startContent={<IconSearch />}
            classNames={{
              inputWrapper: 'rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus-within:border-neon-red',
              input: 'text-zinc-200 placeholder:text-zinc-500',
            }}
            size="sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'stable', 'evolving', 'archived'] as const).map((s) => (
            <Chip
              key={s}
              size="sm"
              variant={statusFilter === s ? 'solid' : 'bordered'}
              color={statusFilter === s ? 'danger' : 'default'}
              className="cursor-pointer border-white/10"
              onClick={() => setStatusFilter(s)}
            >
              {t(`genes.filter.${s}`)}
            </Chip>
          ))}
        </div>
      </div>

      {/* 基因组卡片网格 */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-surface-border border-dashed bg-surface-elevated/50 py-16 text-center"
          >
            <p className="text-zinc-500 text-sm">{t('genes.loading', '加载中…')}</p>
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
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-surface-border border-dashed bg-surface-elevated/50 py-16 text-center"
          >
            <p className="text-zinc-500 text-sm">{t('genes.noResults')}</p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((genome, i) => (
              <motion.div
                key={genome.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="bg-surface-elevated border border-surface-border hover:border-neon-red/25 hover:shadow-neon-red/10 transition-all duration-200 group">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-zinc-500 truncate">{genome.id}</p>
                      <h3 className="text-sm font-semibold text-white truncate mt-0.5">
                        {genome.name}
                      </h3>
                    </div>
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-200"
                        >
                          <IconMore />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label={t('genes.actions')}>
                        <DropdownSection showDivider>
                          <DropdownItem key="view">{t('genes.actionView')}</DropdownItem>
                          <DropdownItem key="export">{t('genes.actionExport')}</DropdownItem>
                        </DropdownSection>
                        <DropdownItem key="archive" className="text-warning">
                          {t('genes.actionArchive')}
                        </DropdownItem>
                        <DropdownItem key="delete" className="text-danger">
                          {t('genes.actionDelete')}
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </CardHeader>
                  <CardBody className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">{t('genes.generation')}</span>
                      <span className="font-mono text-zinc-300">{genome.generation}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">{t('genes.score')}</span>
                      <span className="font-mono text-neon-red">{genome.score.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">{t('genes.genes')}</span>
                      <span className="font-mono text-zinc-300">{genome.geneCount}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-surface-border/80">
                      <span className="flex items-center gap-1 text-zinc-500 text-xs">
                        <IconCalendar />
                        {formatDate(genome.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {genome.source && (
                          <Chip size="sm" variant="flat" className="font-medium text-zinc-400">
                            {genome.source === 'preset' ? t('genes.source.preset', '预设') : t('genes.source.user', '用户')}
                          </Chip>
                        )}
                        <Chip
                          size="sm"
                          color={statusColors[genome.status]}
                          variant="flat"
                          className="font-medium"
                        >
                          {t(`genes.status.${genome.status}`)}
                        </Chip>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
