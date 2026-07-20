import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  Scale,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronRight,
  Quote,
  ArrowRight,
  Shield,
  Lock,
  UserRound,
  Calendar,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Logo from '../../components/Logo';
import WhatsAppFloat from '../../components/WhatsAppFloat';
import {
  useConteudoSite,
  useAreasAtuacao,
  useDepoimentos,
} from '../../hooks/useSiteContent';

export default function SitePublico() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { conteudo } = useConteudoSite();
  const { areas } = useAreasAtuacao();
  const { depoimentos } = useDepoimentos();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#areas', label: 'Áreas de Atuação' },
    { href: '#sobre', label: 'Sobre' },
    { href: '#depoimentos', label: 'Depoimentos' },
    { href: '#contato', label: 'Contato' },
  ];

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo comTexto variante={scrolled ? 'escuro' : 'claro'} />
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={`text-sm font-medium transition-colors ${
                    scrolled ? 'text-ink-700 hover:text-brand-800' : 'text-brand-50 hover:text-white'
                  }`}
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/login"
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  scrolled
                    ? 'bg-brand-800 text-brand-50 hover:bg-brand-900'
                    : 'bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                <UserRound size={16} />
                Acessar
              </Link>
            </nav>
            <button
              className={`md:hidden p-2 ${scrolled ? 'text-ink-800' : 'text-white'}`}
              onClick={() => setMenuAberto(!menuAberto)}
              aria-label="Menu"
            >
              {menuAberto ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menuAberto && (
          <div className="md:hidden bg-white border-t border-ink-100 animate-fade-in">
            <nav className="flex flex-col px-4 py-4 gap-2">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuAberto(false)}
                  className="px-3 py-2.5 text-ink-700 hover:bg-brand-50 rounded-lg font-medium"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/login"
                className="mt-2 px-3 py-2.5 bg-brand-800 text-brand-50 rounded-lg font-medium text-center"
              >
                Acessar sistema
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'url(https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg?auto=compress&cs=tinysrgb&w=1920)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/20 border border-gold-400/30 backdrop-blur-sm mb-6 animate-fade-in">
              <Shield size={14} className="text-gold-300" />
              <span className="text-xs font-medium text-gold-100 tracking-wide">
                OAB/UF — Advocacia e Consultoria Jurídica
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] text-balance animate-fade-in">
              {conteudo['hero_titulo'] || 'Defesa jurídica com dedicação e proximidade'}
            </h1>
            <p className="mt-6 text-lg text-brand-100 leading-relaxed max-w-2xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {conteudo['hero_subtitulo'] ||
                'Atuação humanizada e técnica em diversas áreas do Direito.'}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <a href="#contato" className="btn-gold">
                <Calendar size={18} />
                {conteudo['hero_botao'] || 'Agendar consulta'}
              </a>
              <a
                href="#areas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-lg border border-white/30 hover:bg-white/10 backdrop-blur-sm transition-all"
              >
                Conhecer áreas de atuação
                <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-brand-50 to-transparent" />
      </section>

      {/* Áreas de Atuação */}
      <section id="areas" className="py-24 bg-brand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-gold-600 font-medium text-sm tracking-[0.2em] uppercase mb-3">
              Nossas especialidades
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-brand-900">
              Áreas de Atuação
            </h2>
            <div className="mt-6 w-16 h-0.5 bg-gold-500 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.map((area, idx) => {
              const Icone = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>)[area.icone] || Scale;
              return (
                <div
                  key={area.id}
                  className="group card p-7 hover:shadow-lg hover:border-brand-200 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-brand-100 group-hover:bg-brand-800 transition-colors flex items-center justify-center mb-5">
                    <Icone size={24} className="text-brand-700 group-hover:text-gold-400 transition-colors" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-xl text-brand-900 mb-2">{area.titulo}</h3>
                  <p className="text-ink-600 text-sm leading-relaxed">{area.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Dra. Patricia Cristiane Serejo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-brand-800 text-brand-50 p-6 rounded-xl shadow-lg max-w-[200px] hidden sm:block">
                <Scale size={28} className="text-gold-400 mb-2" />
                <p className="font-serif text-lg leading-tight">Atendimento personalizado</p>
                <p className="text-xs text-brand-200 mt-1">com ética e transparência</p>
              </div>
            </div>
            <div>
              <p className="text-gold-600 font-medium text-sm tracking-[0.2em] uppercase mb-3">
                Quem somos
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-brand-900 mb-6">
                {conteudo['sobre_titulo'] || 'Sobre Dra. Patricia Cristiane Serejo'}
              </h2>
              <div className="w-16 h-0.5 bg-gold-500 mb-6" />
              <p className="text-ink-700 leading-relaxed text-lg">
                {conteudo['sobre_texto'] ||
                  'Atuação humanizada e técnica na defesa dos direitos de seus clientes.'}
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { num: '+10', label: 'Anos de experiência' },
                  { num: '+500', label: 'Casos atendidos' },
                  { num: '6', label: 'Áreas do Direito' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-4 bg-brand-50 rounded-xl">
                    <p className="font-serif text-2xl text-brand-800">{stat.num}</p>
                    <p className="text-xs text-ink-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      {depoimentos.length > 0 && (
        <section id="depoimentos" className="py-24 bg-brand-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-gold-600 font-medium text-sm tracking-[0.2em] uppercase mb-3">
                O que dizem nossos clientes
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-brand-900">Depoimentos</h2>
              <div className="mt-6 w-16 h-0.5 bg-gold-500 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {depoimentos.map((d) => (
                <div key={d.id} className="card p-8 relative">
                  <Quote size={36} className="text-gold-300 absolute top-6 right-6" />
                  <p className="text-ink-700 leading-relaxed italic">"{d.texto}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center text-gold-400 font-serif text-lg">
                      {d.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-brand-900">{d.nome}</p>
                      {d.cargo && <p className="text-xs text-ink-500">{d.cargo}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contato */}
      <section id="contato" className="py-24 bg-brand-900 text-brand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <p className="text-gold-400 font-medium text-sm tracking-[0.2em] uppercase mb-3">
                Fale conosco
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-white mb-6">
                Agende sua consulta
              </h2>
              <div className="w-16 h-0.5 bg-gold-500 mb-8" />
              <p className="text-brand-200 leading-relaxed mb-10 max-w-md">
                Entre em contato para uma avaliação inicial do seu caso. Atendemos com
                discrição, respeito e profissionalismo.
              </p>
              <div className="space-y-5">
                {conteudo['contato_telefone'] && (
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-brand-800 flex items-center justify-center">
                      <Phone size={18} className="text-gold-400" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-300 uppercase tracking-wide">Telefone</p>
                      <p className="text-white">{conteudo['contato_telefone']}</p>
                    </div>
                  </div>
                )}
                {conteudo['contato_email'] && (
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-brand-800 flex items-center justify-center">
                      <Mail size={18} className="text-gold-400" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-300 uppercase tracking-wide">E-mail</p>
                      <p className="text-white">{conteudo['contato_email']}</p>
                    </div>
                  </div>
                )}
                {conteudo['contato_endereco'] && (
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-brand-800 flex items-center justify-center">
                      <MapPin size={18} className="text-gold-400" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-300 uppercase tracking-wide">Endereço</p>
                      <p className="text-white">{conteudo['contato_endereco']}</p>
                    </div>
                  </div>
                )}
                {conteudo['contato_horario'] && (
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-brand-800 flex items-center justify-center">
                      <Clock size={18} className="text-gold-400" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-300 uppercase tracking-wide">Horário</p>
                      <p className="text-white">{conteudo['contato_horario']}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
              <h3 className="font-serif text-2xl text-white mb-2">Acesso ao sistema</h3>
              <p className="text-brand-200 text-sm mb-6">
                Já é cliente? Acesse o portal para acompanhar seus processos, enviar
                documentos e conversar com o escritório.
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="btn-gold w-full justify-center">
                  <UserRound size={18} />
                  Entrar no portal
                </Link>
                <Link
                  to="/cadastro"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-lg border border-white/30 hover:bg-white/10 transition-all"
                >
                  Criar conta
                  <ChevronRight size={16} />
                </Link>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-brand-300 text-xs">
                <Lock size={14} />
                Dados protegidos em conformidade com a LGPD
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-950 text-brand-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <Logo comTexto variante="claro" />
              <p className="mt-4 text-sm text-brand-400 max-w-xs">
                {conteudo['rodape_texto'] || 'Patricia Cristiane Serejo Advocacia'}
              </p>
            </div>
            <div>
              <p className="text-white font-medium mb-3">Navegação</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#inicio" className="hover:text-gold-400 transition-colors">Início</a></li>
                <li><a href="#areas" className="hover:text-gold-400 transition-colors">Áreas de Atuação</a></li>
                <li><a href="#sobre" className="hover:text-gold-400 transition-colors">Sobre</a></li>
                <li><a href="#contato" className="hover:text-gold-400 transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-medium mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/politica-privacidade" className="hover:text-gold-400 transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/termos-uso" className="hover:text-gold-400 transition-colors">Termos de Uso</Link></li>
                <li><Link to="/login" className="hover:text-gold-400 transition-colors">Acesso ao sistema</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-brand-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-brand-400">
            <p>© {new Date().getFullYear()} Patricia Cristiane Serejo Advocacia. Todos os direitos reservados.</p>
            <p>Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
