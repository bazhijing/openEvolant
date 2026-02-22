import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Input,
  Button,
  Divider,
  Chip,
  Alert,
  Skeleton,
  Tooltip,
  Select,
  SelectItem,
} from '@heroui/react';
import i18n from '../i18n';

type LLMModel = {
  id: string;
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string | null;
};

type LLMConfig = {
  specVersion: string;
  id: string;
  name: string;
  models: LLMModel[];
};

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3000' : '';

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  if (key.startsWith('${') && key.endsWith('}')) return key;
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

/* 保留 HeroUI 圆角，仅叠加边框与霓虹焦点 */
const inputClass = {
  inputWrapper: [
    'rounded-xl bg-white/5 border border-white/10 input-neon-wrap',
    'data-[hover=true]:border-neon-red/40 group-data-[focus=true]:border-neon-red',
  ].join(' '),
  input: 'text-zinc-200 placeholder:text-zinc-500',
  label: 'text-zinc-400 font-normal',
};

const emptyLlmConfig = (name: string): LLMConfig => ({
  specVersion: '0.1',
  id: 'default-llm',
  name,
  models: [],
});

export default function Settings() {
  const { t } = useTranslation();
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => emptyLlmConfig(t('settings.defaultConfigName')));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/config/llm`);
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || `Request failed ${res.status}`);
      }
      if (text.trimStart().startsWith('<')) {
        setError(t('settings.errorBackend'));
        setLlmConfig(emptyLlmConfig(t('settings.defaultConfigName')));
        return;
      }
      let data: LLMConfig;
      try {
        data = JSON.parse(text);
      } catch {
        setError(t('settings.errorNotJson'));
        setLlmConfig(emptyLlmConfig(t('settings.defaultConfigName')));
        return;
      }
      setLlmConfig({
        specVersion: data.specVersion ?? '0.1',
        id: data.id ?? 'default-llm',
        name: data.name ?? t('settings.defaultConfigName'),
        models: Array.isArray(data.models) ? data.models : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLlmConfig(emptyLlmConfig(t('settings.defaultConfigName')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/config/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmConfig),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || `保存失败 ${res.status}`);
      }
      if (text.trimStart().startsWith('<')) {
        setError(t('settings.errorNotConnected'));
        return;
      }
      let data: LLMConfig;
      try {
        data = JSON.parse(text);
      } catch {
        setError(t('settings.errorSaveSuccessButInvalid'));
        return;
      }
      setLlmConfig(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const trimmedProvider = provider.trim();
    const trimmedModel = model.trim();
    const trimmedKey = apiKey.trim();
    if (!trimmedProvider || !trimmedModel || !trimmedKey) return;
    const id = `${trimmedProvider}-${trimmedModel}`.replace(/\s+/g, '-').toLowerCase();
    const existing = llmConfig.models.some((m) => m.id === id);
    const newId = existing ? `${id}-${Date.now()}` : id;
    setLlmConfig((prev) => ({
      ...prev,
      models: [
        ...prev.models,
        {
          id: newId,
          provider: trimmedProvider,
          model: trimmedModel,
          apiKey: trimmedKey,
          baseURL: baseURL.trim() || null,
        },
      ],
    }));
    setProvider('');
    setModel('');
    setApiKey('');
    setBaseURL('');
  };

  const handleRemove = (id: string) => {
    setLlmConfig((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m.id !== id),
    }));
  };

  const canAdd = provider.trim() && model.trim() && apiKey.trim();

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-6">
        <div>
          <Skeleton className="mb-2 h-7 w-24 rounded-md bg-white/10" />
          <Skeleton className="h-4 w-64 rounded bg-white/5" />
        </div>
        <Divider className="bg-white/10" />
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-36 rounded-lg bg-white/10" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl"
    >
      {/* Language switcher */}
      <div className="flex justify-end mb-4">
        <Select
          selectedKeys={[i18n.language]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as string;
            if (k) i18n.changeLanguage(k);
          }}
          size="sm"
          classNames={{
            trigger: 'rounded-xl bg-white/5 border border-white/10 min-h-9 w-36',
            value: 'text-zinc-200',
          }}
          aria-label={t('common.language')}
        >
          <SelectItem key="en" className="text-zinc-200">{t('common.english')}</SelectItem>
          <SelectItem key="zh" className="text-zinc-200">{t('common.chinese')}</SelectItem>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">{t('settings.title')}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {t('settings.subtitle', { var: '${KEY}' })}
          </p>
        </div>
        <Button
          color="primary"
          size="sm"
          variant="solid"
          onPress={handleSave}
          isLoading={saving}
          isDisabled={saving}
          className="btn-neon-primary min-w-[100px] rounded-xl font-medium"
        >
          {saving ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>

      {error && (
        <Alert
          description={error}
          color="danger"
          variant="flat"
          className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10"
          classNames={{ base: 'py-2 rounded-xl' }}
        />
      )}

      <Divider className="bg-white/10 mb-6" />

      <div className="mb-6">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">{t('settings.addModel')}</p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label={t('settings.provider')}
            placeholder={t('settings.providerPlaceholder')}
            value={provider}
            onValueChange={setProvider}
            size="sm"
            classNames={inputClass}
            className="w-28 rounded-xl"
          />
          <Input
            aria-label={t('settings.model')}
            placeholder={t('settings.modelPlaceholder')}
            value={model}
            onValueChange={setModel}
            size="sm"
            classNames={inputClass}
            className="w-28 rounded-xl"
          />
          <Input
            aria-label={t('settings.apiKey')}
            type="password"
            placeholder={t('settings.apiKeyPlaceholder', { var: '${VAR}' })}
            value={apiKey}
            onValueChange={setApiKey}
            size="sm"
            classNames={inputClass}
            className="w-44 rounded-xl"
          />
          <Input
            aria-label={t('settings.baseUrl')}
            placeholder={t('settings.baseUrlPlaceholder')}
            value={baseURL}
            onValueChange={setBaseURL}
            size="sm"
            classNames={inputClass}
            className="w-40 rounded-xl"
          />
          <Button
            size="sm"
            variant="bordered"
            color="primary"
            onPress={handleAdd}
            isDisabled={!canAdd}
            className="btn-neon-outline rounded-xl font-medium border-neon-red/50 text-neon-red data-[hover=true]:bg-neon-red/10"
          >
            {t('settings.add')}
          </Button>
        </div>
      </div>

      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">
        {t('settings.configuredCount', { count: llmConfig.models.length })}
      </p>

      {llmConfig.models.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center">
          <p className="text-zinc-500 text-sm">{t('settings.noModels')}</p>
          <p className="text-zinc-600 text-xs mt-1">{t('settings.noModelsHint')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence>
            {llmConfig.models.map((m) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-colors"
              >
                <div className="flex items-center gap-4 px-4 py-3">
                  <Chip
                    size="sm"
                    variant="flat"
                    classNames={{
                      base: 'rounded-lg bg-neon-red/15 border border-neon-red/30',
                      content: 'text-neon-red font-medium text-xs',
                    }}
                  >
                    {m.provider}
                  </Chip>
                  <span className="text-zinc-300 text-sm font-medium">{m.model}</span>
                  <span className="font-mono text-xs text-zinc-500 flex-1 truncate max-w-[140px]">
                    {maskApiKey(m.apiKey)}
                  </span>
                  {m.baseURL && (
                    <span className="text-zinc-600 text-xs truncate max-w-[120px]" title={m.baseURL}>
                      {m.baseURL}
                    </span>
                  )}
                  <Tooltip content={t('settings.delete')} placement="left" delay={300}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => handleRemove(m.id)}
                      className="rounded-lg text-zinc-500 hover:text-neon-red hover:bg-neon-red/10 min-w-8 w-8"
                      aria-label={t('settings.delete')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </Tooltip>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  );
}
