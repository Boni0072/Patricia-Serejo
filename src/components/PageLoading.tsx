import { useLocation } from 'react-router-dom';
import { KpiCardSkeleton } from './KpiCard';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

function HeaderSkeleton() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3.5 w-80" />
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>
    </header>
  );
}

function FiltersSkeleton() {
  return (
    <div className="card-base p-3 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function KpiGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mb-5">
      {Array.from({ length: count }).map((_, i) => <KpiCardSkeleton key={i} />)}
    </div>
  );
}

function ChartBlock({ height = 340, className = '' }: { height?: number; className?: string }) {
  return <div className={`w-full rounded-xl bg-content-muted/10 ${className}`} style={{ height }} />;
}

function TableCardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border-subtle">
        <div className="flex gap-4 px-4 py-2.5 border-b border-border-subtle">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-2.5 border-b border-border-subtle/40">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ListCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} padding="md">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-1 mb-4 border-b border-border-subtle">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <Card padding="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ImportAreaSkeleton() {
  return (
    <Card padding="lg">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl border-2 border-dashed" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </Card>
  );
}

type LayoutKind =
  | 'dashboard'
  | 'table'
  | 'alerts'
  | 'settings'
  | 'analytics'
  | 'dual-analytics'
  | 'import';

const ROUTE_LAYOUTS: Record<string, { kind: LayoutKind; kpis?: number }> = {
  '/': { kind: 'dashboard', kpis: 10 },
  '/lancamentos': { kind: 'table' },
  '/alertas': { kind: 'alerts' },
  '/configuracoes': { kind: 'settings' },
  '/financeiro': { kind: 'analytics', kpis: 4 },
  '/fluxo-caixa': { kind: 'analytics', kpis: 4 },
  '/resultado': { kind: 'dual-analytics', kpis: 4 },
  '/budget': { kind: 'analytics', kpis: 4 },
  '/capex': { kind: 'dual-analytics', kpis: 4 },
  '/opex': { kind: 'dual-analytics', kpis: 4 },
  '/controladoria': { kind: 'dual-analytics', kpis: 4 },
  '/compras': { kind: 'dual-analytics', kpis: 4 },
  '/estoque': { kind: 'dual-analytics', kpis: 4 },
  '/projetos': { kind: 'dual-analytics', kpis: 4 },
  '/imobilizado': { kind: 'dual-analytics', kpis: 4 },
  '/indicadores': { kind: 'analytics', kpis: 4 },
  '/fontes': { kind: 'import' },
};

export function PageLoading() {
  const { pathname } = useLocation();
  const config = ROUTE_LAYOUTS[pathname] ?? { kind: 'analytics' as LayoutKind, kpis: 4 };
  const { kind, kpis = 4 } = config;

  return (
    <div className="pb-20 md:pb-6 animate-pulse-fast">
      <HeaderSkeleton />

      {kind === 'dashboard' && (
        <>
          <FiltersSkeleton />
          <KpiGrid count={kpis!} />
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
            <div className="lg:col-span-2 w-full rounded-xl bg-content-muted/10" style={{ height: 340 }} />
            <div className="w-full rounded-xl bg-content-muted/10" style={{ height: 340 }} />
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="w-full rounded-xl bg-content-muted/10" style={{ height: 340 }} />)}
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="w-full rounded-xl bg-content-muted/10" style={{ height: 300 }} />)}
          </section>
        </>
      )}

      {kind === 'table' && (
        <>
          <FiltersSkeleton />
          <Card padding="md">
            <Skeleton className="h-96 w-full rounded-lg" />
          </Card>
        </>
      )}

      {kind === 'alerts' && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="md" className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-44 rounded-lg" />
          </div>
          <ListCardSkeleton rows={5} />
        </>
      )}

      {kind === 'settings' && <TabsSkeleton />}

      {kind === 'analytics' && (
        <>
          <FiltersSkeleton />
          <KpiGrid count={kpis!} />
          <section className="grid grid-cols-1 gap-3 mb-5">
            <ChartBlock height={340} />
          </section>
          <TableCardSkeleton />
        </>
      )}

      {kind === 'dual-analytics' && (
        <>
          <FiltersSkeleton />
          <KpiGrid count={kpis!} />
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
            <div className="lg:col-span-2 w-full rounded-xl bg-content-muted/10" style={{ height: 340 }} />
            <div className="w-full rounded-xl bg-content-muted/10" style={{ height: 340 }} />
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <TableCardSkeleton rows={5} />
            <ChartBlock height={300} />
          </section>
        </>
      )}

      {kind === 'import' && <ImportAreaSkeleton />}
    </div>
  );
}
