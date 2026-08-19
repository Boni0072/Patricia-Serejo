import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificacaoProvider } from './context/NotificacaoContext';
import type { Papel } from './types/database';

import SitePublico from './pages/publico/SitePublico';
import LoginPage from './pages/auth/LoginPage';
import CadastroPage from './pages/auth/CadastroPage';
import EsqueciSenhaPage from './pages/auth/EsqueciSenhaPage';
import RedefinirSenhaPage from './pages/auth/RedefinirSenhaPage';
import SetupPage from './pages/auth/SetupPage';
import PoliticaPrivacidadePage from './pages/publico/PoliticaPrivacidadePage';
import TermosUsoPage from './pages/publico/TermosUsoPage';

import PortalLayout from './pages/portal/PortalLayout';
import PortalProcessos from './pages/portal/PortalProcessos';
import PortalProcessoDetalhe from './pages/portal/PortalProcessoDetalhe';
import PortalMensagens from './pages/portal/PortalMensagens';
import PortalAgenda from './pages/portal/PortalAgenda';
import PortalPerfil from './pages/portal/PortalPerfil';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClientes from './pages/admin/AdminClientes';
import AdminClienteDetalhe from './pages/admin/AdminClienteDetalhe';
import AdminAdvogados from './pages/admin/AdminAdvogados';
import AdminProcessos from './pages/admin/AdminProcessos';
import AdminProcessoDetalhe from './pages/admin/AdminProcessoDetalhe';
import AdminMensagens from './pages/admin/AdminMensagens';
import AdminAgenda from './pages/admin/AdminAgenda';
import AdminConteudo from './pages/admin/AdminConteudo';
import AdminLogs from './pages/admin/AdminLogs';
import AdminNotificacoes from './pages/admin/AdminNotificacoes';

import RotaProtegida from './components/RotaProtegida';

function Roteador() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
          <p className="text-ink-500 font-medium">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<SitePublico />} />
      <Route path="/politica-privacidade" element={<PoliticaPrivacidadePage />} />
      <Route path="/termos-uso" element={<TermosUsoPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Portal do cliente */}
      <Route
        path="/portal"
        element={
          <RotaProtegida papeis={['cliente', 'admin']}>
            <PortalLayout />
          </RotaProtegida>
        }
      >
        <Route index element={<Navigate to="processos" replace />} />
        <Route path="processos" element={<PortalProcessos />} />
        <Route path="processos/:id" element={<PortalProcessoDetalhe />} />
        <Route path="mensagens" element={<PortalMensagens />} />
        <Route path="agenda" element={<PortalAgenda />} />
        <Route path="perfil" element={<PortalPerfil />} />
      </Route>

      {/* Painel administrativo */}
      <Route
        path="/admin"
        element={
          <RotaProtegida papeis={['admin', 'advogado']}>
            <AdminLayout />
          </RotaProtegida>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="clientes" element={<AdminClientes />} />
        <Route path="clientes/:id" element={<AdminClienteDetalhe />} />
        <Route path="advogados" element={<RotaProtegida papeis={['admin']}><AdminAdvogados /></RotaProtegida>} />
        <Route path="processos" element={<AdminProcessos />} />
        <Route path="processos/:id" element={<AdminProcessoDetalhe />} />
        <Route path="mensagens" element={<AdminMensagens />} />
        <Route path="agenda" element={<AdminAgenda />} />
        <Route path="notificacoes" element={<AdminNotificacoes />} />
        <Route path="conteudo" element={<RotaProtegida papeis={['admin']}><AdminConteudo /></RotaProtegida>} />
        <Route path="logs" element={<RotaProtegida papeis={['admin']}><AdminLogs /></RotaProtegida>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificacaoProvider>
          <Roteador />
        </NotificacaoProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
