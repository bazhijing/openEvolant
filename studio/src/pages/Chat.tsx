import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardBody, CardHeader } from '@heroui/react';

export default function Chat() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl"
    >
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">{t('chat.title')}</h1>
      <p className="text-zinc-400 text-sm mb-6">{t('chat.subtitle')}</p>
      <Card className="bg-surface-elevated border border-surface-border shadow-glow">
        <CardHeader className="border-b border-surface-border/80">
          <span className="text-xs font-medium text-neon-red uppercase tracking-widest">v0.1</span>
          <span className="text-zinc-500 text-sm ml-2">{t('chat.placeholder')}</span>
        </CardHeader>
        <CardBody className="text-zinc-400 text-sm">{t('chat.comingSoon')}</CardBody>
      </Card>
    </motion.div>
  );
}
