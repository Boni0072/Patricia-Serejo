import { useEffect } from 'react';
import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Wallet, ShieldCheck, Hammer, Boxes, Banknote, TrendingUp, Target,
  ShoppingCart, Package, FolderKanban, Building2, Gauge, Database,
} from 'lucide-react';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { AuthScreen } from './pages/AuthScreen';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AlertasPage = lazy(() => import('./pages/AlertasPage').then((m) => ({ default: m.AlertasPage })));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage').then((m) => ({ default: m.ConfiguracoesPage })));
const LancamentosPage = lazy(() => import('./pages/LancamentosPage').then((m) => ({ default: m.LancamentosPage })));
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage').then((m) => ({ default: m.FinanceiroPage })));
const FluxoCaixaPage = lazy(() => import('./pages/FluxoCaixaPage').then((m) => ({ default: m.FluxoCaixaPage })));
const ResultadoPage = lazy(() => import('./pages/ResultadoPage').then((m) => ({ default: m.ResultadoPage })));
const EbitdaPage = lazy(() => import('./pages/EbitdaPage').then((m) => ({ default: m.EbitdaPage })));
const BudgetPage = lazy(() => import('./pages/BudgetPage').then((m) => ({ default: m.BudgetPage })));
const CapexPage = lazy(() => import('./pages/CapexPage').then((m) => ({ default: m.CapexPage })));
const OpexPage = lazy(() => import('./pages/OpexPage').then((m) => ({ default: m.OpexPage })));
const ControladoriaPage = lazy(() => import('./pages/ControladoriaPage').then((m) => ({ default: m.ControladoriaPage })));
const ComprasPage = lazy(() => import('./pages/ComprasPage').then((m) => ({ default: m.ComprasPage })));
const EstoquePage = lazy(() => import('./pages/EstoquePage').then((m) => ({ default: m.EstoquePage })));
const ProjetosPage = lazy(() => import('./pages/ProjetosPage').then((m) => ({ default: m.ProjetosPage })));
const ImobilizadoPage = lazy(() => import('./pages/ImobilizadoPage').then((m) => ({ default: m.ImobilizadoPage })));
const IndicadoresPage = lazy(() => import('./pages/IndicadoresPage').then((m) => ({ default: m.IndicadoresPage })));
const FontesPage = lazy(() => import('./pages/FontesPage').then((m) => ({ default: m.FontesPage })));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage').then((m) => ({ default: m.UsuariosPage })));
const ComingSoon = lazy(() => import('./pages/ComingSoon').then((m) => ({ default: m.ComingSoon })));
import { useFiltersStore, queryToFilters, filtersToQuery } from './store/filters';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function FilterUrlSync() {
  const filters = useFiltersStore();
  const [sp, setSp] = useSearchParams();
  const location = useLocation();

  // Carrega filtros da URL na primeira renderização
  useEffect(() => {
    const fromUrl = queryToFilters(sp);
    if (Object.keys(fromUrl).length > 0) filters.set(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza mudanças do store para a URL
  useEffect(() => {
    const next = filtersToQuery(filters);
    const current = sp.toString();
    if (next.toString() !== current) {
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.empresa, filters.loja, filters.centroCusto, filters.projeto, filters.fornecedor, filters.categoria, filters.ano, filters.mes, filters.status]);

  void location;
  return null;
}

const COMING_SOON_MODULES: { path: string; modulo: string; descricao: string; icon: typeof Wallet; features: string[] }[] = [];


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FilterUrlSync />
        <Routes>
          <Route path="/login" element={<AuthScreen />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/lancamentos" element={<LancamentosPage />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/fluxo-caixa" element={<FluxoCaixaPage />} />
            <Route path="/resultado" element={<ResultadoPage />} />
            <Route path="/ebitda" element={<EbitdaPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/capex" element={<CapexPage />} />
            <Route path="/opex" element={<OpexPage />} />
            <Route path="/controladoria" element={<ControladoriaPage />} />
            <Route path="/compras" element={<ComprasPage />} />
            <Route path="/estoque" element={<EstoquePage />} />
            <Route path="/projetos" element={<ProjetosPage />} />
            <Route path="/imobilizado" element={<ImobilizadoPage />} />
            <Route path="/indicadores" element={<IndicadoresPage />} />
            <Route path="/fontes" element={<FontesPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            {COMING_SOON_MODULES.map((m) => (
              <Route key={m.path} path={`/${m.path}`} element={<ComingSoon modulo={m.modulo} descricao={m.descricao} icon={m.icon} features={m.features} />} />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
