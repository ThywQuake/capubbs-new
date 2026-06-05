import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OWN_PUBLIC_PROFILE_ID } from '../../data/publicProfiles';
import { getPublicProfilePath } from '../../utils/userRoutes';

export function PublicProfileLink({ userId = OWN_PUBLIC_PROFILE_ID }: { userId?: string }) {
  return (
    <Link
      to={getPublicProfilePath(userId)}
      className="card-surface group flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 text-sm font-semibold text-[#385772] shadow-panel transition hover:bg-zinc-100/80 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-zinc-800 dark:text-white dark:hover:bg-white/[0.06]"
    >
      <span>前往公开主页</span>
      <ChevronRight size={16} className="text-emerald-700/80 transition group-hover:translate-x-0.5 dark:text-emerald-100/80" />
    </Link>
  );
}
