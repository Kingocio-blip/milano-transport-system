// ============================================
// MILANO - Skeleton Loading Screens
// Reutilizable para todas las paginas
// ============================================

import { Skeleton } from './ui/skeleton';

// ----- HEADER + STATS (Dashboard, CRM, Flota, etc.) -----
export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ----- FILTROS -----
export function SkeletonFilters() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Skeleton className="h-10 flex-1" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-16" />
      </div>
    </div>
  );
}

// ----- TABLA -----
export function SkeletonTable({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-3 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton key={`${rowIdx}-${colIdx}`} className={`h-4 ${colIdx === 0 ? 'w-24' : colIdx === cols - 1 ? 'w-16 ml-auto' : 'w-full'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- CARDS -----
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7" />
              <Skeleton className="h-7 w-7" />
              <Skeleton className="h-7 w-7" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ----- DASHBOARD COMPLETO -----
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <SkeletonHeader />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center space-y-2">
            <Skeleton className="h-6 w-8 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <div className="flex justify-center">
            <Skeleton className="h-[150px] w-[150px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- FORMULARIO / WIZARD -----
export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// ----- LOGIN -----
export function SkeletonLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-blue-900">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8 space-y-3">
          <Skeleton className="h-12 w-12 mx-auto rounded-xl" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="rounded-2xl bg-white/10 backdrop-blur-md p-8 space-y-6">
          <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-12 w-full" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-12 w-full" /></div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// ----- PAGINA GENERICA (selecciona vista segun modo) -----
interface SkeletonPageProps {
  type: 'dashboard' | 'table' | 'cards' | 'form' | 'login' | 'mixed';
  tableCols?: number;
  tableRows?: number;
  cardCount?: number;
  formFields?: number;
  vistaMode?: 'lista' | 'cards';
}

export function SkeletonPage({
  type = 'mixed',
  tableCols = 6,
  tableRows = 6,
  cardCount = 6,
  formFields = 6,
  vistaMode = 'lista',
}: SkeletonPageProps) {
  if (type === 'dashboard') return <SkeletonDashboard />;
  if (type === 'login') return <SkeletonLogin />;
  if (type === 'form') return <SkeletonForm fields={formFields} />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <SkeletonHeader />
      <SkeletonStats />
      <SkeletonFilters />
      {type === 'table' || (type === 'mixed' && vistaMode === 'lista') ? (
        <SkeletonTable rows={tableRows} cols={tableCols} />
      ) : (
        <SkeletonCards count={cardCount} />
      )}
    </div>
  );
}
