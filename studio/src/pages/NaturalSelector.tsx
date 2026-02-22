import { useState } from 'react';
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

/** .ns 自然选择配置（前端 mock，不调后端） */
export type EvaluatorRef = {
  evaluatorId: string;
  key: string;
  weight: number;
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

/** 可选评估器 ID 列表（与 Evaluator 页 mock 对齐，仅前端） */
const MOCK_EVALUATOR_IDS = [
  { id: 'eval-ai-quality-01', labelKey: 'ns.evalAiQuality' },
  { id: 'eval-cost-01', labelKey: 'ns.evalCost' },
  { id: 'eval-latency-01', labelKey: 'ns.evalLatency' },
  { id: 'eval-accuracy-01', labelKey: 'ns.evalAccuracy' },
];

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

function RefRow({
  ref: r,
  index,
  onUpdate,
  onRemove,
  canRemove,
  t,
}: {
  ref: EvaluatorRef;
  index: number;
  onUpdate: (i: number, field: keyof EvaluatorRef, value: string | number) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
      <Select
        aria-label="evaluator"
        selectedKeys={[r.evaluatorId]}
        onSelectionChange={(keys) => {
          const v = Array.from(keys)[0] as string;
          if (v) onUpdate(index, 'evaluatorId', v);
        }}
        size="sm"
        classNames={{
          trigger: 'rounded-lg bg-white/5 border border-white/10 min-h-9 w-44',
          value: 'text-zinc-200 text-sm',
        }}
      >
        {MOCK_EVALUATOR_IDS.map((e) => (
          <SelectItem key={e.id} className="text-zinc-200" textValue={t(e.labelKey)}>
            {t(e.labelKey)}
          </SelectItem>
        ))}
      </Select>
      <Input
        aria-label="key"
        placeholder="key"
        value={r.key}
        onValueChange={(v) => onUpdate(index, 'key', v)}
        size="sm"
        classNames={inputClass}
        className="w-24"
      />
      <Input
        type="number"
        aria-label="weight"
        placeholder="0.5"
        value={r.weight.toString()}
        onValueChange={(v) => onUpdate(index, 'weight', Number(v) || 0)}
        size="sm"
        classNames={inputClass}
        className="w-20"
      />
      {canRemove && (
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => onRemove(index)}
          className="rounded-lg text-zinc-500 hover:text-neon-red hover:bg-neon-red/10"
          aria-label={t('ns.deleteRef')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      )}
    </div>
  );
}

export default function NaturalSelector() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<NSConfig[]>(initialConfigs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState<NSConfig>(emptyConfig());

  const openAdd = () => {
    setForm({
      ...emptyConfig(),
      id: `ns-${Date.now()}`,
      name: t('ns.newConfigName'),
      interruptConditions: { ...defaultInterrupt, description: t('ns.interruptDescDefault') },
      evaluatorRefs: [{ evaluatorId: MOCK_EVALUATOR_IDS[0].id, key: 'ai', weight: 0.5 }],
    });
    setIsAddModalOpen(true);
  };

  const openEdit = (c: NSConfig) => {
    setForm(JSON.parse(JSON.stringify(c)));
    setEditingId(c.id);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingId(null);
  };

  const saveFromForm = () => {
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
      evaluatorRefs: [...f.evaluatorRefs, { evaluatorId: MOCK_EVALUATOR_IDS[0].id, key: `dim-${f.evaluatorRefs.length}`, weight: 0.1 }],
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
                      <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-neon-red/10 border border-neon-red/20', content: 'text-neon-red/90 text-xs font-medium' }}>
                        {t('ns.rounds', { n: c.runConstraints.maxIterations })}
                      </Chip>
                      {c.runConstraints.timeLimitSeconds != null && (
                        <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-white/10 border border-white/10', content: 'text-zinc-400 text-xs' }}>
                          ≤{c.runConstraints.timeLimitSeconds}s
                        </Chip>
                      )}
                      {c.evaluatorRefs.map((r) => (
                        <Chip key={`${r.evaluatorId}-${r.key}`} size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-white/10 border border-white/10', content: 'text-zinc-400 text-xs' }}>
                          {r.key} · {r.weight}
                        </Chip>
                      ))}
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
          <ModalHeader className="text-zinc-100">
            {editingId ? t('ns.modalTitleEdit') : t('ns.modalTitleNew')}
          </ModalHeader>
          <ModalBody className="space-y-6 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('ns.id')} placeholder="ns-balanced-01" value={form.id} onValueChange={(v) => setForm((f) => ({ ...f, id: v }))} size="sm" classNames={inputClass} isReadOnly={!!editingId} />
              <Input label={t('ns.name')} placeholder="" value={form.name} onValueChange={(v) => setForm((f) => ({ ...f, name: v }))} size="sm" classNames={inputClass} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t('ns.runConstraints')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input type="number" label={t('ns.timeLimitSec')} placeholder="3600" value={form.runConstraints.timeLimitSeconds?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, timeLimitSeconds: numOrNull(v) } }))} size="sm" classNames={inputClass} />
                <Input type="number" label={t('ns.budgetMoney')} placeholder="10" value={form.runConstraints.budgetMoney?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, budgetMoney: numOrNull(v) } }))} size="sm" classNames={inputClass} />
                <Input type="number" label={t('ns.maxIterations')} value={form.runConstraints.maxIterations.toString()} onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, maxIterations: Number(v) || 50 } }))} size="sm" classNames={inputClass} />
                <Input type="number" label={t('ns.maxConcurrent')} placeholder="2" value={form.runConstraints.maxConcurrentRuns?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, maxConcurrentRuns: numOrNull(v) } }))} size="sm" classNames={inputClass} />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t('ns.interruptConditions')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input type="number" label={t('ns.stopWhenScoreAbove')} placeholder="0.95" value={form.interruptConditions.stopWhenScoreAbove?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, interruptConditions: { ...f.interruptConditions, stopWhenScoreAbove: numOrNull(v) } }))} size="sm" classNames={inputClass} />
                <Input type="number" label={t('ns.stopWhenScoreBelow')} placeholder="—" value={form.interruptConditions.stopWhenScoreBelow?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, interruptConditions: { ...f.interruptConditions, stopWhenScoreBelow: numOrNull(v) } }))} size="sm" classNames={inputClass} />
                <Input type="number" label={t('ns.stopWhenNoImprovement')} placeholder="5" value={form.interruptConditions.stopWhenNoImprovementForIterations?.toString() ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, interruptConditions: { ...f.interruptConditions, stopWhenNoImprovementForIterations: numOrNull(v) } }))} size="sm" classNames={inputClass} />
              </div>
              <Input label={t('ns.description')} placeholder={t('ns.optional')} value={form.interruptConditions.description ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, interruptConditions: { ...f.interruptConditions, description: v } }))} size="sm" classNames={inputClass} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t('ns.evaluatorRefs')}</p>
              <div className="space-y-2">
                {form.evaluatorRefs.map((r, i) => (
                  <RefRow key={i} ref={r} index={i} onUpdate={updateRef} onRemove={removeRef} canRemove={form.evaluatorRefs.length > 1} t={t} />
                ))}
                <Button size="sm" variant="bordered" color="primary" onPress={addRef} className="btn-neon-outline rounded-xl border-neon-red/40 text-neon-red">
                  {t('ns.addRef')}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{t('ns.aggregation')}</p>
              <div className="flex flex-wrap gap-3">
                <Select
                  placeholder={t('ns.aggregationMethod')}
                  selectedKeys={[form.aggregation.method]}
                  onSelectionChange={(keys) => {
                    const m = Array.from(keys)[0] as NSConfig['aggregation']['method'];
                    if (m) setForm((f) => ({ ...f, aggregation: { ...f.aggregation, method: m } }));
                  }}
                  size="sm"
                  classNames={{ trigger: 'rounded-xl bg-white/5 border border-white/10 min-h-9 w-40', value: 'text-zinc-200' }}
                >
                  {AGGREGATION_KEYS.map((key) => (
                    <SelectItem key={key} className="text-zinc-200">{t(aggregationLabelKey[key])}</SelectItem>
                  ))}
                </Select>
                <Input placeholder={t('ns.primaryDimensionKey')} value={form.aggregation.primaryDimension ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, aggregation: { ...f.aggregation, primaryDimension: v.trim() || null } }))} size="sm" classNames={inputClass} className="w-44" />
              </div>
            </div>
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
