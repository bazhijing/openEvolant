import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react';

const IconSend = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const IconBot = () => (
  <svg className="w-5 h-5 text-neon-red/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

/** 模拟：基于 Genes 结果的对话消息 */
type SimMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  genomeRef?: { name: string; score: number; id: string };
  ts: number;
};

const MOCK_GENES_MESSAGES: SimMessage[] = [
  {
    id: 'm1',
    role: 'user',
    text: 'Which evolved genome should I use for reasoning tasks?',
    ts: Date.now() - 120000,
  },
  {
    id: 'm2',
    role: 'agent',
    text: 'Based on your Genes pool, I recommend **Agent v1 — Reasoning** (score 0.92, 24 genes). It\'s stable and best suited for reasoning. Alternatively, **Summarization v2** (0.94) is stronger on summarization-style reasoning.',
    genomeRef: { name: 'Agent v1 — Reasoning', score: 0.92, id: 'g-001' },
    ts: Date.now() - 115000,
  },
  {
    id: 'm3',
    role: 'user',
    text: 'Show me the top 2 by score',
    ts: Date.now() - 60000,
  },
  {
    id: 'm4',
    role: 'agent',
    text: 'Top 2 genomes by score: 1) **Summarization v2** — 0.94 (Gen 22, stable). 2) **Agent v1 — Reasoning** — 0.92 (Gen 12, stable). Both are production-ready.',
    genomeRef: { name: 'Summarization v2', score: 0.94, id: 'g-005' },
    ts: Date.now() - 55000,
  },
];

function MessageBubble({ msg, isLast }: { msg: SimMessage; isLast: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isUser ? 'bg-neon-red/20 border border-neon-red/40' : 'bg-surface-muted border border-surface-border'}`}>
        {isUser ? (
          <span className="text-xs font-bold text-neon-red">U</span>
        ) : (
          <IconBot />
        )}
      </div>
      <div className={`flex-1 min-w-0 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? 'bg-neon-red/15 border border-neon-red/30 text-zinc-100 shadow-neon-red-sm'
              : 'bg-surface-elevated border border-surface-border text-zinc-300'
          }`}
        >
          <p className="whitespace-pre-wrap">{msg.text.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
          {msg.genomeRef && (
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-neon-red/90">
                {msg.genomeRef.name} · {msg.genomeRef.score}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{msg.genomeRef.id}</span>
            </div>
          )}
        </div>
        {isLast && (
          <p className={`text-[10px] text-zinc-500 mt-1 ${isUser ? 'text-right' : ''}`}>
            {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl relative"
    >
      {/* 背景光晕 */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-neon-red/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-56 h-56 bg-neon-red/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          <span className="bg-gradient-to-r from-white via-zinc-200 to-neon-red/90 bg-clip-text text-transparent">
            {t('chat.title')}
          </span>
        </h1>
        <p className="text-zinc-400 text-sm mb-6">{t('chat.subtitle')}</p>

        {/* 主卡片：酷炫样式 */}
        <Card className="bg-surface-elevated/90 border border-surface-border shadow-glow overflow-hidden backdrop-blur-sm">
          <CardHeader className="border-b border-surface-border/80 flex items-center justify-between">
            <span className="text-xs font-medium text-neon-red uppercase tracking-widest">v0.1</span>
            <span className="w-2 h-2 rounded-full bg-neon-red shadow-neon-red-sm animate-pulse" />
          </CardHeader>
          <CardBody className="p-0">
            <p className="text-zinc-400 text-sm px-4 py-3 border-b border-surface-border/80">
              {t('chat.comingSoon')}
            </p>

            {/* Genes 结果对话模拟区 */}
            <div className="p-4 border-b border-surface-border/80">
              <p className="text-[11px] font-medium uppercase tracking-widest text-neon-red/90 mb-3">
                {t('chat.genesDialogueTitle')}
              </p>
              <div className="rounded-xl bg-surface/80 border border-surface-border p-4 space-y-4 min-h-[200px] max-h-[320px] overflow-y-auto">
                <AnimatePresence>
                  {MOCK_GENES_MESSAGES.map((msg, i) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isLast={i === MOCK_GENES_MESSAGES.length - 1}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* 输入区 + 占位说明 */}
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={t('chat.inputPlaceholder')}
                  value={input}
                  onValueChange={setInput}
                  classNames={{
                    inputWrapper: 'rounded-xl bg-white/5 border border-white/10 hover:border-neon-red/30 focus-within:border-neon-red flex-1',
                    input: 'text-zinc-200 placeholder:text-zinc-500',
                  }}
                  size="sm"
                  isReadOnly
                />
                <Button
                  isIconOnly
                  size="sm"
                  className="btn-neon-primary shrink-0"
                  aria-label="Send"
                >
                  <IconSend />
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {t('chat.integrationPlaceholder')}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </motion.div>
  );
}
