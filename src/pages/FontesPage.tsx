import { Database } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { FontesTab } from '../components/FontesTab';

export function FontesPage() {
  return (
    <div className="pb-20 md:pb-6">
      <PageHeader
        title="Fontes de Dados"
        subtitle="Gerencie as origens de dados do sistema: importação de arquivos e conexões externas."
      />
      <FontesTab />
    </div>
  );
}

export default FontesPage;
