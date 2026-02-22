import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Input,
  Button,
  Divider,
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

/** 与 .evaluator 规范一致的类型（前端仅用，不调后端） */
type EvaluatorDimension = {
  key: string;
  name: string;
  weight: number;
  kind: 'ai' | 'cost' | 'time' | 'accuracy' | 'custom';
  config: Record<string, unknown>;
};

type EvaluatorConfig = {
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
  dimensions: EvaluatorDimension[];
  aggregation: { method: 'weighted_sum' | 'min' | 'max'; primaryDimension: string | null };
};

const defaultRunConstraints: EvaluatorConfig['runConstraints'] = {
  timeLimitSeconds: 3600,
  budgetMoney: 10,
  maxIterations: 50,
  maxConcurrentRuns: 2,
};

const defaultInterrupt: EvaluatorConfig['interruptConditions'] = {
  stopWhenScoreAbove: 0.95,
  stopWhenScoreBelow: null,
  stopWhenNoImprovementForIterations: 5,
  description: '',
};

const defaultDimension: EvaluatorDimension = {
  key: 'ai',
  name: 'AI quality',
  weight: 0.5,
  kind: 'ai',
  config: {},
};

const emptyConfig = (): EvaluatorConfig => ({
  specVersion: '0.1',
  id: '',
  name: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  runConstraints: { ...defaultRunConstraints },
  interruptConditions: { ...defaultInterrupt },
  dimensions: [{ ...defaultDimension }],
  aggregation: { method: 'weighted_sum', primaryDimension: null },
});

/** 初始示例数据（仅前端展示，不请求后端） */
const initialConfigs: EvaluatorConfig[] = [
  {
    specVersion: '0.1',
    id: 'eval-balanced-01',
    name: '平衡型（省时省钱+质量）',
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
      description: '分数≥0.95 或连续 5 轮无提升则停止',
    },
    dimensions: [
      { key: 'ai', name: 'AI 质量', weight: 0.5, kind: 'ai', config: {} },
      { key: 'cost', name: '花费', weight: 0.3, kind: 'cost', config: {} },
      { key: 'time', name: '响应时间', weight: 0.2, kind: 'time', config: {} },
    ],
    aggregation: { method: 'weighted_sum', primaryDimension: null },
  },
];

const inputClass = {
  inputWrapper: [
    'rounded-xl bg-white/5 border border-white/10 input-neon-wrap',
    'data-[hover=true]:border-neon-red/40 group-data-[focus=true]:border-neon-red',
  ].join(' '),
  input: 'text-zinc-200 placeholder:text-zinc-500',
  label: 'text-zinc-400 font-normal',
};

const KIND_KEYS = ['ai', 'cost', 'time', 'accuracy', 'custom'] as const;
const AGGREGATION_KEYS = ['weighted_sum', 'min', 'max'] as const;

function numOrNull(s: string): number | null {
  const v = s.trim();
  if (v === '' || v === '—') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const kindLabelKey: Record<(typeof KIND_KEYS)[number], string> = {
  ai: 'evaluator.kindAi',
  cost: 'evaluator.kindCost',
  time: 'evaluator.kindTime',
  accuracy: 'evaluator.kindAccuracy',
  custom: 'evaluator.kindCustom',
};
const aggregationLabelKey: Record<(typeof AGGREGATION_KEYS)[number], string> = {
  weighted_sum: 'evaluator.weightedSum',
  min: 'evaluator.min',
  max: 'evaluator.max',
};

export default function Evaluator() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<EvaluatorConfig[]>(initialConfigs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState<EvaluatorConfig>(emptyConfig());

  const openAdd = () => {
    setForm(emptyConfig());
    setForm((f) => ({
      ...f,
      id: `eval-${Date.now()}`,
      name: t('evaluator.newConfigName'),
      interruptConditions: { ...f.interruptConditions, description: t('evaluator.interruptDescDefault') },
    }));
    setIsAddModalOpen(true);
  };

  const openEdit = (c: EvaluatorConfig) => {
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

  const addDimension = () => {
    setForm((f) => ({
      ...f,
      dimensions: [
        ...f.dimensions,
        { key: `dim-${f.dimensions.length}`, name: t('evaluator.newDimensionName'), weight: 0.1, kind: 'custom', config: {} },
      ],
    }));
  };

  const updateDimension = (index: number, field: keyof EvaluatorDimension, value: string | number) => {
    setForm((f) => {
      const dims = [...f.dimensions];
      dims[index] = { ...dims[index], [field]: value };
      return { ...f, dimensions: dims };
    });
  };

  const removeDimension = (index: number) => {
    setForm((f) => ({
      ...f,
      dimensions: f.dimensions.filter((_, i) => i !== index),
    }));
  };

  const isFormValid = form.id.trim() && form.name.trim() && form.dimensions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">{t('evaluator.title')}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{t('evaluator.subtitle')}</p>
        </div>
        <Button
          size="sm"
          variant="solid"
          color="primary"
          onPress={openAdd}
          className="btn-neon-primary rounded-xl font-medium"
        >
          {t('evaluator.addConfig')}
        </Button>
      </div>

      <Divider className="bg-white/10 mb-6" />

      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">
        {t('evaluator.configuredCount', { count: configs.length })}
      </p>

      {configs.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center">
          <p className="text-zinc-500 text-sm">{t('evaluator.noConfig')}</p>
          <p className="text-zinc-600 text-xs mt-1">{t('evaluator.noConfigHint')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence>
            {configs.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-colors"
              >
                <div className="flex items-center gap-4 px-4 py-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-zinc-200 font-medium truncate">{c.name}</p>
                    <p className="text-zinc-500 text-xs font-mono truncate">{c.id}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-neon-red/15 border border-neon-red/30', content: 'text-neon-red text-xs' }}>
                      {t('evaluator.rounds', { n: c.runConstraints.maxIterations })}
                    </Chip>
                    {c.runConstraints.timeLimitSeconds != null && (
                      <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-white/10', content: 'text-zinc-400 text-xs' }}>
                        ≤{c.runConstraints.timeLimitSeconds}s
                      </Chip>
                    )}
                    {c.dimensions.map((d) => (
                      <Chip key={d.key} size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-white/10', content: 'text-zinc-400 text-xs' }}>
                        {d.name}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => openEdit(c)}
                      className="rounded-lg text-zinc-400 hover:text-neon-red hover:bg-neon-red/10"
                    >
                      {t('evaluator.edit')}
                    </Button>
                    <Tooltip content={t('evaluator.delete')} placement="left" delay={300}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => remove(c.id)}
                        className="rounded-lg text-zinc-500 hover:text-neon-red hover:bg-neon-red/10 min-w-8 w-8"
                        aria-label={t('evaluator.delete')}
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

      {/* 新建 / 编辑 弹窗 */}
      <Modal
        isOpen={isAddModalOpen || !!editingId}
        onClose={closeModal}
        size="2xl"
        classNames={{
          base: 'bg-surface-elevated border border-surface-border',
          header: 'border-b border-surface-border',
          body: 'py-4',
          footer: 'border-t border-surface-border',
        }}
      >
        <ModalContent>
          <ModalHeader className="text-zinc-200">
            {editingId ? t('evaluator.modalTitleEdit') : t('evaluator.modalTitleNew')}
          </ModalHeader>
          <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('evaluator.id')}
                placeholder="eval-balanced-01"
                value={form.id}
                onValueChange={(v) => setForm((f) => ({ ...f, id: v }))}
                size="sm"
                classNames={inputClass}
                isReadOnly={!!editingId}
              />
              <Input
                label={t('evaluator.name')}
                placeholder=""
                value={form.name}
                onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}
                size="sm"
                classNames={inputClass}
              />
            </div>

            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-4">{t('evaluator.runConstraints')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input
                type="number"
                label={t('evaluator.timeLimitSec')}
                placeholder="3600"
                value={form.runConstraints.timeLimitSeconds?.toString() ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, timeLimitSeconds: numOrNull(v) } }))}
                size="sm"
                classNames={inputClass}
              />
              <Input
                type="number"
                label={t('evaluator.budgetMoney')}
                placeholder="10"
                value={form.runConstraints.budgetMoney?.toString() ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, budgetMoney: numOrNull(v) } }))}
                size="sm"
                classNames={inputClass}
              />
              <Input
                type="number"
                label={t('evaluator.maxIterations')}
                value={form.runConstraints.maxIterations.toString()}
                onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, maxIterations: Number(v) || 50 } }))}
                size="sm"
                classNames={inputClass}
              />
              <Input
                type="number"
                label={t('evaluator.maxConcurrent')}
                placeholder="2"
                value={form.runConstraints.maxConcurrentRuns?.toString() ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, runConstraints: { ...f.runConstraints, maxConcurrentRuns: numOrNull(v) } }))}
                size="sm"
                classNames={inputClass}
              />
            </div>

            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-4">{t('evaluator.interruptConditions')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Input
                type="number"
                label={t('evaluator.stopWhenScoreAbove')}
                placeholder="0.95"
                value={form.interruptConditions.stopWhenScoreAbove?.toString() ?? ''}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  interruptConditions: { ...f.interruptConditions, stopWhenScoreAbove: numOrNull(v) },
                }))}
                size="sm"
                classNames={inputClass}
              />
              <Input
                type="number"
                label={t('evaluator.stopWhenScoreBelow')}
                placeholder="—"
                value={form.interruptConditions.stopWhenScoreBelow?.toString() ?? ''}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  interruptConditions: { ...f.interruptConditions, stopWhenScoreBelow: numOrNull(v) },
                }))}
                size="sm"
                classNames={inputClass}
              />
              <Input
                type="number"
                label={t('evaluator.stopWhenNoImprovement')}
                placeholder="5"
                value={form.interruptConditions.stopWhenNoImprovementForIterations?.toString() ?? ''}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  interruptConditions: { ...f.interruptConditions, stopWhenNoImprovementForIterations: numOrNull(v) },
                }))}
                size="sm"
                classNames={inputClass}
              />
            </div>
            <Input
              label={t('evaluator.description')}
              placeholder={t('evaluator.optional')}
              value={form.interruptConditions.description ?? ''}
              onValueChange={(v) => setForm((f) => ({
                ...f,
                interruptConditions: { ...f.interruptConditions, description: v },
              }))}
              size="sm"
              classNames={inputClass}
            />

            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-4">{t('evaluator.dimensions')}</p>
            <div className="space-y-2">
              {form.dimensions.map((d, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                  <Input
                    aria-label="key"
                    placeholder="key"
                    value={d.key}
                    onValueChange={(v) => updateDimension(i, 'key', v)}
                    size="sm"
                    classNames={inputClass}
                    className="w-24"
                  />
                  <Input
                    aria-label={t('evaluator.name')}
                    placeholder={t('evaluator.name')}
                    value={d.name}
                    onValueChange={(v) => updateDimension(i, 'name', v)}
                    size="sm"
                    classNames={inputClass}
                    className="w-28"
                  />
                  <Input
                    type="number"
                    aria-label="weight"
                    placeholder="0.5"
                    value={d.weight.toString()}
                    onValueChange={(v) => updateDimension(i, 'weight', Number(v) || 0)}
                    size="sm"
                    classNames={inputClass}
                    className="w-20"
                  />
                  <Select
                    placeholder=""
                    selectedKeys={[d.kind]}
                    onSelectionChange={(keys) => {
                      const k = Array.from(keys)[0] as EvaluatorDimension['kind'];
                      if (k) updateDimension(i, 'kind', k);
                    }}
                    size="sm"
                    classNames={{
                      trigger: 'rounded-xl bg-white/5 border border-white/10 min-h-9 w-32',
                      value: 'text-zinc-200',
                    }}
                  >
                    {KIND_KEYS.map((key) => (
                      <SelectItem key={key} className="text-zinc-200">
                        {t(kindLabelKey[key])}
                      </SelectItem>
                    ))}
                  </Select>
                  {form.dimensions.length > 1 && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => removeDimension(i)}
                      className="rounded-lg text-zinc-500 hover:text-neon-red"
                      aria-label={t('evaluator.deleteDimension')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="bordered" color="primary" onPress={addDimension} className="btn-neon-outline rounded-xl border-neon-red/50 text-neon-red">
                {t('evaluator.addDimension')}
              </Button>
            </div>

            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-4">{t('evaluator.aggregation')}</p>
            <div className="flex flex-wrap gap-2">
              <Select
                placeholder={t('evaluator.aggregationMethod')}
                selectedKeys={[form.aggregation.method]}
                onSelectionChange={(keys) => {
                  const m = Array.from(keys)[0] as EvaluatorConfig['aggregation']['method'];
                  if (m) setForm((f) => ({ ...f, aggregation: { ...f.aggregation, method: m } }));
                }}
                size="sm"
                classNames={{
                  trigger: 'rounded-xl bg-white/5 border border-white/10 min-h-9 w-36',
                  value: 'text-zinc-200',
                }}
              >
                {AGGREGATION_KEYS.map((key) => (
                  <SelectItem key={key} className="text-zinc-200">
                    {t(aggregationLabelKey[key])}
                  </SelectItem>
                ))}
              </Select>
              <Input
                placeholder={t('evaluator.primaryDimensionKey')}
                value={form.aggregation.primaryDimension ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, aggregation: { ...f.aggregation, primaryDimension: v.trim() || null } }))}
                size="sm"
                classNames={inputClass}
                className="w-40"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeModal} className="text-zinc-400">
              {t('evaluator.cancel')}
            </Button>
            <Button
              color="primary"
              onPress={saveFromForm}
              isDisabled={!isFormValid}
              className="btn-neon-primary rounded-xl font-medium"
            >
              {editingId ? t('evaluator.save') : t('evaluator.add')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
