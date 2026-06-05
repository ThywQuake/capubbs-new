import { useEffect, useState } from 'react';

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const paginationButtonClass =
  'h-9 rounded-md border border-white/25 bg-white/[0.38] px-3 font-semibold text-zinc-700 shadow-sm backdrop-blur-[2px] transition hover:border-white/45 hover:bg-white/[0.56] hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.12] dark:text-white/[0.86] dark:hover:border-white/[0.28] dark:hover:bg-white/[0.18] dark:hover:text-white';

export function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationControlsProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));
  const showEdgeButtons = totalPages > 2;

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const goToPage = (page: number) => {
    const nextPage = Math.min(totalPages, Math.max(1, page));
    onPageChange(nextPage);
    setPageInput(String(nextPage));
  };

  const commitPageInput = () => {
    const parsedPage = Number(pageInput.trim());

    if (!Number.isFinite(parsedPage)) {
      setPageInput(String(currentPage));
      return;
    }

    goToPage(Math.trunc(parsedPage));
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-sm sm:justify-between">
      {showEdgeButtons && (
        <button type="button" disabled={currentPage <= 1} onClick={() => goToPage(1)} className={paginationButtonClass}>
          第一页
        </button>
      )}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        className={paginationButtonClass}
      >
        上一页
      </button>
      <span className="inline-flex h-9 items-center gap-1 rounded-md border border-white/25 bg-white/[0.24] px-2 text-xs font-semibold text-zinc-500 shadow-sm backdrop-blur-[2px] dark:border-white/15 dark:bg-white/[0.08] dark:text-zinc-400">
        第
        <input
          aria-label="当前页"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pageInput}
          onBlur={commitPageInput}
          onChange={(event) => setPageInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitPageInput();
              event.currentTarget.blur();
            }
          }}
          className="h-7 w-12 rounded border border-zinc-200 bg-white/70 px-2 text-center text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
        />
        / {totalPages} 页
      </span>
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
        className={paginationButtonClass}
      >
        下一页
      </button>
      {showEdgeButtons && (
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(totalPages)}
          className={paginationButtonClass}
        >
          最后一页
        </button>
      )}
    </div>
  );
}
