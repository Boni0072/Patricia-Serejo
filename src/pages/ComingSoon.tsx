import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Construction, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface ComingSoonProps {
  modulo: string;
  descricao: string;
  icon: LucideIcon;
  features: string[];
}

export function ComingSoon({ modulo, descricao, icon: Icon, features }: ComingSoonProps) {
  return (
    <div className="pb-20 md:pb-6">
      <PageHeader title={modulo} subtitle={descricao} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card padding="lg" className="max-w-2xl mx-auto text-center">
          <div className="h-16 w-16 rounded-2xl bg-accent/15 grid place-items-center mx-auto mb-4">
            <Icon size={30} className="text-accent" />
          </div>
          <Badge tone="info" dot>Planejado para próximas fases</Badge>
          <h2 className="text-xl font-semibold text-content mt-4">{modulo} em construção</h2>
          <p className="text-sm text-content-muted mt-2 max-w-md mx-auto">
            Este módulo fará parte das próximas fases do roadmap. A estrutura de dados, filtros e navegação já estão prontos para recebê-lo.
          </p>
          <div className="mt-6 text-left max-w-md mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-2">O que você encontrará aqui:</p>
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-content">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-accent font-medium mt-6 hover:underline">
            <ArrowLeft size={15} /> Voltar ao Dashboard
          </Link>
        </Card>
      </motion.div>
    </div>
  );
}

export function FaseEmBreve({ modulo, descricao, icon, features }: ComingSoonProps) {
  return <ComingSoon modulo={modulo} descricao={descricao} icon={icon} features={features} />;
}

export function GenericConstruction() {
  return (
    <div className="pb-20 md:pb-6">
      <Card padding="lg" className="text-center max-w-lg mx-auto mt-12">
        <Construction size={36} className="mx-auto mb-3 text-content-muted opacity-50" />
        <p className="text-sm text-content-muted">Este módulo será implementado nas próximas fases do roadmap.</p>
      </Card>
    </div>
  );
}
