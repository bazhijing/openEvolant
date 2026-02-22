import { useEffect, useMemo, useState } from 'react';
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
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';

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

type SupportedModel = { id: string; name: string };
type SupportedVendor = { id: string; name: string; models: SupportedModel[] };
type SupportedVendorsResponse = { vendors: SupportedVendor[] };

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:3000' : '';

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

function modelKey(provider: string, model: string): string {
  return `${provider}-${model}`.replace(/\s+/g, '-').toLowerCase();
}

export default function Settings() {
  const { t } = useTranslation();
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => emptyLlmConfig(t('settings.defaultConfigName')));
  const [supported, setSupported] = useState<SupportedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 添加表单：下拉选供应商，多选模型，一个 Token
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [addFormApiKey, setAddFormApiKey] = useState('');
  const [addFormBaseURL, setAddFormBaseURL] = useState('');
  const [addFormShowToken, setAddFormShowToken] = useState(true);
  const [showTokenForIds, setShowTokenForIds] = useState<Set<string>>(new Set());
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [saveSuccessPath, setSaveSuccessPath] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const [llmRes, supportedRes] = await Promise.all([
        fetch(`${API_BASE}/api/config/llm`),
        fetch(`${API_BASE}/api/config/llm/supported`),
      ]);
      const text = await llmRes.text();
      if (!llmRes.ok) {
        throw new Error(text || `Request failed ${llmRes.status}`);
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

      const supportedText = await supportedRes.text();
      if (supportedRes.ok && !supportedText.trimStart().startsWith('<')) {
        try {
          const supportedData = JSON.parse(supportedText) as SupportedVendorsResponse;
          setSupported(Array.isArray(supportedData.vendors) ? supportedData.vendors : []);
        } catch {
          setSupported([]);
        }
      } else {
        setSupported([]);
      }
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
    if (llmConfig.models.length < 1) {
      setError(t('settings.minOneModel'));
      return;
    }
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
      let data: LLMConfig & { savedPath?: string };
      try {
        data = JSON.parse(text);
      } catch {
        setError(t('settings.errorSaveSuccessButInvalid'));
        return;
      }
      setLlmConfig({
        specVersion: data.specVersion,
        id: data.id,
        name: data.name,
        models: data.models,
      });
      setSaveSuccessPath(typeof data.savedPath === 'string' ? data.savedPath : null);
      setSaveSuccessOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const addedProviderIds = useMemo(
    () => new Set(llmConfig.models.map((m) => m.provider)),
    [llmConfig.models]
  );
  const availableVendors = useMemo(
    () => supported.filter((v) => !addedProviderIds.has(v.id)),
    [supported, addedProviderIds]
  );

  useEffect(() => {
    if (selectedVendor && addedProviderIds.has(selectedVendor)) {
      setSelectedVendor('');
      setSelectedModelIds(new Set());
    }
  }, [addedProviderIds, selectedVendor]);

  const currentVendor = availableVendors.find((v) => v.id === selectedVendor);
  const currentModels = currentVendor?.models ?? [];

  const toggleAddFormModel = (modelId: string) => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  const handleAddByVendor = () => {
    setError(null);
    if (!selectedVendor) {
      setError(t('settings.addValidationVendor'));
      return;
    }
    if (selectedModelIds.size < 1) {
      setError(t('settings.addValidationModels'));
      return;
    }
    const key = addFormApiKey.trim();
    if (!key) {
      setError(t('settings.addValidationApiKey'));
      return;
    }
    const vendor = supported.find((v) => v.id === selectedVendor);
    if (!vendor) return;
    const baseURLVal = addFormBaseURL.trim() || null;
    const existingIds = new Set(llmConfig.models.map((m) => m.id));
    const toAdd: LLMModel[] = [];
    for (const modelId of selectedModelIds) {
      const baseId = modelKey(selectedVendor, modelId);
      let uniqueId = baseId;
      if (existingIds.has(uniqueId)) uniqueId = `${baseId}-${Date.now()}-${toAdd.length}`;
      existingIds.add(uniqueId);
      toAdd.push({
        id: uniqueId,
        provider: selectedVendor,
        model: modelId,
        apiKey: key,
        baseURL: baseURLVal,
      });
    }
    setLlmConfig((prev) => ({
      ...prev,
      models: [...prev.models, ...toAdd],
    }));
    setSelectedModelIds(new Set());
    setAddFormApiKey('');
    setAddFormBaseURL('');
  };

  const updateModelField = (modelId: string, field: 'apiKey' | 'baseURL', value: string) => {
    setLlmConfig((prev) => ({
      ...prev,
      models: prev.models.map((m) =>
        m.id === modelId ? { ...m, [field]: field === 'baseURL' ? value || null : value } : m
      ),
    }));
  };

  const handleRemove = (id: string) => {
    setLlmConfig((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m.id !== id),
    }));
  };

  const canSave = llmConfig.models.length >= 1;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neon-red/90 mb-1.5">{t('setting')}</p>
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
          isDisabled={saving || !canSave}
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
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{t('settings.addConfig')}</p>
        <p className="text-zinc-600 text-xs mb-3">{t('settings.supportedHint')}</p>
        {supported.length === 0 ? (
          <p className="text-zinc-500 text-sm">{t('settings.noModels')}</p>
        ) : availableVendors.length === 0 ? (
          <p className="text-zinc-500 text-sm">{t('settings.allVendorsAdded')}</p>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
            <Select
              label={t('settings.selectVendor')}
              placeholder={t('settings.selectVendorPlaceholder')}
              selectedKeys={selectedVendor ? [selectedVendor] : []}
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0] as string;
                setSelectedVendor(k ?? '');
                setSelectedModelIds(new Set());
              }}
              size="sm"
              classNames={{
                trigger: 'rounded-xl bg-white/5 border border-white/10',
                value: 'text-zinc-200',
                label: 'text-zinc-400',
              }}
              aria-label={t('settings.selectVendor')}
            >
              {availableVendors.map((v) => (
                <SelectItem key={v.id} className="text-zinc-200">
                  {v.name}
                </SelectItem>
              ))}
            </Select>

            {currentVendor && (
              <>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">{t('settings.selectModelsForVendor')}</p>
                <div className="flex flex-wrap gap-4">
                  {currentModels.map((mod) => (
                    <Checkbox
                      key={mod.id}
                      isSelected={selectedModelIds.has(mod.id)}
                      onChange={() => toggleAddFormModel(mod.id)}
                      classNames={{
                        base: 'rounded-lg border border-white/10 bg-white/[0.02] max-w-full',
                        label: 'text-zinc-300 text-sm',
                      }}
                    >
                      {mod.name}
                    </Checkbox>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input
                    aria-label={t('settings.apiKey')}
                    type={addFormShowToken ? 'text' : 'password'}
                    label={t('settings.tokenForVendor')}
                    placeholder={t('settings.apiKeyPlaceholder', { var: '${VAR}' })}
                    value={addFormApiKey}
                    onValueChange={setAddFormApiKey}
                    size="sm"
                    classNames={inputClass}
                    className="w-full rounded-xl"
                    endContent={
                      <button
                        type="button"
                        onClick={() => setAddFormShowToken((v) => !v)}
                        className="focus:outline-none p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                        aria-label={addFormShowToken ? t('settings.hideToken') : t('settings.showToken')}
                      >
                        {addFormShowToken ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    }
                  />
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <Input
                      aria-label={t('settings.baseUrl')}
                      label={t('settings.baseUrl')}
                      placeholder={t('settings.baseUrlPlaceholder')}
                      value={addFormBaseURL}
                      onValueChange={setAddFormBaseURL}
                      size="sm"
                      classNames={inputClass}
                      className="sm:flex-1 w-full rounded-xl"
                    />
                    <Button
                      size="sm"
                      variant="solid"
                      color="primary"
                      onPress={handleAddByVendor}
                      isDisabled={selectedModelIds.size < 1 || !addFormApiKey.trim()}
                      className="btn-neon-primary rounded-xl font-medium sm:shrink-0 w-full sm:w-auto"
                    >
                      {t('settings.addToModels')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">
        {t('settings.selectedConfig')} · {t('settings.configuredCount', { count: llmConfig.models.length })}
      </p>

      {llmConfig.models.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center">
          <p className="text-zinc-500 text-sm">{t('settings.noModels')}</p>
          <p className="text-zinc-600 text-xs mt-1">{t('settings.noModelsHint')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence>
            {llmConfig.models.map((m) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-colors p-4"
              >
                <div className="flex flex-wrap items-end gap-3">
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
                  <Input
                    aria-label={t('settings.apiKey')}
                    type={showTokenForIds.has(m.id) ? 'text' : 'password'}
                    placeholder={t('settings.apiKeyPlaceholder', { var: '${VAR}' })}
                    value={m.apiKey}
                    onValueChange={(v) => updateModelField(m.id, 'apiKey', v)}
                    size="sm"
                    classNames={inputClass}
                    className="flex-1 min-w-[160px] max-w-[220px] rounded-xl"
                    endContent={
                      <button
                        type="button"
                        onClick={() => setShowTokenForIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(m.id)) next.delete(m.id);
                          else next.add(m.id);
                          return next;
                        })}
                        className="focus:outline-none p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                        aria-label={showTokenForIds.has(m.id) ? t('settings.hideToken') : t('settings.showToken')}
                      >
                        {showTokenForIds.has(m.id) ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    }
                  />
                  <Input
                    aria-label={t('settings.baseUrl')}
                    placeholder={t('settings.baseUrlPlaceholder')}
                    value={m.baseURL ?? ''}
                    onValueChange={(v) => updateModelField(m.id, 'baseURL', v)}
                    size="sm"
                    classNames={inputClass}
                    className="flex-1 min-w-[140px] max-w-[200px] rounded-xl"
                  />
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

      <Modal isOpen={saveSuccessOpen} onOpenChange={setSaveSuccessOpen}>
        <ModalContent>
          <ModalHeader className="text-zinc-100">{t('settings.saveSuccessTitle')}</ModalHeader>
          <ModalBody>
            <p className="text-zinc-400 text-sm">{t('settings.saveSuccessMessage')}</p>
            {saveSuccessPath ? (
              <code className="block mt-2 p-3 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs break-all">
                {saveSuccessPath}
              </code>
            ) : (
              <p className="text-zinc-500 text-sm mt-1">config/llm/default.llm.json</p>
            )}
            {import.meta.env.DEV && (
              <p className="text-zinc-500 text-xs mt-2">{t('settings.saveSuccessDevHint')}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => setSaveSuccessOpen(false)} className="rounded-xl">
              {t('settings.saveSuccessOk')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
