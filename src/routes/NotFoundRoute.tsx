import { Compass, Home, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function NotFoundRoute() {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  return (
    <section className="card-surface overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
      <div className="border-b border-zinc-200 bg-white/45 px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#385772] text-white shadow-sm dark:bg-emerald-200 dark:text-zinc-950">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">404</p>
            <h1 className="text-xl font-bold text-[#385772] dark:text-white">没有找到这个页面</h1>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          当前地址没有对应的新版论坛页面，可能是链接已经过期，或页面还没有接入新版路由。
        </p>

        <div className="rounded-lg border border-dashed border-zinc-300 bg-white/35 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-zinc-400">
          <span className="break-all">{currentPath}</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            返回首页
          </Link>
          <Link
            to="/search"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white/55 px-4 text-sm font-bold text-[#385772] transition hover:border-[#385772]/45 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-white/[0.06] dark:text-emerald-100 dark:hover:border-emerald-200/45 dark:hover:bg-white/[0.1] dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            去搜索
          </Link>
        </div>
      </div>
    </section>
  );
}
