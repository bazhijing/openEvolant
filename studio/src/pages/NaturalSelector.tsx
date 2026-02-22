import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Input,
  Button,
  Chip,
  Select,
  SelectItem,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3000' : '';

/** 评估器 kind，与 Evaluator 页 API 一致 */
export type EvaluatorKind = 'ai' | 'aiwebsite' | 'cost' | 'time' | 'accuracy' | 'custom' | 'composite';

/** .ns 自然选择配置（前端 mock，不调后端） */
export type EvaluatorRef = {
  evaluatorId: string;
  key: string;
  weight: number;
  /** custom/composite 需填 */
  config?: string;
  /** cost 需填：预算 */
  budget?: number;
  /** time 需填：毫秒数 */
  ms?: number;
  /** ai/aiwebsite 需填：1-10 分 */
  score?: number;
};

export type NSConfig = {
  specVersion: string;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  runConstraints: {
    timeLimitSeconds: number | null;
    budgetMoney: number | null;
    maxIterations: number;
    maxConcurrentRuns: number | null;
  };
  interruptConditions: {
    stopWhenScoreAbove: number | null;
    stopWhenScoreBelow: number | null;
    stopWhenNoImprovementForIterations: number | null;
    description?: string;
  };
  evaluatorRefs: EvaluatorRef[];
  aggregation: { method: 'weighted_sum' | 'min' | 'max'; primaryDimension: string | null };
};

const defaultRunConstraints: NSConfig['runConstraints'] = {
  timeLimitSeconds: 3600,
  budgetMoney: 10,
  maxIterations: 50,
  maxConcurrentRuns: 2,
};

const defaultInterrupt: NSConfig['interruptConditions'] = {
  stopWhenScoreAbove: 0.95,
  stopWhenScoreBelow: null,
  stopWhenNoImprovementForIterations: 5,
  description: '',
};

const emptyConfig = (): NSConfig => ({
  specVersion: '0.1',
  id: '',
  name: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  runConstraints: { ...defaultRunConstraints },
  interruptConditions: { ...defaultInterrupt },
  evaluatorRefs: [],
  aggregation: { method: 'weighted_sum', primaryDimension: null },
});

/** 可选评估器项（从 /api/config/evaluators 获取） */
export type EvaluatorOption = { id: string; name: string; kind: EvaluatorKind };

function normalizeEvaluatorKind(raw: unknown): EvaluatorKind {
  const k = String(raw ?? '').toLowerCase();
  if (k === 'ai' || k === 'aiwebsite' || k === 'cost' || k === 'time' || k === 'accuracy' || k === 'custom' || k === 'composite') return k;
  return 'custom';
}

const initialConfigs: NSConfig[] = [
  {
    specVersion: '0.1',
    id: 'ns-balanced-01',
    name: 'Balanced (quality · cost · time)',
    createdAt: '2025-02-22T00:00:00Z',
    updatedAt: '2025-02-22T00:00:00Z',
    runConstraints: {
      timeLimitSeconds: 3600,
      budgetMoney: 10,
      maxIterations: 50,
      maxConcurrentRuns: 2,
    },
    interruptConditions: {
      stopWhenScoreAbove: 0.95,
      stopWhenScoreBelow: null,
      stopWhenNoImprovementForIterations: 5,
      description: 'Stop when score ≥ 0.95 or no improvement for 5 rounds',
    },
    evaluatorRefs: [
      { evaluatorId: 'eval-ai-quality-01', key: 'ai', weight: 0.5 },
      { evaluatorId: 'eval-cost-01', key: 'cost', weight: 0.3 },
      { evaluatorId: 'eval-latency-01', key: 'time', weight: 0.2 },
    ],
    aggregation: { method: 'weighted_sum', primaryDimension: null },
  },
];

const inputClass = {
  inputWrapper: [
    'rounded-xl bg-white/[0.04] border border-white/10',
    'data-[hover=true]:border-white/20 group-data-[focus=true]:border-neon-red/50 group-data-[focus=true]:shadow-[0_0_0_2px_rgba(255,8,68,0.12)]',
  ].join(' '),
  input: 'text-zinc-200 placeholder:text-zinc-500',
  label: 'text-zinc-400 font-normal text-xs',
};

const AGGREGATION_KEYS = ['weighted_sum', 'min', 'max'] as const;
const aggregationLabelKey: Record<(typeof AGGREGATION_KEYS)[number], string> = {
  weighted_sum: 'ns.weightedSum',
  min: 'ns.min',
  max: 'ns.max',
};

function numOrNull(s: string): number | null {
  const v = s.trim();
  if (v === '' || v === '—') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 将 evaluatorRefs 格式化为公式，如 A+B+0.7*C 或 A-B；weight 为 -1 时显示为减项 */
function formatFormula(refs: EvaluatorRef[]): string {
  if (refs.length === 0) return '';
  const terms = refs
    .map((r) => {
      if (r.weight === 0) return null;
      if (r.weight === 1) return r.key;
      if (r.weight === -1) return `-${r.key}`;
      if (r.weight > 0) return (r.weight !== 1 ? `${r.weight}*` : '') + r.key;
      return `${r.weight}*${r.key}`;
    })
    .filter((t): t is string => t != null && t !== '');
  return terms.map((t, i) => (i === 0 ? t : t.startsWith('-') ? t : `+${t}`)).join('');
}

function RefTableRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  evaluatorOptions,
  t,
}: {
  item: EvaluatorRef;
  index: number;
  onUpdate: (i: number, field: keyof EvaluatorRef, value: string | number) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
  evaluatorOptions: EvaluatorOption[];
  t: (k: string) => string;
}) {
  const selected = evaluatorOptions.find((e) => e.id === item.evaluatorId);
  const kind = selected?.kind;

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="py-1.5 pr-2 align-middle">
        <select
          aria-label={t('ns.evaluator')}
          value={item.evaluatorId}
          onChange={(e) => {
            const v = e.target.value;
            if (v) onUpdate(index, 'evaluatorId', v);
          }}
          className="w-full min-w-[100px] min-h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-200 text-xs px-3 py-1.5 focus:border-neon-red/50 focus:outline-none focus:ring-1 focus:ring-neon-red/30"
        >
          {evaluatorOptions.length === 0 ? (
            <option value="">{t('ns.noEvaluators')}</option>
          ) : (
            evaluatorOptions.map((e) => (
              <option key={e.id} value={e.id} className="bg-surface-elevated text-zinc-200">
                {e.name}
              </option>
            ))
          )}
        </select>
      </td>
      <td className="py-1.5 pr-2 align-middle w-24">
        <Input
          aria-label={t('ns.refKey')}
          placeholder="key"
          value={item.key}
          onValueChange={(v) => onUpdate(index, 'key', v)}
          size="sm"
          classNames={inputClass}
          className="w-full"
        />
      </td>
      <td className="py-1.5 pr-2 align-middle w-20">
        <Input
          type="number"
          aria-label={t('ns.refWeight')}
          placeholder="0.5"
          min={-1}
          max={1}
          step={0.01}
          value={item.weight.toString()}
          onValueChange={(v) => {
            const n = Number(v);
            const clamped = Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
            onUpdate(index, 'weight', clamped);
          }}
          size="sm"
          classNames={inputClass}
          className="w-full"
        />
      </td>
      <td className="py-1.5 pr-2 align-middle min-w-[100px]">
        {kind === 'cost' && (
          <Input
            type="number"
            aria-label={t('ns.refBudget')}
            placeholder="0"
            value={item.budget?.toString() ?? ''}
            onValueChange={(v) => onUpdate(index, 'budget', Number(v) || 0)}
            size="sm"
            classNames={inputClass}
            className="w-full"
            startContent={
              <div className="pointer-events-none flex items-center">
                <span className="text-default-400 text-small">$</span>
              </div>
            }
          />
        )}
        {kind === 'time' && (
          <Input
            type="number"
            aria-label={t('ns.refMs')}
            placeholder="ms"
            value={item.ms?.toString() ?? ''}
            onValueChange={(v) => onUpdate(index, 'ms', Number(v) || 0)}
            size="sm"
            classNames={inputClass}
            className="w-full"
          />
        )}
        {(kind === 'ai' || kind === 'aiwebsite') && (
          <Input
            type="number"
            aria-label={t('ns.refScore')}
            placeholder="1-10"
            min={1}
            max={10}
            value={item.score?.toString() ?? ''}
            onValueChange={(v) => {
              const n = Number(v);
              const clamped = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 1;
              onUpdate(index, 'score', clamped);
            }}
            size="sm"
            classNames={inputClass}
            className="w-full"
            description={t('ns.refScoreHint')}
          />
        )}
        {(kind === 'custom' || kind === 'composite') && (
          <Input
            aria-label={t('ns.refConfig')}
            placeholder={t('ns.refConfig')}
            value={item.config ?? ''}
            onValueChange={(v) => onUpdate(index, 'config', v)}
            size="sm"
            classNames={inputClass}
            className="w-full"
          />
        )}
      </td>
      <td className="py-1.5 w-10 align-middle">
        {canRemove ? (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => onRemove(index)}
            className="rounded-lg text-zinc-500 hover:text-neon-red hover:bg-neon-red/10 min-w-8 w-8"
            aria-label={t('ns.deleteRef')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

export default function NaturalSelector() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<NSConfig[]>(initialConfigs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState<NSConfig>(emptyConfig());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [evaluatorList, setEvaluatorList] = useState<EvaluatorOption[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/config/evaluators`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data: { evaluators?: Record<string, unknown>[] }) => {
        const raw = Array.isArray(data.evaluators) ? data.evaluators : [];
        const list = raw
          .map((spec) => ({
            id: String(spec.id ?? '').trim(),
            name: String(spec.name ?? spec.id ?? '').trim(),
            kind: normalizeEvaluatorKind(spec.kind),
          }))
          .filter((e) => e.id.length > 0);
        setEvaluatorList(list);
      })
      .catch(() => setEvaluatorList([]));
  }, []);

  const openAdd = () => {
    setForm({
      ...emptyConfig(),
      id: `ns-${Date.now()}`,
      name: t('ns.newConfigName'),
      interruptConditions: { ...defaultInterrupt, description: t('ns.interruptDescDefault') },
      evaluatorRefs: [{ evaluatorId: evaluatorList[0]?.id ?? '', key: 'ai', weight: 0.5 }],
    });
    setSubmitAttempted(false);
    setIsAddModalOpen(true);
  };

  const openEdit = (c: NSConfig) => {
    setForm(JSON.parse(JSON.stringify(c)));
    setEditingId(c.id);
    setSubmitAttempted(false);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingId(null);
    setSubmitAttempted(false);
  };

  const saveFromForm = () => {
    if (!isFormValid) {
      setSubmitAttempted(true);
      return;
    }
    const next = { ...form, updatedAt: new Date().toISOString() };
    if (editingId) {
      setConfigs((prev) => prev.map((c) => (c.id === editingId ? next : c)));
    } else {
      if (!next.createdAt) next.createdAt = new Date().toISOString();
      setConfigs((prev) => [...prev, next]);
    }
    closeModal();
  };

  const remove = (id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) closeModal();
  };

  const addRef = () => {
    setForm((f) => ({
      ...f,
      evaluatorRefs: [...f.evaluatorRefs, { evaluatorId: evaluatorList[0]?.id ?? '', key: `dim-${f.evaluatorRefs.length}`, weight: 0.1 }],
    }));
  };

  const updateRef = (index: number, field: keyof EvaluatorRef, value: string | number) => {
    setForm((f) => {
      const refs = [...f.evaluatorRefs];
      refs[index] = { ...refs[index], [field]: value };
      return { ...f, evaluatorRefs: refs };
    });
  };

  const removeRef = (index: number) => {
    setForm((f) => ({ ...f, evaluatorRefs: f.evaluatorRefs.filter((_, i) => i !== index) }));
  };

  const isFormValid = form.id.trim() && form.name.trim() && form.evaluatorRefs.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neon-red/90 mb-1.5">Natural Selection</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">{t('ns.title')}</h1>
          <p className="text-zinc-500 text-sm mt-1 max-w-xl">{t('ns.subtitle')}</p>
        </div>
        <Button
          size="sm"
          variant="solid"
          color="primary"
          onPress={openAdd}
          className="btn-neon-primary rounded-xl font-medium shrink-0"
        >
          {t('ns.addConfig')}
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {t('ns.configuredCount', { count: configs.length })}
          </p>
        </div>
        {configs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm">{t('ns.noConfig')}</p>
            <p className="text-zinc-600 text-xs mt-1">{t('ns.noConfigHint')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            <AnimatePresence>
              {configs.map((c, i) => (
                <motion.li
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="group relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-neon-red/0 group-hover:bg-neon-red/40 transition-colors rounded-l-2xl" />
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-100 font-medium truncate">{c.name}</p>
                      <p className="text-zinc-500 text-xs font-mono truncate mt-0.5">{c.id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {c.runConstraints.budgetMoney != null && (
                        <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-amber-500/15 border border-amber-500/30', content: 'text-amber-400 text-xs font-medium' }}>
                          ${c.runConstraints.budgetMoney}
                        </Chip>
                      )}
                      <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-neon-red/10 border border-neon-red/20', content: 'text-neon-red/90 text-xs font-medium' }}>
                        {t('ns.rounds', { n: c.runConstraints.maxIterations })}
                      </Chip>
                      {c.runConstraints.timeLimitSeconds != null && (
                        <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-white/10 border border-white/10', content: 'text-zinc-400 text-xs' }}>
                          ≤{c.runConstraints.timeLimitSeconds}s
                        </Chip>
                      )}
                      {formatFormula(c.evaluatorRefs) && (
                        <span className="flex items-center gap-1.5">
                          <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-blue-500/15 border border-blue-500/30', content: 'text-blue-400 text-xs font-medium' }}>
                            {t('ns.scoreFormulaLabel')}
                          </Chip>
                          <span className="text-xs font-mono text-blue-400">
                            {formatFormula(c.evaluatorRefs)}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="light" onPress={() => openEdit(c)} className="rounded-lg text-zinc-400 hover:text-neon-red hover:bg-neon-red/10">
                        {t('ns.edit')}
                      </Button>
                      <Tooltip content={t('ns.delete')} placement="left" delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => remove(c.id)}
                          className="rounded-lg text-zinc-500 hover:text-neon-red hover:bg-neon-red/10 min-w-8 w-8"
                          aria-label={t('ns.delete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen || !!editingId}
        onOpenChange={(open) => { if (!open) closeModal(); }}
        size="2xl"
        classNames={{
          base: 'bg-surface-elevated border border-white/10 shadow-2xl',
          header: 'border-b border-white/10 pb-3',
          body: 'py-4',
          footer: 'border-t border-white/10 pt-3',
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col sm:flex-row sm:items-center gap-2 text-zinc-100 text-base">
            <span>{editingId ? t('ns.modalTitleEdit') : t('ns.modalTitleNew')}</span>
            <Chip size="sm" variant="flat" classNames={{ base: editingId ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-neon-red/15 border border-neon-red/30', content: editingId ? 'text-amber-400' : 'text-neon-red/90' }}>
              {editingId ? t('ns.modeEdit') : t('ns.modeNew')}
            </Chip>
          </ModalHeader>
          <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Input
                  label={t('ns.id')}
                  placeholder="ns-balanced-01"
                  value={form.id}
                  onValueChange={(v) => setForm((f) => ({ ...f, id: v }))}
                  size="sm"
                  classNames={inputClass}
                  isReadOnly={!!editingId}
                  isInvalid={submitAttempted && !form.id.trim()}
                  errorMessage={submitAttempted && !form.id.trim() ? t('ns.required') : undefined}
                />
                {editingId && (
                  <p className="text-[10px] text-zinc-500 px-1">{t('ns.idReadOnlyHint')}</p>
                )}
              </div>
              <Input
                label={t('ns.name')}
                placeholder={t('ns.newConfigName')}
                value={form.name}
                onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}
                size="sm"
                classNames={inputClass}
                isInvalid={submitAttempted && !form.name.trim()}
                errorMessage={submitAttempted && !form.name.trim() ? t('ns.required') : undefined}
              />
            </div>

            <p className="text-[11px] font-medium uppercase tracking-wider text-neon-red/90">{t('ns.runConstraints')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Input type="number" label={t('ns.timeLimitSec')} labelPlacement="outside" placeholder="3600" value={form.runConstraints.timeLimitSeconds?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, timeLimitSeconds: numOrNull(v) } }))} size="sm" classNames={inputClass} />
              <Input
                type="number"
                label={t('ns.budgetMoney')}
                labelPlacement="outside"
                placeholder="0.00"
                value={form.runConstraints.budgetMoney?.toString() ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, budgetMoney: numOrNull(v) } }))}
                size="sm"
                classNames={inputClass}
                startContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">$</span>
                  </div>
                }
              />
              <Input type="number" label={t('ns.maxIterations')} labelPlacement="outside" value={form.runConstraints.maxIterations.toString()} onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, maxIterations: Number(v) || 50 } }))} size="sm" classNames={inputClass} />
            </div>

            <p className="text-[11px] font-medium uppercase tracking-wider text-neon-red/90 mb-1">{t('ns.interruptConditions')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input type="number" label={t('ns.stopWhenScoreAbove')} labelPlacement="outside" placeholder="0.95" min={0} max={1} step={0.01} value={form.interruptConditions.stopWhenScoreAbove?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, interruptConditions: { ...f.interruptConditions, stopWhenScoreAbove: numOrNull(v) } }))} size="sm" classNames={inputClass} description={t('ns.scoreRangeHint')} />
              <Input type="number" label={t('ns.stopWhenScoreBelow')} labelPlacement="outside" placeholder="—" min={0} max={1} step={0.01} value={form.interruptConditions.stopWhenScoreBelow?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, interruptConditions: { ...f.interruptConditions, stopWhenScoreBelow: numOrNull(v) } }))} size="sm" classNames={inputClass} description={t('ns.scoreRangeHint')} />
              <Input type="number" label={t('ns.stopWhenNoImprovement')} labelPlacement="outside" placeholder="5" value={form.interruptConditions.stopWhenNoImprovementForIterations?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, interruptConditions: { ...f.interruptConditions, stopWhenNoImprovementForIterations: numOrNull(v) } }))} size="sm" classNames={inputClass} />
            </div>

            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-neon-red/90">{t('ns.evaluatorRefs')}</p>
              <Button size="sm" variant="bordered" color="primary" onPress={addRef} className="btn-neon-outline rounded-lg border-neon-red/40 text-neon-red h-7 text-xs">
                {t('ns.addRef')}
              </Button>
            </div>
            {submitAttempted && form.evaluatorRefs.length === 0 && (
              <p className="text-xs text-danger-400 mb-1">{t('ns.formHint')}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 border-b border-white/10">
                    <th className="py-1.5 pr-2 font-normal">{t('ns.evaluator')}</th>
                    <th className="py-1.5 pr-2 font-normal w-24">{t('ns.refKey')}</th>
                    <th className="py-1.5 pr-2 font-normal w-20">{t('ns.refWeight')}</th>
                    <th className="py-1.5 pr-2 font-normal min-w-[100px]">{t('ns.refParam')}</th>
                    <th className="py-1.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {form.evaluatorRefs.map((r, i) => (
                    <RefTableRow key={i} item={r} index={i} onUpdate={updateRef} onRemove={removeRef} canRemove={form.evaluatorRefs.length > 1} evaluatorOptions={evaluatorList} t={t} />
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] font-medium uppercase tracking-wider text-neon-red/90 mb-1">{t('ns.aggregation')}</p>
            <div className="flex flex-nowrap gap-2 items-center">
              <Select
                placeholder={t('ns.aggregationMethod')}
                selectedKeys={[form.aggregation.method]}
                onSelectionChange={(keys) => {
                  const m = Array.from(keys)[0] as NSConfig['aggregation']['method'];
                  if (m) setForm((f) => ({ ...f, aggregation: { ...f.aggregation, method: m } }));
                }}
                size="sm"
                classNames={{ trigger: 'rounded-lg bg-white/5 border border-white/10 min-h-8 w-36', value: 'text-zinc-200 text-xs' }}
              >
                {AGGREGATION_KEYS.map((key) => (
                  <SelectItem key={key} className="text-zinc-200">{t(aggregationLabelKey[key])}</SelectItem>
                ))}
              </Select>
            </div>

            {submitAttempted && !isFormValid && (
              <p className="text-xs text-zinc-500 rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                {t('ns.formHint')}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeModal} className="text-zinc-400">
              {t('ns.cancel')}
            </Button>
            <Button color="primary" onPress={saveFromForm} isDisabled={!isFormValid} className="btn-neon-primary rounded-xl font-medium">
              {editingId ? t('ns.save') : t('ns.add')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
