import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import logo1 from '../../assets/logo/logo1.webp';
import logo2 from '../../assets/logo/logo2.webp';
import logo1Dark from '../../assets/logo/logo1-dark.webp';
import logo2Dark from '../../assets/logo/logo2-dark.webp';
import { useCachedImages } from '../../hooks/useCachedImages';

export function TopBarLogo({ onClick }: { onClick: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const cachedLogoImages = useCachedImages({
    namespace: 'logo',
    sources: [logo1, logo2, logo1Dark, logo2Dark],
  });

  return (
    <Link
      to="/"
      aria-label="返回首页"
      onClick={onClick}
      className="flex h-[var(--capubbs-topbar-button-size)] min-w-[var(--capubbs-topbar-logo-min)] shrink-0 items-center gap-0.5 rounded-sm outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#385772]"
    >
      <span className="sr-only">CAPUBBS</span>
      <img src={cachedLogoImages[logo1] ?? logo1} alt="" className="h-[var(--capubbs-topbar-logo-height)] w-auto dark:hidden" />
      <img
        src={cachedLogoImages[logo2] ?? logo2}
        alt=""
        className="h-[var(--capubbs-topbar-logo-height)] w-[var(--capubbs-topbar-logo2-width)] shrink-0 object-cover object-center dark:hidden"
      />
      <img src={cachedLogoImages[logo1Dark] ?? logo1Dark} alt="" className="hidden h-[var(--capubbs-topbar-logo-height)] w-auto dark:block" />
      <img
        src={cachedLogoImages[logo2Dark] ?? logo2Dark}
        alt=""
        className="hidden h-[var(--capubbs-topbar-logo-height)] w-[var(--capubbs-topbar-logo2-width)] shrink-0 object-cover object-center dark:block"
      />
    </Link>
  );
}
