import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Input,
  Button,
  Chip,
  Select,
  SelectItem,
  Textarea,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3000' : '';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** 单条件 .evaluator，由 API /api/config/evaluators 拉取展示 */
type EvaluatorKind = 'ai' | 'aiwebsite' | 'cost' | 'time' | 'accuracy' | 'custom' | 'composite';

type EvaluatorSource = 'preset' | 'user';

type LLMModelItem = { id: string; provider: string; model: string };

type SingleEvaluator = {
  specVersion: string;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  kind: EvaluatorKind;
  config: Record<string, unknown>;
  source?: EvaluatorSource;
};

const emptyEvaluator = (): SingleEvaluator => ({
  specVersion: '0.1',
  id: '',
  name: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  kind: 'ai',
  config: {},
});

function normalizeEvaluatorFromApi(spec: Record<string, unknown>): SingleEvaluator {
  const raw = spec.kind as string | undefined;
  const kind: EvaluatorKind = raw === 'aiwebsite' || raw === 'ai' || raw === 'cost' || raw === 'time' || raw === 'accuracy' || raw === 'custom' || raw === 'composite'
    ? raw
    : (Array.isArray(spec.dimensions) && spec.dimensions.length > 0 ? 'composite' : 'custom');
  const config = (spec.config as Record<string, unknown>) ?? {};
  const source = spec.source === 'user' ? 'user' : 'preset';
  return {
    specVersion: (spec.specVersion as string) ?? '0.1',
    id: (spec.id as string) ?? '',
    name: (spec.name as string) ?? '',
    createdAt: spec.createdAt as string | undefined,
    updatedAt: spec.updatedAt as string | undefined,
    kind,
    config: kind === 'composite' ? { dimensions: spec.dimensions } : config,
    source,
  };
}

const KIND_KEYS: EvaluatorKind[] = ['ai', 'aiwebsite', 'cost', 'time', 'accuracy', 'custom', 'composite'];
/** 新建/编辑弹窗内仅支持的两类 */
const KIND_KEYS_CREATE: EvaluatorKind[] = ['ai', 'aiwebsite'];
const kindLabelKey: Record<EvaluatorKind, string> = {
  ai: 'evaluator.kindAi',
  aiwebsite: 'evaluator.kindAiWebsite',
  cost: 'evaluator.kindCost',
  time: 'evaluator.kindTime',
  accuracy: 'evaluator.kindAccuracy',
  custom: 'evaluator.kindCustom',
  composite: 'evaluator.kindComposite',
};

const inputClass = {
  inputWrapper: [
    'rounded-xl bg-white/[0.04] border border-white/10',
    'data-[hover=true]:border-white/20 group-data-[focus=true]:border-neon-red/50 group-data-[focus=true]:shadow-[0_0_0_2px_rgba(255,8,68,0.12)]',
  ].join(' '),
  input: 'text-zinc-200 placeholder:text-zinc-500',
  label: 'text-zinc-400 font-normal text-xs',
};

export default function Evaluator() {
  const { t } = useTranslation();
  const [list, setList] = useState<SingleEvaluator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState<SingleEvaluator>(emptyEvaluator());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const start = (pageSafe - 1) * pageSize;
  const paginatedList = list.slice(start, start + pageSize);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch(`${API_BASE}/api/config/evaluators`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data: { evaluators?: Record<string, unknown>[] }) => {
        if (cancelled) return;
        const raw = Array.isArray(data.evaluators) ? data.evaluators : [];
        setList(raw.map(normalizeEvaluatorFromApi));
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e?.message ?? 'Failed to fetch');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openAdd = () => {
    setForm({
      ...emptyEvaluator(),
      id: `eval-${Date.now()}`,
      name: t('evaluator.newConfigName'),
    });
    setIsAddModalOpen(true);
  };

  const openEdit = (e: SingleEvaluator) => {
    setForm(JSON.parse(JSON.stringify(e)));
    setEditingId(e.id);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingId(null);
  };

  const saveFromForm = () => {
    const next = { ...form, updatedAt: new Date().toISOString() };
    if (editingId) {
      setList((prev) => prev.map((x) => (x.id === editingId ? next : x)));
    } else {
      if (!next.createdAt) next.createdAt = new Date().toISOString();
      setList((prev) => [...prev, next]);
    }
    closeModal();
  };

  const remove = (id: string) => {
    setList((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) closeModal();
  };

  const updateConfig = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }));
  };

  const isFormValid = form.id.trim() && form.name.trim();

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-5xl w-full"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neon-red/90 mb-1.5">{t('evaluator.singleCondition')}</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">{t('evaluator.title')}</h1>
          <p className="text-zinc-500 text-sm mt-1 max-w-xl">{t('evaluator.subtitle')}</p>
        </div>
        <Button size="sm" variant="solid" color="primary" onPress={openAdd} className="btn-neon-primary rounded-xl font-medium shrink-0">
          {t('evaluator.addConfig')}
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t('evaluator.configuredCount', { count: list.length })}</p>
          {!loading && !loadError && list.length > 0 && (
            <div className="flex items-center gap-3 text-zinc-500">
              <span className="text-xs">{t('evaluator.paginationTotal', { total: totalItems })}</span>
              <span className="text-zinc-600">·</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider">{t('evaluator.paginationPerPage')}</span>
                <Select
                  selectedKeys={[String(pageSize)]}
                  onSelectionChange={(keys) => {
                    const v = Number(Array.from(keys)[0]);
                    if (v) {
                      setPageSize(v);
                      setPage(1);
                    }
                  }}
                  size="sm"
                  classNames={{
                    trigger: 'rounded-lg bg-white/5 border border-white/10 min-h-8 w-16',
                    value: 'text-zinc-400 text-xs',
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={String(n)} className="text-zinc-300 text-xs">
                      {n}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">{t('evaluator.loading')}</p>
          </div>
        ) : loadError ? (
          <div className="py-16 text-center">
            <p className="text-zinc-400 text-sm">{t('evaluator.loadError')}</p>
            <p className="text-zinc-600 text-xs mt-1">{loadError}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm">{t('evaluator.noConfig')}</p>
            <p className="text-zinc-600 text-xs mt-1">{t('evaluator.noConfigHint')}</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            {/* 表头：单行多列，与数据行对齐 */}
            <div
              className="grid items-center gap-3 px-4 py-2.5 border-b border-white/5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 min-w-[520px]"
              style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1.5fr) 88px 72px 100px' }}
            >
              <div className="truncate">{t('evaluator.colName')}</div>
              <div className="truncate font-mono">{t('evaluator.colId')}</div>
              <div>{t('evaluator.colKind')}</div>
              <div>{t('evaluator.colSource')}</div>
              <div className="text-right">{t('evaluator.colActions')}</div>
            </div>
            <ul className="divide-y divide-white/5">
              <AnimatePresence>
                {paginatedList.map((e, i) => (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15, delay: i * 0.015 }}
                    className="group relative"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-neon-red/0 group-hover:bg-neon-red/40 transition-colors rounded-l-2xl" />
                    <div
                      className="grid items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors min-h-0 min-w-[520px]"
                      style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1.5fr) 88px 72px 100px' }}
                    >
                      <div className="min-w-0 truncate text-zinc-100 font-medium text-sm">{e.name}</div>
                      <div className="min-w-0 truncate text-zinc-500 text-xs font-mono">{e.id}</div>
                      <div className="shrink-0">
                        <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-white/10 border border-white/10', content: 'text-zinc-400 text-[11px]' }}>
                          {t(kindLabelKey[e.kind])}
                        </Chip>
                      </div>
                      <div className="shrink-0">
                        <Chip
                          size="sm"
                          variant="flat"
                          classNames={{
                            base: e.source === 'user' ? 'rounded-lg border bg-neon-red/10 border-neon-red/30 text-neon-red/90' : 'rounded-lg border bg-white/5 border-white/10 text-zinc-500',
                            content: 'text-[11px]',
                          }}
                        >
                          {t(e.source === 'user' ? 'evaluator.sourceUser' : 'evaluator.sourcePreset')}
                        </Chip>
                      </div>
                      <div className="flex items-center justify-end gap-0.5 shrink-0">
                        {e.source === 'user' && e.kind !== 'composite' && (
                          <Button size="sm" variant="light" onPress={() => openEdit(e)} className="rounded-lg text-zinc-400 hover:text-neon-red hover:bg-neon-red/10 min-w-0 px-2 text-xs">
                            {t('evaluator.edit')}
                          </Button>
                        )}
                        {e.source === 'user' && e.kind !== 'composite' && (
                          <Tooltip content={t('evaluator.delete')} placement="left" delay={300}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => remove(e.id)}
                              className="rounded-lg text-zinc-500 hover:text-neon-red hover:bg-neon-red/10 min-w-7 w-7"
                              aria-label={t('evaluator.delete')}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
            {/* 分页栏：仅多页时显示 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-white/10 bg-white/[0.01] min-w-0">
                <p className="text-xs text-zinc-500">
                  {t('evaluator.paginationTotal', { total: totalItems })} · {start + 1}–{Math.min(start + pageSize, totalItems)}
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="light" onPress={goPrev} isDisabled={pageSafe <= 1} className="rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 text-xs">
                    {t('evaluator.paginationPrev')}
                  </Button>
                  <span className="text-zinc-500 text-xs px-2 tabular-nums">
                    {pageSafe} / {totalPages}
                  </span>
                  <Button size="sm" variant="light" onPress={goNext} isDisabled={pageSafe >= totalPages} className="rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 text-xs">
                    {t('evaluator.paginationNext')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen || !!editingId}
        onClose={closeModal}
        size="2xl"
        classNames={{
          base: 'bg-surface-elevated border border-white/10 shadow-2xl',
          header: 'border-b border-white/10 pb-4',
          body: 'py-6',
          footer: 'border-t border-white/10 pt-4',
        }}
      >
        <ModalContent>
          <ModalHeader className="text-zinc-100">{editingId ? t('evaluator.modalTitleEdit') : t('evaluator.modalTitleNew')}</ModalHeader>
          <ModalBody className="space-y-6 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('evaluator.id')} placeholder="eval-ai-quality-01" value={form.id} onValueChange={(v) => setForm((f) => ({ ...f, id: v }))} size="sm" classNames={inputClass} isReadOnly={!!editingId} />
              <Input label={t('evaluator.name')} placeholder="" value={form.name} onValueChange={(v) => setForm((f) => ({ ...f, name: v }))} size="sm" classNames={inputClass} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t('evaluator.kind')}</p>
              <Select
                selectedKeys={[form.kind]}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys)[0] as EvaluatorKind;
                  if (k) setForm((f) => ({ ...f, kind: k }));
                }}
                size="sm"
                classNames={{ trigger: 'rounded-xl bg-white/5 border border-white/10 min-h-9 w-40', value: 'text-zinc-200' }}
              >
                {KIND_KEYS.map((key) => (
                  <SelectItem key={key} className="text-zinc-200">
                    {t(kindLabelKey[key])}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t('evaluator.config')}</p>
              {(form.kind === 'ai' || form.kind === 'aiwebsite') && (
                <>
                  <Textarea
                    label={t('evaluator.prompt')}
                    placeholder="Rate the response quality from 1 to 5..."
                    value={(form.config.prompt as string) ?? ''}
                    onValueChange={(v) => updateConfig('prompt', v)}
                    minRows={3}
                    size="sm"
                    classNames={{
                      ...inputClass,
                      input: 'text-zinc-200 placeholder:text-zinc-500 min-h-[72px]',
                    }}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input label={t('evaluator.model')} placeholder="gpt-4o-mini" value={(form.config.model as string) ?? ''} onValueChange={(v) => updateConfig('model', v)} size="sm" classNames={inputClass} />
                    <Input type="number" label={t('evaluator.temperature')} placeholder="0" value={String(form.config.temperature ?? '')} onValueChange={(v) => updateConfig('temperature', v === '' ? undefined : Number(v))} size="sm" classNames={inputClass} />
                    <Input label={t('evaluator.outputFormat')} placeholder="number" value={(form.config.outputFormat as string) ?? ''} onValueChange={(v) => updateConfig('outputFormat', v)} size="sm" classNames={inputClass} />
                    <div className="flex items-end gap-2">
                      <Input type="number" label={t('evaluator.min')} placeholder="1" value={String(form.config.min ?? '')} onValueChange={(v) => updateConfig('min', v === '' ? undefined : Number(v))} size="sm" classNames={inputClass} />
                      <Input type="number" label={t('evaluator.max')} placeholder="5" value={String(form.config.max ?? '')} onValueChange={(v) => updateConfig('max', v === '' ? undefined : Number(v))} size="sm" classNames={inputClass} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.config.normalizeToZeroOne)}
                      onChange={(e) => updateConfig('normalizeToZeroOne', e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-neon-red focus:ring-neon-red/50"
                    />
                    <span className="text-sm text-zinc-400">{t('evaluator.normalizeToZeroOne')}</span>
                  </label>
                </>
              )}
              {(form.kind === 'cost' || form.kind === 'time') && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Unit" placeholder="usd / ms" value={(form.config.unit as string) ?? ''} onValueChange={(v) => updateConfig('unit', v)} size="sm" classNames={inputClass} />
                  <Input type="number" label="Cap" placeholder="0.01" value={String(form.config.cap ?? '')} onValueChange={(v) => updateConfig('cap', v === '' ? undefined : Number(v))} size="sm" classNames={inputClass} />
                  <label className="flex items-center gap-2 cursor-pointer col-span-2">
                    <input type="checkbox" checked={Boolean(form.config.invert)} onChange={(e) => updateConfig('invert', e.target.checked)} className="rounded border-white/20 bg-white/5 text-neon-red focus:ring-neon-red/50" />
                    <span className="text-sm text-zinc-400">Invert (higher = worse → normalize to lower score)</span>
                  </label>
                </div>
              )}
              {form.kind === 'accuracy' && (
                <Input label="Target metric" placeholder="e.g. exact_match" value={(form.config.targetMetric as string) ?? ''} onValueChange={(v) => updateConfig('targetMetric', v)} size="sm" classNames={inputClass} />
              )}
              {form.kind === 'custom' && (
                <p className="text-zinc-500 text-sm">Custom config: implement in backend. Use JSON or key-value in production.</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeModal} className="text-zinc-400">
              {t('evaluator.cancel')}
            </Button>
            <Button color="primary" onPress={saveFromForm} isDisabled={!isFormValid} className="btn-neon-primary rounded-xl font-medium">
              {editingId ? t('evaluator.save') : t('evaluator.add')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
