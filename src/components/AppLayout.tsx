import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PageLoading } from './PageLoading';
import { useAuth } from '../hooks/useAuth';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-page">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        user={user}
        onSignOut={signOut}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1920px] w-full mx-auto">
          <motion.div
            key="route"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
