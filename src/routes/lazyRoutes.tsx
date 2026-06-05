import { lazy, Suspense, type ReactNode } from 'react';

const loadBoardRoute = () => import('./BoardRoute');
const loadDataDisplayRoute = () => import('./DataDisplayRoute');
const loadUserCenterRoute = () => import('./UserCenterRoute');

export const ActivityAdminRoute = lazy(() =>
  import('./ActivityAdminRoute').then((module) => ({ default: module.ActivityAdminRoute })),
);
export const ArchiveRoute = lazy(() => import('./ArchiveRoute').then((module) => ({ default: module.ArchiveRoute })));
export const AuthRoute = lazy(() => import('./AuthRoute').then((module) => ({ default: module.AuthRoute })));
export const BoardRoute = lazy(() => loadBoardRoute().then((module) => ({ default: module.BoardRoute })));
export const CalendarAdminRoute = lazy(() =>
  import('./CalendarAdminRoute').then((module) => ({ default: module.CalendarAdminRoute })),
);
export const DataDisplayRoute = lazy(() => loadDataDisplayRoute().then((module) => ({ default: module.DataDisplayRoute })));
export const NotFoundRoute = lazy(() =>
  import('./NotFoundRoute').then((module) => ({ default: module.NotFoundRoute })),
);
export const PublicProfileRoute = lazy(() =>
  import('./PublicProfileRoute').then((module) => ({ default: module.PublicProfileRoute })),
);
export const SearchRoute = lazy(() => import('./SearchRoute').then((module) => ({ default: module.SearchRoute })));
export const ThreadComposeRoute = lazy(() =>
  import('./ThreadComposeRoute').then((module) => ({ default: module.ThreadComposeRoute })),
);
export const ThreadEditRoute = lazy(() =>
  import('./ThreadEditRoute').then((module) => ({ default: module.ThreadEditRoute })),
);
export const ThreadRoute = lazy(() => import('./ThreadRoute').then((module) => ({ default: module.ThreadRoute })));
export const UserCenterRoute = lazy(() => loadUserCenterRoute().then((module) => ({ default: module.UserCenterRoute })));

export function preloadSecondaryRoutes() {
  void loadBoardRoute().catch(ignorePreloadError);
  void loadDataDisplayRoute().catch(ignorePreloadError);
  void loadUserCenterRoute().catch(ignorePreloadError);
}

export function LazyRouteBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LazyRouteFallback />}>{children}</Suspense>;
}

export function AuthRouteFallback() {
  return <div className="min-h-screen" />;
}

function LazyRouteFallback() {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-5 shadow-panel dark:border-zinc-800">
      <div className="h-5 w-32 animate-pulse rounded bg-zinc-200/75 dark:bg-white/[0.09]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-200/75 dark:bg-white/[0.09]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-200/75 dark:bg-white/[0.09]" />
        <div className="h-16 w-full animate-pulse rounded bg-zinc-200/75 dark:bg-white/[0.09]" />
      </div>
    </section>
  );
}

function ignorePreloadError() {
  // Route-level lazy boundaries still own visible loading and error behavior.
}
