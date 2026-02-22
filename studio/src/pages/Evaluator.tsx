import { useState } from 'react';
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

/** 单条件 .evaluator（前端 mock，不调后端） */
type EvaluatorKind = 'ai' | 'cost' | 'time' | 'accuracy' | 'custom';

type SingleEvaluator = {
  specVersion: string;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  kind: EvaluatorKind;
  config: Record<string, unknown>;
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

const initialEvaluators: SingleEvaluator[] = [
  {
    specVersion: '0.1',
    id: 'eval-ai-quality-01',
    name: 'AI quality (1–5 rubric)',
    createdAt: '2025-02-22T00:00:00Z',
    updatedAt: '2025-02-22T00:00:00Z',
    kind: 'ai',
    config: {
      prompt: 'Rate the response quality from 1 to 5. Consider clarity, relevance, and completeness.',
      model: 'gpt-4o-mini',
      temperature: 0,
      outputFormat: 'number',
      min: 1,
      max: 5,
      normalizeToZeroOne: true,
    },
  },
  {
    specVersion: '0.1',
    id: 'eval-cost-01',
    name: 'Cost (token budget)',
    createdAt: '2025-02-22T00:00:00Z',
    updatedAt: '2025-02-22T00:00:00Z',
    kind: 'cost',
    config: { unit: 'usd', cap: 0.01, invert: true },
  },
  {
    specVersion: '0.1',
    id: 'eval-latency-01',
    name: 'Latency',
    createdAt: '2025-02-22T00:00:00Z',
    updatedAt: '2025-02-22T00:00:00Z',
    kind: 'time',
    config: { unit: 'ms', cap: 2000, invert: true },
  },
];

const KIND_KEYS: EvaluatorKind[] = ['ai', 'cost', 'time', 'accuracy', 'custom'];
const kindLabelKey: Record<EvaluatorKind, string> = {
  ai: 'evaluator.kindAi',
  cost: 'evaluator.kindCost',
  time: 'evaluator.kindTime',
  accuracy: 'evaluator.kindAccuracy',
  custom: 'evaluator.kindCustom',
};

const inputClass = {
  inputWrapper: [
    'rounded-xl bg-white/[0.04] border border-white/10',
    'data-[hover=true]:border-white/20 group-data-[focus=true]:border-neon-red/50 group-data-[focus=true]:shadow-[0_0_0_2px_rgba(255,8,68,0.12)]',
  ].join(' '),
  input: 'text-zinc-200 placeholder:text-zinc-500',
  label: 'text-zinc-400 font-normal text-xs',
};

function configSummary(config: Record<string, unknown>, kind: EvaluatorKind): string {
  if (kind === 'ai') {
    const model = config.model as string | undefined;
    const min = config.min as number | undefined;
    const max = config.max as number | undefined;
    const parts = [model].filter(Boolean);
    if (min != null && max != null) parts.push(`${min}–${max}`);
    return parts.join(' · ') || '—';
  }
  if (kind === 'cost' || kind === 'time') {
    const unit = config.unit as string | undefined;
    const cap = config.cap as number | undefined;
    return [unit, cap != null ? `cap ${cap}` : null].filter(Boolean).join(' · ') || '—';
  }
  return Object.keys(config).length ? JSON.stringify(config).slice(0, 24) + '…' : '—';
}

export default function Evaluator() {
  const { t } = useTranslation();
  const [list, setList] = useState<SingleEvaluator[]>(initialEvaluators);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState<SingleEvaluator>(emptyEvaluator());

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl"
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
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t('evaluator.configuredCount', { count: list.length })}</p>
        </div>
        {list.length === 0 ? (
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
          <ul className="divide-y divide-white/5">
            <AnimatePresence>
              {list.map((e, i) => (
                <motion.li
                  key={e.id}
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
                      <p className="text-zinc-100 font-medium truncate">{e.name}</p>
                      <p className="text-zinc-500 text-xs font-mono truncate mt-0.5">{e.id}</p>
                      <p className="text-zinc-600 text-xs mt-1 truncate">{configSummary(e.config, e.kind)}</p>
                    </div>
                    <Chip size="sm" variant="flat" classNames={{ base: 'rounded-lg bg-white/10 border border-white/10 shrink-0', content: 'text-zinc-400 text-xs' }}>
                      {t(kindLabelKey[e.kind])}
                    </Chip>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="light" onPress={() => openEdit(e)} className="rounded-lg text-zinc-400 hover:text-neon-red hover:bg-neon-red/10">
                        {t('evaluator.edit')}
                      </Button>
                      <Tooltip content={t('evaluator.delete')} placement="left" delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => remove(e.id)}
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
              {form.kind === 'ai' && (
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
