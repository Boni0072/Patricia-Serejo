import { Link } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';
import Logo from '../../components/Logo';
import WhatsAppFloat from '../../components/WhatsAppFloat';

export default function PoliticaPrivacidadePage() {
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
            <Shield size={24} className="text-brand-700" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-brand-900">Política de Privacidade</h1>
            <p className="text-ink-500 text-sm">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="prose prose-ink max-w-none space-y-6 text-ink-700 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">1. Introdução</h2>
            <p>
              Esta Política de Privacidade descreve como o escritório Patricia Cristiane
              Serejo Advocacia ("nós", "nosso") coleta, utiliza, armazena e protege os
              dados pessoais dos usuários deste sistema, em conformidade com a Lei Geral
              de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">2. Dados coletados</h2>
            <p>Coletamos os seguintes dados pessoais:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Nome completo, e-mail, telefone e CPF;</li>
              <li>Endereço, quando fornecido para gestão de processos;</li>
              <li>Documentos vinculados a processos jurídicos (procurações, petições, comprovantes);</li>
              <li>Mensagens trocadas pelo portal ou WhatsApp;</li>
              <li>Logs de acesso (data, IP) para fins de auditoria e segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">3. Finalidade do tratamento</h2>
            <p>Os dados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Cadastro e gestão de clientes e processos;</li>
              <li>Comunicação sobre andamento processual;</li>
              <li>Envio de notificações por e-mail e WhatsApp;</li>
              <li>Cumprimento de obrigações legais e regimentais da OAB.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">4. Base legal</h2>
            <p>
              O tratamento dos dados ocorre com base no consentimento explícito do titular
              (art. 7º, I, da LGPD) e na execução de contrato (art. 7º, V).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">5. Compartilhamento</h2>
            <p>
              Seus dados não são compartilhados com terceiros, exceto quando exigido por
              ordem judicial ou para cumprimento de obrigação legal junto aos Tribunais.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">6. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados:
              criptografia em trânsito (HTTPS), backups automáticos, controle de acesso
              por perfis e logs de auditoria.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">7. Seus direitos</h2>
            <p>Você pode, a qualquer momento:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Acessar e corrigir seus dados pessoais;</li>
              <li>Solicitar a exclusão de seus dados (portabilidade/anonimização);</li>
              <li>Revogar o consentimento;</li>
              <li>Solicitar informações sobre o tratamento.</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato pelo e-mail informado no site.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-brand-900 mb-3">8. Retenção</h2>
            <p>
              Os dados são mantidos pelo prazo necessário para cumprir as finalidades
              descritas e conforme obrigações legais aplicáveis à advocacia.
            </p>
          </section>
        </div>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
