import { Link } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';
import Logo from '../../components/Logo';
import WhatsAppFloat from '../../components/WhatsAppFloat';

export default function TermosUsoPage() {
  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Logo comTexto />
          <Link to="/" className="btn-ghost">
            <ChevronLeft size={18} />
            Voltar ao site
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center">
            <FileText size={24} className="text-brand-700" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-brand-900">Termos de Uso</h1>
            <p className="text-ink-500 text-sm">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="space-y-6 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">1. Aceitação</h2>
            <p>
              Ao acessar e utilizar este sistema, você concorda integralmente com estes
              Termos de Uso. Caso não concorde, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">2. Descrição do serviço</h2>
            <p>
              O sistema oferece portal do cliente para acompanhamento de processos
              jurídicos, envio de documentos e mensagens, além de painel administrativo
              para a gestão do escritório.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">3. Cadastro e acesso</h2>
            <p>
              O cadastro é realizado com consentimento explícito. O usuário é responsável
              pela veracidade das informações fornecidas e pela confidencialidade de suas
              credenciais de acesso.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">4. Uso permitido</h2>
            <p>
              O sistema deve ser utilizado apenas para fins legítimos relacionados à
              relação jurídico-advocatícia. É proibido tentar acessar dados de terceiros,
              comprometer a segurança ou utilizar automação não autorizada.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">5. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo institucional, marcas e layout são de propriedade do
              escritório Patricia Cristiane Serejo Advocacia.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">6. Limitação de responsabilidade</h2>
            <p>
              O escritório não se responsabiliza por indisponibilidade temporária do
              serviço por motivos técnicos. As informações processuais refletem o
              registro interno e podem diferir da tramitação oficial dos Tribunais.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">7. Alterações</h2>
            <p>
              Estes Termos podem ser atualizados a qualquer momento. Recomendamos
              revisões periódicas.
            </p>
          </section>
        </div>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
