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

/* =========================================================
   FLOR DECORATIVA
========================================================= */

function FloralAccent({
  className = '',
  color = 'var(--cherry)',
  accent = 'var(--gold)',
  opacity = 0.65,
  flip = false,
}: {
  className?: string;
  color?: string;
  accent?: string;
  opacity?: number;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 220 220"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{
        transform: flip ? 'scaleX(-1)' : undefined,
        opacity,
      }}
    >
      {/* GALHOS */}

      <path
        d="M108 210 C108 165 96 130 78 102 C62 77 42 58 12 42"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.65"
      />

      <path
        d="M82 107 C108 88 132 67 158 32"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />

      <path
        d="M97 145 C130 130 160 111 193 82"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* FOLHAS */}

      <ellipse
        cx="62"
        cy="82"
        rx="7"
        ry="15"
        fill={color}
        transform="rotate(-48 62 82)"
        opacity="0.45"
      />

      <ellipse
        cx="133"
        cy="74"
        rx="6"
        ry="14"
        fill={color}
        transform="rotate(45 133 74)"
        opacity="0.4"
      />

      <ellipse
        cx="145"
        cy="128"
        rx="6"
        ry="14"
        fill={color}
        transform="rotate(55 145 128)"
        opacity="0.35"
      />

      <ellipse
        cx="100"
        cy="155"
        rx="6"
        ry="13"
        fill={color}
        transform="rotate(-35 100 155)"
        opacity="0.3"
      />

      {/* FLOR 1 */}

      <g transform="translate(42 42)">
        <circle cx="0" cy="-13" r="10" fill={color} />
        <circle cx="13" cy="0" r="10" fill={color} />
        <circle cx="0" cy="13" r="10" fill={color} />
        <circle cx="-13" cy="0" r="10" fill={color} />

        <circle
          cx="9"
          cy="-9"
          r="8"
          fill={color}
          opacity="0.85"
        />

        <circle
          cx="-9"
          cy="-9"
          r="8"
          fill={color}
          opacity="0.85"
        />

        <circle cx="0" cy="0" r="6" fill={accent} />
      </g>

      {/* FLOR 2 */}

      <g transform="translate(158 32) scale(.78)">
        <circle cx="0" cy="-13" r="10" fill={color} />
        <circle cx="13" cy="0" r="10" fill={color} />
        <circle cx="0" cy="13" r="10" fill={color} />
        <circle cx="-13" cy="0" r="10" fill={color} />

        <circle cx="9" cy="-9" r="8" fill={color} />
        <circle cx="-9" cy="-9" r="8" fill={color} />

        <circle cx="0" cy="0" r="6" fill={accent} />
      </g>

      {/* FLOR 3 */}

      <g transform="translate(192 82) scale(.65)">
        <circle cx="0" cy="-13" r="10" fill={color} />
        <circle cx="13" cy="0" r="10" fill={color} />
        <circle cx="0" cy="13" r="10" fill={color} />
        <circle cx="-13" cy="0" r="10" fill={color} />

        <circle cx="9" cy="-9" r="8" fill={color} />
        <circle cx="-9" cy="-9" r="8" fill={color} />

        <circle cx="0" cy="0" r="6" fill={accent} />
      </g>

      {/* FLOR 4 */}

      <g transform="translate(76 104) scale(.55)">
        <circle cx="0" cy="-13" r="10" fill={color} />
        <circle cx="13" cy="0" r="10" fill={color} />
        <circle cx="0" cy="13" r="10" fill={color} />
        <circle cx="-13" cy="0" r="10" fill={color} />

        <circle cx="9" cy="-9" r="8" fill={color} />
        <circle cx="-9" cy="-9" r="8" fill={color} />

        <circle cx="0" cy="0" r="6" fill={accent} />
      </g>

      {/* FLOR 5 */}

      <g transform="translate(118 160) scale(.45)">
        <circle cx="0" cy="-13" r="10" fill={color} />
        <circle cx="13" cy="0" r="10" fill={color} />
        <circle cx="0" cy="13" r="10" fill={color} />
        <circle cx="-13" cy="0" r="10" fill={color} />

        <circle cx="9" cy="-9" r="8" fill={color} />
        <circle cx="-9" cy="-9" r="8" fill={color} />

        <circle cx="0" cy="0" r="6" fill={accent} />
      </g>
    </svg>
  );
}

/* =========================================================
   PEQUENA FLOR DE FUNDO
========================================================= */

function BackgroundFlower({
  className = '',
  color = 'var(--cherry)',
  opacity = 0.15,
  scale = 1,
}: {
  className?: string;
  color?: string;
  opacity?: number;
  scale?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <g fill={color}>
        <ellipse
          cx="50"
          cy="20"
          rx="16"
          ry="25"
        />

        <ellipse
          cx="80"
          cy="38"
          rx="16"
          ry="25"
          transform="rotate(55 80 38)"
        />

        <ellipse
          cx="70"
          cy="75"
          rx="16"
          ry="25"
          transform="rotate(120 70 75)"
        />

        <ellipse
          cx="30"
          cy="75"
          rx="16"
          ry="25"
          transform="rotate(-120 30 75)"
        />

        <ellipse
          cx="20"
          cy="38"
          rx="16"
          ry="25"
          transform="rotate(-55 20 38)"
        />
      </g>

      <circle
        cx="50"
        cy="50"
        r="10"
        fill="var(--gold)"
      />
    </svg>
  );
}

/* =========================================================
   SITE PÚBLICO
========================================================= */

export default function SitePublico() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { conteudo } = useConteudoSite();
  const { areas } = useAreasAtuacao();
  const { depoimentos } = useDepoimentos();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const navLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#areas', label: 'Áreas de Atuação' },
    { href: '#sobre', label: 'Sobre' },
    { href: '#depoimentos', label: 'Depoimentos' },
    { href: '#contato', label: 'Contato' },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--cream)',
        color: 'var(--text-primary)',
      }}
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'backdrop-blur-md shadow-lg' : ''
        }`}
        style={{
          backgroundColor: 'rgba(91, 13, 34, 0.97)',
          borderBottom:
            '1px solid rgba(212, 176, 106, 0.55)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-20">

            <Logo
              comTexto
              variante="claro"
            />

            {/* MENU DESKTOP */}

            <nav className="hidden md:flex items-center gap-7">

              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium transition-all duration-300"
                  style={{
                    color: 'var(--cream-light)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color =
                      'var(--gold-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color =
                      'var(--cream-light)';
                  }}
                >
                  {l.label}
                </a>
              ))}

              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm"
                style={{
                  backgroundColor: 'var(--gold)',
                  color: 'var(--primary-dark)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--gold-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--gold)';
                }}
              >
                <UserRound size={16} />
                Acessar
              </Link>

            </nav>

            {/* MENU MOBILE */}

            <button
              className="md:hidden p-2"
              style={{
                color: 'var(--cream-light)',
              }}
              onClick={() =>
                setMenuAberto(!menuAberto)
              }
              aria-label="Menu"
            >
              {menuAberto ? <X /> : <Menu />}
            </button>

          </div>
        </div>

        {menuAberto && (
          <div
            className="md:hidden animate-fade-in"
            style={{
              backgroundColor: 'var(--primary-dark)',
              borderTop:
                '1px solid rgba(212, 176, 106, 0.35)',
            }}
          >
            <nav className="flex flex-col px-4 py-4 gap-2">

              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() =>
                    setMenuAberto(false)
                  }
                  className="px-3 py-3 rounded-lg font-medium transition-all"
                  style={{
                    color: 'var(--cream-light)',
                  }}
                >
                  {l.label}
                </a>
              ))}

              <Link
                to="/login"
                className="mt-2 px-3 py-3 rounded-lg font-medium text-center"
                style={{
                  backgroundColor: 'var(--gold)',
                  color: 'var(--primary-dark)',
                }}
              >
                Acessar sistema
              </Link>

            </nav>
          </div>
        )}

      </header>


      {/* =====================================================
          HERO
      ====================================================== */}

      <section
        id="inicio"
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{
          backgroundColor: 'var(--cream)',
        }}
      >

        {/* =================================================
            FUNDO FLORAL
        ================================================== */}

        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          {/* Flor grande superior esquerda */}

          <FloralAccent
            className="absolute -left-24 -top-10 w-[390px] h-[390px]"
            color="var(--cherry)"
            accent="var(--gold)"
            opacity={0.28}
          />

          {/* Flor grande superior direita */}

          <FloralAccent
            className="absolute -right-28 top-16 w-[450px] h-[450px]"
            color="var(--cherry-light)"
            accent="var(--gold)"
            opacity={0.24}
            flip
          />

          {/* Flor inferior esquerda */}

          <FloralAccent
            className="absolute -left-32 bottom-[-70px] w-[400px] h-[400px]"
            color="var(--cherry)"
            accent="var(--gold)"
            opacity={0.20}
          />

          {/* Flor inferior direita */}

          <FloralAccent
            className="absolute -right-28 bottom-[-70px] w-[430px] h-[430px]"
            color="var(--cherry-light)"
            accent="var(--gold)"
            opacity={0.20}
            flip
          />

          {/* Flores pequenas espalhadas */}

          <BackgroundFlower
            className="absolute left-[20%] top-[18%] w-16 h-16"
            color="var(--cherry)"
            opacity={0.10}
            scale={0.8}
          />

          <BackgroundFlower
            className="absolute right-[27%] top-[28%] w-20 h-20"
            color="var(--cherry-light)"
            opacity={0.09}
            scale={0.7}
          />

          <BackgroundFlower
            className="absolute left-[30%] bottom-[20%] w-24 h-24"
            color="var(--cherry)"
            opacity={0.08}
            scale={0.8}
          />

          <BackgroundFlower
            className="absolute right-[12%] bottom-[25%] w-20 h-20"
            color="var(--cherry)"
            opacity={0.08}
            scale={0.7}
          />

          {/* Brilho superior */}

          <div
            className="absolute -top-40 right-20 w-[700px] h-[700px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(183,67,90,0.13) 0%, rgba(183,67,90,0.04) 35%, transparent 70%)',
            }}
          />

          {/* Brilho inferior */}

          <div
            className="absolute -bottom-40 left-10 w-[700px] h-[550px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(212,176,106,0.13) 0%, transparent 70%)',
            }}
          />

        </div>


        {/* =================================================
            CONTEÚDO HERO
        ================================================== */}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* CONTEÚDO */}

            <div className="max-w-3xl">

              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 animate-fade-in"
                style={{
                  backgroundColor:
                    'rgba(91,13,34,0.07)',
                  border:
                    '1px solid rgba(212,176,106,0.55)',
                }}
              >

                <Shield
                  size={15}
                  style={{
                    color: 'var(--gold-dark)',
                  }}
                />

                <span
                  className="text-xs font-medium tracking-wide"
                  style={{
                    color: 'var(--primary)',
                  }}
                >
                  OAB/UF — Advocacia e Consultoria Jurídica
                </span>

              </div>

              <h1
                className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.08] text-balance animate-fade-in"
                style={{
                  color: 'var(--primary)',
                }}
              >
                {conteudo['hero_titulo'] ||
                  'Defesa jurídica com dedicação e proximidade'}
              </h1>

              <div
                className="mt-6 w-20 h-1 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, var(--gold), var(--cherry-light))',
                }}
              />

              <p
                className="mt-6 text-lg leading-relaxed max-w-2xl animate-fade-in"
                style={{
                  color: 'var(--text-secondary)',
                  animationDelay: '0.1s',
                }}
              >
                {conteudo['hero_subtitulo'] ||
                  'Atuação humanizada e técnica em diversas áreas do Direito.'}
              </p>

              <div
                className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in"
                style={{
                  animationDelay: '0.2s',
                }}
              >

                <a
                  href="#contato"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg font-medium transition-all duration-300 shadow-md"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--cream-light)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--cherry)';
                    e.currentTarget.style.transform =
                      'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--primary)';
                    e.currentTarget.style.transform =
                      'translateY(0)';
                  }}
                >
                  <Calendar size={18} />

                  {conteudo['hero_botao'] ||
                    'Agendar consulta'}
                </a>

                <a
                  href="#areas"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg font-medium transition-all duration-300"
                  style={{
                    color: 'var(--primary)',
                    border:
                      '1px solid var(--primary)',
                    backgroundColor:
                      'rgba(250,246,242,0.78)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--primary)';
                    e.currentTarget.style.color =
                      'var(--cream-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'rgba(250,246,242,0.78)';
                    e.currentTarget.style.color =
                      'var(--primary)';
                  }}
                >
                  Conhecer áreas de atuação

                  <ArrowRight size={18} />

                </a>

              </div>

            </div>


            {/* IMAGEM */}

            <div className="relative hidden lg:block">

              <div
                className="relative rounded-[2rem] overflow-hidden shadow-2xl"
                style={{
                  backgroundColor:
                    'var(--cream-light)',
                  border:
                    '1px solid rgba(212,176,106,0.45)',
                }}
              >

                <img
                  src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Advocacia Patrícia Serejo"
                  className="w-full h-[560px] object-cover"
                  style={{
                    filter:
                      'sepia(8%) saturate(82%) contrast(96%)',
                  }}
                />

                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(91,13,34,0.10), rgba(245,237,227,0.15))',
                  }}
                />

              </div>


              {/* SELO */}

              <div
                className="absolute -bottom-7 -left-7 w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xl"
                style={{
                  backgroundColor: 'var(--primary)',
                  border: '4px solid var(--gold)',
                  color: 'var(--cream-light)',
                }}
              >

                <Scale
                  size={28}
                  style={{
                    color: 'var(--gold)',
                  }}
                />

                <span className="text-[10px] mt-1 uppercase tracking-wider text-center">
                  Justiça
                  <br />
                  & Direito
                </span>

              </div>


              {/* FLOR DA FOTO */}

              <FloralAccent
                className="absolute -top-16 -right-16 w-48 h-48"
                color="var(--cherry)"
                accent="var(--gold)"
                opacity={0.75}
                flip
              />

            </div>

          </div>

        </div>


        {/* DIVISOR */}

        <div
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{
            background:
              'linear-gradient(to top, var(--cream-light), transparent)',
          }}
        />

      </section>


      {/* =====================================================
          ÁREAS DE ATUAÇÃO
      ====================================================== */}

      <section
        id="areas"
        className="py-24 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--cream-light)',
        }}
      >

        {/* FLORES DE FUNDO */}

        <FloralAccent
          className="absolute -left-32 top-[-50px] w-[330px] h-[330px]"
          color="var(--cherry)"
          accent="var(--gold)"
          opacity={0.10}
        />

        <FloralAccent
          className="absolute -right-32 bottom-[-50px] w-[330px] h-[330px]"
          color="var(--cherry-light)"
          accent="var(--gold)"
          opacity={0.08}
          flip
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="text-center max-w-2xl mx-auto mb-16">

            <p
              className="font-medium text-sm tracking-[0.2em] uppercase mb-3"
              style={{
                color: 'var(--cherry)',
              }}
            >
              Nossas especialidades
            </p>

            <h2
              className="font-serif text-3xl sm:text-4xl"
              style={{
                color: 'var(--primary)',
              }}
            >
              Áreas de Atuação
            </h2>

            <div
              className="mt-6 w-16 h-0.5 mx-auto"
              style={{
                backgroundColor: 'var(--gold)',
              }}
            />

          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {areas.map((area, idx) => {

              const Icone =
                (LucideIcons as unknown as Record<
                  string,
                  React.ComponentType<{
                    size?: number;
                    className?: string;
                    strokeWidth?: number;
                    style?: React.CSSProperties;
                  }>
                >)[area.icone] || Scale;

              return (

                <div
                  key={area.id}
                  className="group p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{
                    backgroundColor:
                      'rgba(255,255,255,0.62)',
                    border:
                      '1px solid var(--border)',
                    boxShadow:
                      '0 10px 30px rgba(91,13,34,0.06)',
                    animationDelay:
                      `${idx * 0.05}s`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      'var(--gold)';

                    e.currentTarget.style.boxShadow =
                      '0 18px 45px rgba(91,13,34,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      'var(--border)';

                    e.currentTarget.style.boxShadow =
                      '0 10px 30px rgba(91,13,34,0.06)';
                  }}
                >

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
                    style={{
                      backgroundColor:
                        'rgba(91,13,34,0.07)',
                    }}
                  >

                    <Icone
                      size={24}
                      strokeWidth={1.5}
                      style={{
                        color: 'var(--cherry)',
                      }}
                    />

                  </div>

                  <h3
                    className="font-serif text-xl mb-2"
                    style={{
                      color: 'var(--primary)',
                    }}
                  >
                    {area.titulo}
                  </h3>

                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {area.descricao}
                  </p>

                </div>

              );
            })}

          </div>

        </div>

      </section>


      {/* =====================================================
          SOBRE
      ====================================================== */}

      <section
        id="sobre"
        className="py-24 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--cream)',
        }}
      >

        <FloralAccent
          className="absolute -top-20 -left-20 w-56 h-56"
          color="var(--cherry)"
          accent="var(--gold)"
          opacity={0.25}
        />

        <FloralAccent
          className="absolute -bottom-20 -right-20 w-60 h-60"
          color="var(--cherry-light)"
          accent="var(--gold)"
          opacity={0.12}
          flip
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* FOTO */}

            <div className="relative">

              <div
                className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-xl"
                style={{
                  border:
                    '1px solid rgba(212,176,106,0.45)',
                }}
              >

                <img
                  src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Dra. Patricia Cristiane Serejo"
                  className="w-full h-full object-cover"
                />

              </div>


              <FloralAccent
                className="absolute -top-16 -left-16 w-48 h-48"
                color="var(--cherry-light)"
                accent="var(--gold)"
                opacity={0.32}
              />


              <div
                className="absolute -bottom-6 -right-6 p-6 rounded-2xl shadow-xl max-w-[220px]"
                style={{
                  backgroundColor:
                    'var(--primary)',
                  color:
                    'var(--cream-light)',
                }}
              >

                <Scale
                  size={28}
                  className="mb-2"
                  style={{
                    color: 'var(--gold)',
                  }}
                />

                <p className="font-serif text-lg leading-tight">
                  Atendimento personalizado
                </p>

                <p
                  className="text-xs mt-1"
                  style={{
                    color: 'var(--cream-dark)',
                  }}
                >
                  com ética e transparência
                </p>

              </div>

            </div>


            {/* CONTEÚDO */}

            <div>

              <p
                className="font-medium text-sm tracking-[0.2em] uppercase mb-3"
                style={{
                  color: 'var(--cherry)',
                }}
              >
                Quem somos
              </p>

              <h2
                className="font-serif text-3xl sm:text-4xl mb-6"
                style={{
                  color: 'var(--primary)',
                }}
              >
                {conteudo['sobre_titulo'] ||
                  'Sobre Dra. Patricia Cristiane Serejo'}
              </h2>

              <div
                className="w-16 h-0.5 mb-6"
                style={{
                  backgroundColor: 'var(--gold)',
                }}
              />

              <p
                className="leading-relaxed text-lg"
                style={{
                  color: 'var(--text-secondary)',
                }}
              >
                {conteudo['sobre_texto'] ||
                  'Atuação humanizada e técnica na defesa dos direitos de seus clientes.'}
              </p>


              {/* ESTATÍSTICAS */}

              <div className="mt-8 grid grid-cols-3 gap-4">

                {[
                  {
                    num: '+10',
                    label: 'Anos de experiência',
                  },
                  {
                    num: '+500',
                    label: 'Casos atendidos',
                  },
                  {
                    num: '6',
                    label: 'Áreas do Direito',
                  },
                ].map((stat) => (

                  <div
                    key={stat.label}
                    className="text-center p-4 rounded-xl"
                    style={{
                      backgroundColor:
                        'var(--cream-light)',
                      border:
                        '1px solid var(--border)',
                    }}
                  >

                    <p
                      className="font-serif text-2xl"
                      style={{
                        color: 'var(--cherry)',
                      }}
                    >
                      {stat.num}
                    </p>

                    <p
                      className="text-xs mt-1"
                      style={{
                        color:
                          'var(--text-secondary)',
                      }}
                    >
                      {stat.label}
                    </p>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          DEPOIMENTOS
      ====================================================== */}

      {depoimentos.length > 0 && (

        <section
          id="depoimentos"
          className="py-24 relative overflow-hidden"
          style={{
            backgroundColor:
              'var(--cream-light)',
          }}
        >

          <FloralAccent
            className="absolute -left-28 top-10 w-72 h-72"
            color="var(--cherry)"
            accent="var(--gold)"
            opacity={0.08}
          />

          <FloralAccent
            className="absolute -right-28 bottom-0 w-72 h-72"
            color="var(--cherry-light)"
            accent="var(--gold)"
            opacity={0.08}
            flip
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

            <div className="text-center max-w-2xl mx-auto mb-16">

              <p
                className="font-medium text-sm tracking-[0.2em] uppercase mb-3"
                style={{
                  color: 'var(--cherry)',
                }}
              >
                O que dizem nossos clientes
              </p>

              <h2
                className="font-serif text-3xl sm:text-4xl"
                style={{
                  color: 'var(--primary)',
                }}
              >
                Depoimentos
              </h2>

              <div
                className="mt-6 w-16 h-0.5 mx-auto"
                style={{
                  backgroundColor:
                    'var(--gold)',
                }}
              />

            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {depoimentos.map((d) => (

                <div
                  key={d.id}
                  className="p-8 relative rounded-2xl"
                  style={{
                    backgroundColor:
                      'var(--cream)',
                    border:
                      '1px solid var(--border)',
                    boxShadow:
                      '0 10px 30px rgba(91,13,34,0.06)',
                  }}
                >

                  <Quote
                    size={36}
                    className="absolute top-6 right-6"
                    style={{
                      color:
                        'var(--gold-light)',
                    }}
                  />

                  <p
                    className="leading-relaxed italic"
                    style={{
                      color:
                        'var(--text-secondary)',
                    }}
                  >
                    "{d.texto}"
                  </p>

                  <div className="mt-6 flex items-center gap-3">

                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-serif text-lg"
                      style={{
                        backgroundColor:
                          'var(--primary)',
                        color:
                          'var(--gold)',
                      }}
                    >
                      {d.nome.charAt(0)}
                    </div>

                    <div>

                      <p
                        className="font-medium"
                        style={{
                          color:
                            'var(--primary)',
                        }}
                      >
                        {d.nome}
                      </p>

                      {d.cargo && (
                        <p
                          className="text-xs"
                          style={{
                            color:
                              'var(--text-secondary)',
                          }}
                        >
                          {d.cargo}
                        </p>
                      )}

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </section>

      )}


      {/* =====================================================
          CONTATO
      ====================================================== */}

      <section
        id="contato"
        className="py-24 relative overflow-hidden"
        style={{
          backgroundColor:
            'var(--primary)',
          color:
            'var(--cream-light)',
        }}
      >

        <FloralAccent
          className="absolute -left-28 top-0 w-[380px] h-[380px]"
          color="var(--cherry-light)"
          accent="var(--gold)"
          opacity={0.20}
        />

        <FloralAccent
          className="absolute -right-28 bottom-[-50px] w-[400px] h-[400px]"
          color="var(--gold)"
          accent="var(--cherry-light)"
          opacity={0.16}
          flip
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* INFORMAÇÕES */}

            <div>

              <p
                className="font-medium text-sm tracking-[0.2em] uppercase mb-3"
                style={{
                  color: 'var(--gold)',
                }}
              >
                Fale conosco
              </p>

              <h2
                className="font-serif text-3xl sm:text-4xl mb-6"
                style={{
                  color:
                    'var(--cream-light)',
                }}
              >
                Agende sua consulta
              </h2>

              <div
                className="w-16 h-0.5 mb-8"
                style={{
                  backgroundColor:
                    'var(--gold)',
                }}
              />

              <p
                className="leading-relaxed mb-10 max-w-md"
                style={{
                  color:
                    'var(--cream-dark)',
                }}
              >
                Entre em contato para uma avaliação inicial
                do seu caso. Atendemos com discrição,
                respeito e profissionalismo.
              </p>


              <div className="space-y-5">

                {/* TELEFONE */}

                {conteudo['contato_telefone'] && (

                  <div className="flex items-center gap-4">

                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor:
                          'rgba(255,255,255,0.08)',
                        border:
                          '1px solid rgba(212,176,106,0.25)',
                      }}
                    >
                      <Phone
                        size={18}
                        style={{
                          color:
                            'var(--gold)',
                        }}
                      />
                    </div>

                    <div>

                      <p
                        className="text-xs uppercase tracking-wide"
                        style={{
                          color:
                            'var(--gold-light)',
                        }}
                      >
                        Telefone
                      </p>

                      <p
                        style={{
                          color:
                            'var(--cream-light)',
                        }}
                      >
                        {conteudo['contato_telefone']}
                      </p>

                    </div>

                  </div>

                )}


                {/* EMAIL */}

                {conteudo['contato_email'] && (

                  <div className="flex items-center gap-4">

                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor:
                          'rgba(255,255,255,0.08)',
                        border:
                          '1px solid rgba(212,176,106,0.25)',
                      }}
                    >
                      <Mail
                        size={18}
                        style={{
                          color:
                            'var(--gold)',
                        }}
                      />
                    </div>

                    <div>

                      <p
                        className="text-xs uppercase tracking-wide"
                        style={{
                          color:
                            'var(--gold-light)',
                        }}
                      >
                        E-mail
                      </p>

                      <p
                        style={{
                          color:
                            'var(--cream-light)',
                        }}
                      >
                        {conteudo['contato_email']}
                      </p>

                    </div>

                  </div>

                )}


                {/* ENDEREÇO */}

                {conteudo['contato_endereco'] && (

                  <div className="flex items-center gap-4">

                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor:
                          'rgba(255,255,255,0.08)',
                        border:
                          '1px solid rgba(212,176,106,0.25)',
                      }}
                    >
                      <MapPin
                        size={18}
                        style={{
                          color:
                            'var(--gold)',
                        }}
                      />
                    </div>

                    <div>

                      <p
                        className="text-xs uppercase tracking-wide"
                        style={{
                          color:
                            'var(--gold-light)',
                        }}
                      >
                        Endereço
                      </p>

                      <p
                        style={{
                          color:
                            'var(--cream-light)',
                        }}
                      >
                        {conteudo['contato_endereco']}
                      </p>

                    </div>

                  </div>

                )}


                {/* HORÁRIO */}

                {conteudo['contato_horario'] && (

                  <div className="flex items-center gap-4">

                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor:
                          'rgba(255,255,255,0.08)',
                        border:
                          '1px solid rgba(212,176,106,0.25)',
                      }}
                    >
                      <Clock
                        size={18}
                        style={{
                          color:
                            'var(--gold)',
                        }}
                      />
                    </div>

                    <div>

                      <p
                        className="text-xs uppercase tracking-wide"
                        style={{
                          color:
                            'var(--gold-light)',
                        }}
                      >
                        Horário
                      </p>

                      <p
                        style={{
                          color:
                            'var(--cream-light)',
                        }}
                      >
                        {conteudo['contato_horario']}
                      </p>

                    </div>

                  </div>

                )}

              </div>

            </div>


            {/* PORTAL */}

            <div
              className="rounded-2xl p-8 backdrop-blur-sm"
              style={{
                backgroundColor:
                  'rgba(250,246,242,0.06)',
                border:
                  '1px solid rgba(212,176,106,0.28)',
              }}
            >

              <h3
                className="font-serif text-2xl mb-2"
                style={{
                  color:
                    'var(--cream-light)',
                }}
              >
                Acesso ao sistema
              </h3>

              <p
                className="text-sm mb-6"
                style={{
                  color:
                    'var(--cream-dark)',
                }}
              >
                Já é cliente? Acesse o portal para
                acompanhar seus processos, enviar
                documentos e conversar com o escritório.
              </p>

              <div className="flex flex-col gap-3">

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-medium transition-all duration-300"
                  style={{
                    backgroundColor:
                      'var(--gold)',
                    color:
                      'var(--primary-dark)',
                  }}
                >
                  <UserRound size={18} />
                  Entrar no portal
                </Link>

                <Link
                  to="/cadastro"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-medium transition-all"
                  style={{
                    color:
                      'var(--cream-light)',
                    border:
                      '1px solid rgba(250,246,242,0.35)',
                  }}
                >
                  Criar conta
                  <ChevronRight size={16} />
                </Link>

              </div>

              <div
                className="mt-8 pt-6 flex items-center gap-2 text-xs"
                style={{
                  borderTop:
                    '1px solid rgba(250,246,242,0.12)',
                  color:
                    'var(--cream-dark)',
                }}
              >
                <Lock size={14} />

                Dados protegidos em conformidade
                com a LGPD
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer
        className="relative overflow-hidden py-12"
        style={{
          backgroundColor:
            'var(--primary-dark)',
          color:
            'var(--cream-light)',
        }}
      >

        <FloralAccent
          className="absolute -left-16 bottom-[-40px] hidden md:block w-56 h-56"
          color="var(--cherry-light)"
          accent="var(--gold)"
          opacity={0.20}
        />

        <FloralAccent
          className="absolute -right-16 bottom-[-40px] hidden md:block w-56 h-56"
          color="var(--gold)"
          accent="var(--cherry-light)"
          opacity={0.16}
          flip
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

            {/* LOGO */}

            <div>

              <Logo
                comTexto
                variante="claro"
              />

              <p
                className="mt-4 text-sm max-w-xs"
                style={{
                  color:
                    'var(--cream-dark)',
                }}
              >
                {conteudo['rodape_texto'] ||
                  'Patricia Cristiane Serejo Advocacia'}
              </p>

            </div>


            {/* NAVEGAÇÃO */}

            <div>

              <p
                className="font-medium mb-3"
                style={{
                  color:
                    'var(--gold)',
                }}
              >
                Navegação
              </p>

              <ul className="space-y-2 text-sm">

                <li>
                  <a
                    href="#inicio"
                    style={{
                      color:
                        'var(--cream-dark)',
                    }}
                  >
                    Início
                  </a>
                </li>

                <li>
                  <a
                    href="#areas"
                    style={{
                      color:
                        'var(--cream-dark)',
                    }}
                  >
                    Áreas de Atuação
                  </a>
                </li>

                <li>
                  <a
                    href="#sobre"
                    style={{
                      color:
                        'var(--cream-dark)',
                    }}
                  >
                    Sobre
                  </a>
                </li>

                <li>
                  <a
                    href="#contato"
                    style={{
                      color:
                        'var(--cream-dark)',
                    }}
                  >
                    Contato
                  </a>
                </li>

              </ul>

            </div>


            {/* LEGAL */}

            <div>

              <p
                className="font-medium mb-3"
                style={{
                  color:
                    'var(--gold)',
                }}
              >
                Legal
              </p>

              <ul className="space-y-2 text-sm">

                <li>
                  <Link
                    to="/politica-privacidade"
                    style={{
                      color:
                        'var(--cream-dark)',
                    }}
                  >
                    Política de Privacidade
                  </Link>
                </li>

                <li>
                  <Link
                    to="/termos-uso"
                    style={{
                      color:
                        'var(--cream-dark)',
                    }}
                  >
                    Termos de Uso
                  </Link>
                </li>

                <li>
                  <Link
                    to="/login"
                    style={{
                      color:
                        'var(--cream-dark)',
                    }}
                  >
                    Acesso ao sistema
                  </Link>
                </li>

              </ul>

            </div>

          </div>


          {/* COPYRIGHT */}

          <div
            className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs"
            style={{
              borderColor:
                'rgba(250,246,242,0.12)',
              color:
                'var(--cream-dark)',
            }}
          >

            <p>
              © {new Date().getFullYear()} Patricia
              Cristiane Serejo Advocacia. Todos os
              direitos reservados.
            </p>

            <p>
              Em conformidade com a LGPD
              (Lei nº 13.709/2018)
            </p>

          </div>

        </div>

      </footer>


      {/* WHATSAPP */}

      <WhatsAppFloat />

    </div>
  );
}