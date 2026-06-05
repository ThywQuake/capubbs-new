import {
  FileText,
  Flame,
  Pin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLegacyBbsSearch } from '../api/LegacyBbsDataContext';
import { PaginationControls } from '../components/user/PaginationControls';
import { searchBoardOptions } from '../data/search';
import type { SearchResult } from '../types/search';
import { formatPostTimestamp } from '../utils/formatPostTimestamp';

type SearchRouteProps = {
  topBarCollapsed: boolean;
};

type SearchFieldMode = 'title' | 'body';
type SearchRangeMode = 'all' | 'board';
type SearchTimeRange = 'year' | 'twoYears' | 'all';
type SearchOptionsSnapshot = {
  keyword: string;
  searchField: SearchFieldMode;
  rangeMode: SearchRangeMode;
  selectedBoard: string;
  startDate: string;
  endDate: string;
  timeRange: SearchTimeRange;
};
type AppliedSearchOptions = SearchOptionsSnapshot & {
  requestKey: number;
};

const SEARCH_PAGE_SIZE = 12;
const RECENT_SEARCH_STORAGE_KEY = 'capubbs-search-history:v1:self';

const searchTimeOptions: Array<{ key: SearchTimeRange; label: string }> = [
  { key: 'year', label: '1年内' },
  { key: 'twoYears', label: '2年内' },
  { key: 'all', label: '不限' },
];
const defaultSearchBoard = searchBoardOptions[0] ?? '';

export function SearchRoute({ topBarCollapsed }: SearchRouteProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q')?.trim() ?? '';
  const searchParamsKey = searchParams.toString();
  const [keywordDraft, setKeywordDraft] = useState(queryFromUrl);
  const [searchField, setSearchField] = useState<SearchFieldMode>(() => getSearchFieldFromParams(searchParams));
  const [rangeMode, setRangeMode] = useState<SearchRangeMode>(() => getSearchRangeFromParams(searchParams));
  const [selectedBoard, setSelectedBoard] = useState(() => getSearchBoardFromParams(searchParams));
  const [startDate, setStartDate] = useState(() => normalizeSearchDate(searchParams.get('start')));
  const [endDate, setEndDate] = useState(() => normalizeSearchDate(searchParams.get('end')));
  const [timeRange, setTimeRange] = useState<SearchTimeRange>(() => getSearchTimeRangeFromParams(searchParams));
  const [appliedSearch, setAppliedSearch] = useState<AppliedSearchOptions>(() => ({
    ...getSearchOptionsFromParams(searchParams, queryFromUrl),
    requestKey: 0,
  }));
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [currentPage, setCurrentPage] = useState(1);
  const hasKeyword = appliedSearch.keyword.trim().length > 0;
  const searchState = useLegacyBbsSearch(hasKeyword, {
    boardName: appliedSearch.rangeMode === 'board' ? appliedSearch.selectedBoard : null,
    endDate: appliedSearch.endDate,
    keyword: appliedSearch.keyword,
    requestKey: appliedSearch.requestKey,
    searchField: appliedSearch.searchField,
    startDate: appliedSearch.startDate,
    timeRange: appliedSearch.timeRange,
  });
  const allResults = searchState.data;
  const isSearching = hasKeyword && (searchState.status === 'loading' || searchState.isResolvingBoard);
  const searchError = hasKeyword && searchState.status === 'error' ? searchState.error : null;
  const referenceTimestamp = useMemo(() => Date.now(), [
    appliedSearch.keyword,
    appliedSearch.requestKey,
    appliedSearch.timeRange,
  ]);
  const filteredResults = useMemo(
    () =>
      hasKeyword
        ? sortSearchResults(
            filterSearchResults(allResults, {
              keyword: appliedSearch.keyword,
              rangeMode: appliedSearch.rangeMode,
              referenceTimestamp,
              searchField: appliedSearch.searchField,
              selectedBoard: appliedSearch.selectedBoard,
              endDate: appliedSearch.endDate,
              startDate: appliedSearch.startDate,
              timeRange: appliedSearch.timeRange,
            }),
          )
        : [],
    [
      allResults,
      appliedSearch,
      hasKeyword,
      referenceTimestamp,
    ],
  );
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / SEARCH_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedResults = filteredResults.slice(
    (safeCurrentPage - 1) * SEARCH_PAGE_SIZE,
    safeCurrentPage * SEARCH_PAGE_SIZE,
  );

  useEffect(() => {
    const nextOptions = getSearchOptionsFromParams(searchParams, queryFromUrl);

    setKeywordDraft(nextOptions.keyword);
    setSearchField(nextOptions.searchField);
    setRangeMode(nextOptions.rangeMode);
    setSelectedBoard(nextOptions.selectedBoard);
    setStartDate(nextOptions.startDate);
    setEndDate(nextOptions.endDate);
    setTimeRange(nextOptions.timeRange);
    setAppliedSearch((currentOptions) => ({
      ...nextOptions,
      requestKey: currentOptions.requestKey,
    }));
    setCurrentPage(1);
  }, [queryFromUrl, searchParams, searchParamsKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedSearch]);

  const submitKeyword = (keyword: string) => {
    const normalizedKeyword = keyword.trim();
    const nextOptions: SearchOptionsSnapshot = {
      keyword: normalizedKeyword,
      searchField,
      rangeMode,
      selectedBoard,
      startDate,
      endDate,
      timeRange,
    };

    setKeywordDraft(normalizedKeyword);
    setAppliedSearch((currentOptions) => ({
      ...nextOptions,
      requestKey: currentOptions.requestKey + 1,
    }));
    setCurrentPage(1);
    updateSearchQueryParams(setSearchParams, nextOptions);

    if (normalizedKeyword) {
      const nextRecentSearches = storeRecentSearch(normalizedKeyword);
      setRecentSearches(nextRecentSearches);
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitKeyword(keywordDraft);
  };

  return (
    <div className="space-y-4">
      <section className="card-surface overflow-hidden rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#875A41] dark:text-white/60">Search</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-[#385772] dark:text-white sm:text-3xl">搜索结果</h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-bold text-emerald-900 dark:border-emerald-200/15 dark:bg-emerald-300/[0.08] dark:text-emerald-100">
            <Sparkles size={15} />
            <span>{isSearching ? '检索中' : searchError ? '检索失败' : hasKeyword ? `找到 ${filteredResults.length} 条` : '输入关键词开始检索'}</span>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" size={17} />
            <span className="sr-only">搜索关键词</span>
            <input
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
              placeholder="搜索帖子标题 / 正文"
              className="h-11 w-full rounded-md border border-zinc-200 bg-white/80 pl-10 pr-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
          >
            <Search size={16} />
            搜索
          </button>
        </form>
      </section>

      <div className="lg:hidden">
        <SearchFilterPanel
          endDate={endDate}
          rangeMode={rangeMode}
          recentSearches={recentSearches}
          searchField={searchField}
          selectedBoard={selectedBoard}
          startDate={startDate}
          timeRange={timeRange}
          onChangeEndDate={setEndDate}
          onChangeRangeMode={setRangeMode}
          onChangeSearchField={setSearchField}
          onChangeSelectedBoard={setSelectedBoard}
          onChangeStartDate={setStartDate}
          onChangeTimeRange={setTimeRange}
          onSelectQuickTerm={submitKeyword}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 space-y-4">
          <div className="card-surface rounded-lg border border-zinc-200 p-2 shadow-panel dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1">
              <div className="flex items-center gap-2 text-sm font-bold text-[#385772] dark:text-white">
                <FileText size={16} />
                <span>主题结果</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span>{appliedSearch.searchField === 'title' ? '搜索帖子标题' : '搜索帖子正文'}</span>
                <span>{searchTimeOptions.find((option) => option.key === appliedSearch.timeRange)?.label}</span>
                <span>{isSearching ? '检索中' : searchError ? '请求失败' : hasKeyword ? `${filteredResults.length} 条` : '等待关键词'}</span>
              </div>
            </div>
          </div>

          {hasKeyword && searchError ? (
            <SearchErrorPanel error={searchError} />
          ) : hasKeyword && isSearching ? (
            <SearchLoadingPanel />
          ) : hasKeyword ? (
            <div className="space-y-2">
              {pagedResults.map((result) => (
                <SearchResultCard key={result.id} keyword={appliedSearch.keyword} result={result} />
              ))}
              {pagedResults.length === 0 ? <EmptySearchResult keyword={appliedSearch.keyword} /> : null}
            </div>
          ) : (
            <SearchStartPanel recentSearches={recentSearches} onSelectQuickTerm={submitKeyword} />
          )}

          {hasKeyword && !isSearching && !searchError && totalPages > 1 ? (
            <PaginationControls currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          ) : null}
        </section>

        <aside
          className="z-10 hidden self-start transition-[top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:block"
          style={{
            top: topBarCollapsed
              ? 'var(--capubbs-topbar-collapsed-sticky-offset)'
              : 'var(--capubbs-topbar-sticky-offset)',
          }}
        >
          <SearchFilterPanel
            endDate={endDate}
            rangeMode={rangeMode}
            recentSearches={recentSearches}
            searchField={searchField}
            selectedBoard={selectedBoard}
            startDate={startDate}
            timeRange={timeRange}
            onChangeEndDate={setEndDate}
            onChangeRangeMode={setRangeMode}
            onChangeSearchField={setSearchField}
            onChangeSelectedBoard={setSelectedBoard}
            onChangeStartDate={setStartDate}
            onChangeTimeRange={setTimeRange}
            onSelectQuickTerm={submitKeyword}
          />
        </aside>
      </div>
    </div>
  );
}

function SearchFilterPanel({
  endDate,
  rangeMode,
  recentSearches,
  searchField,
  selectedBoard,
  startDate,
  timeRange,
  onChangeEndDate,
  onChangeRangeMode,
  onChangeSearchField,
  onChangeSelectedBoard,
  onChangeStartDate,
  onChangeTimeRange,
  onSelectQuickTerm,
}: {
  endDate: string;
  rangeMode: SearchRangeMode;
  recentSearches: string[];
  searchField: SearchFieldMode;
  selectedBoard: string;
  startDate: string;
  timeRange: SearchTimeRange;
  onChangeEndDate: (value: string) => void;
  onChangeRangeMode: (mode: SearchRangeMode) => void;
  onChangeSearchField: (field: SearchFieldMode) => void;
  onChangeSelectedBoard: (board: string) => void;
  onChangeStartDate: (value: string) => void;
  onChangeTimeRange: (range: SearchTimeRange) => void;
  onSelectQuickTerm: (term: string) => void;
}) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-4 shadow-panel dark:border-zinc-800">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[#385772] dark:text-white">
        <SlidersHorizontal size={16} />
        搜索筛选
      </h2>

      <div className="mt-4 space-y-5">
        <FilterGroup title="搜索位置">
          <RadioOption checked={searchField === 'title'} label="帖子标题" onChange={() => onChangeSearchField('title')} />
          <RadioOption checked={searchField === 'body'} label="帖子正文" onChange={() => onChangeSearchField('body')} />
        </FilterGroup>

        <FilterGroup title="搜索范围">
          <RadioOption checked={rangeMode === 'all'} label="全站" onChange={() => onChangeRangeMode('all')} />
          <RadioOption checked={rangeMode === 'board'} label="版面内" onChange={() => onChangeRangeMode('board')} />
          {rangeMode === 'board' ? (
            <select
              value={selectedBoard}
              onChange={(event) => onChangeSelectedBoard(event.target.value)}
              className="h-9 min-w-0 flex-[1_0_100%] rounded-md border border-zinc-200 bg-white/80 px-2 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            >
              {searchBoardOptions.map((board) => (
                <option key={board} value={board}>
                  {board}
                </option>
              ))}
            </select>
          ) : null}
        </FilterGroup>

        <FilterGroup title="时间">
          {searchTimeOptions.map((option) => (
            <RadioOption
              key={option.key}
              checked={timeRange === option.key}
              label={option.label}
              onChange={() => onChangeTimeRange(option.key)}
            />
          ))}
          <div className="grid min-w-0 flex-[1_0_100%] grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="min-w-0 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              起始
              <input
                type="date"
                value={startDate}
                onChange={(event) => onChangeStartDate(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white/80 px-2 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
            </label>
            <label className="min-w-0 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              终止
              <input
                type="date"
                value={endDate}
                onChange={(event) => onChangeEndDate(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white/80 px-2 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
            </label>
          </div>
        </FilterGroup>

        <RecentSearches title="历史搜索" recentSearches={recentSearches} onSelectQuickTerm={onSelectQuickTerm} />
      </div>
    </section>
  );
}

function SearchResultCard({ keyword, result }: { keyword: string; result: SearchResult }) {
  return (
    <Link
      to={result.href}
      className="card-surface group block rounded-lg border border-zinc-200 p-4 shadow-panel transition hover:-translate-y-0.5 hover:border-[#385772]/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-zinc-800 dark:hover:border-emerald-200/35"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white">
          <FileText size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100">
              {result.matchType === 'post' ? '楼层' : '主题'}
            </span>
            {result.kind ? <KindBadge kind={result.kind} /> : null}
            {result.pinned ? <StateBadge icon={<Pin size={12} />} label="置顶" /> : null}
            {result.digest ? <StateBadge icon={<Sparkles size={12} />} label="精华" /> : null}
          </div>
          <h2 className="capubbs-title-wrap mt-2 text-lg font-bold leading-[var(--capubbs-thread-card-title-line-height)] text-[#385772] transition group-hover:text-[#28465f] dark:text-white dark:group-hover:text-emerald-100">
            <HighlightedText keyword={keyword} text={result.title} />
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#875A41] dark:text-white/70">
            {result.meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
            {result.time ? <span>{formatPostTimestamp(result.time)}</span> : null}
          </div>
          {result.hasStats ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              <span>回复 {result.replies}</span>
              <span>浏览 {result.views}</span>
              <span>收藏 {result.bookmarks}</span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function FilterGroup({
  children,
  layout = 'inline',
  title,
}: {
  children: ReactNode;
  layout?: 'block' | 'inline';
  title: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold text-[#875A41] dark:text-white/65">{title}</legend>
      <div className={layout === 'inline' ? 'flex flex-wrap items-center gap-x-3 gap-y-2' : 'space-y-2'}>
        {children}
      </div>
    </fieldset>
  );
}

function RadioOption({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-zinc-300 text-[#385772] focus:ring-[#385772] dark:border-white/20 dark:bg-zinc-900"
      />
      <span>{label}</span>
    </label>
  );
}

function RecentSearches({
  onSelectQuickTerm,
  recentSearches,
  title,
}: {
  onSelectQuickTerm: (term: string) => void;
  recentSearches: string[];
  title: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold text-[#875A41] dark:text-white/65">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {recentSearches.length > 0 ? recentSearches.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelectQuickTerm(term)}
            className="rounded-md border border-zinc-200 bg-white/70 px-2.5 py-1 text-xs font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
          >
            {term}
          </button>
        )) : (
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">暂无历史搜索</span>
        )}
      </div>
    </div>
  );
}

function SearchStartPanel({
  onSelectQuickTerm,
  recentSearches,
}: {
  onSelectQuickTerm: (term: string) => void;
  recentSearches: string[];
}) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-5 shadow-panel dark:border-zinc-800">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-100">
          <Flame size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#385772] dark:text-white">历史搜索</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">可以从最近搜索继续。</p>
          <div className="mt-4">
            <RecentSearches title="历史搜索" recentSearches={recentSearches} onSelectQuickTerm={onSelectQuickTerm} />
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptySearchResult({ keyword }: { keyword: string }) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-5 text-sm font-semibold text-zinc-500 shadow-panel dark:border-zinc-800 dark:text-zinc-400">
      没有找到与“{keyword}”匹配的结果。
    </section>
  );
}

function SearchLoadingPanel() {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-5 shadow-panel dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#385772]/25 border-t-[#385772] dark:border-white/20 dark:border-t-emerald-200" />
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">正在检索服务器数据...</span>
      </div>
    </section>
  );
}

function SearchErrorPanel({ error }: { error: string }) {
  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-panel dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100">
      {error}
    </section>
  );
}

function HighlightedText({ keyword, text }: { keyword: string; text: string }) {
  const terms = getHighlightTerms(keyword);

  if (terms.length === 0) {
    return <>{text}</>;
  }

  const highlightPattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');

  return (
    <>
      {text.split(highlightPattern).map((part, index) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
          <mark key={`${part}-${index}`} className="rounded bg-yellow-200/85 px-0.5 text-zinc-950 dark:bg-yellow-300/80">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function StateBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-300/10 dark:text-amber-100">
      {icon}
      {label}
    </span>
  );
}

function KindBadge({ kind }: { kind: NonNullable<SearchResult['kind']> }) {
  if (kind === 'activity') {
    return <StateBadge icon={<Users size={12} />} label="活动" />;
  }

  if (kind === 'digest') {
    return <StateBadge icon={<Sparkles size={12} />} label="精华" />;
  }

  return null;
}

function filterSearchResults(
  results: SearchResult[],
  options: {
    keyword: string;
    rangeMode: SearchRangeMode;
    referenceTimestamp: number;
    searchField: SearchFieldMode;
    selectedBoard: string;
    endDate: string;
    startDate: string;
    timeRange: SearchTimeRange;
  },
) {
  const terms = getSearchTerms(options.keyword);
  const cutoff = getTimeCutoff(options.timeRange, options.referenceTimestamp);
  const startTime = getSearchDateBoundary(options.startDate, 'start');
  const endTime = getSearchDateBoundary(options.endDate, 'end');
  const normalizedBoard = normalizeSearchText(options.selectedBoard);

  return results.filter((result) => {
    if (!matchesSearchTerms(result, terms, options.searchField)) {
      return false;
    }

    if (options.rangeMode === 'board' && normalizeSearchText(result.board) !== normalizedBoard) {
      return false;
    }

    if (cutoff !== null) {
      const resultTime = result.sortTime ? Date.parse(result.sortTime) : Number.NaN;

      if (!Number.isFinite(resultTime) || resultTime < cutoff) {
        return false;
      }
    }

    if (startTime !== null || endTime !== null) {
      const resultTime = result.sortTime ? Date.parse(result.sortTime) : Number.NaN;

      if (!Number.isFinite(resultTime)) {
        return false;
      }

      if (startTime !== null && resultTime < startTime) {
        return false;
      }

      if (endTime !== null && resultTime > endTime) {
        return false;
      }
    }

    return true;
  });
}

function sortSearchResults(results: SearchResult[]) {
  return [...results].sort((left, right) => getComparableTime(right) - getComparableTime(left));
}

function matchesSearchTerms(result: SearchResult, terms: string[], searchField: SearchFieldMode) {
  const haystack = normalizeSearchText(searchField === 'title' ? result.titleSearchText : result.bodySearchText);

  return terms.every((term) => haystack.includes(term));
}

function getSearchTerms(keyword: string) {
  return keyword
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function getHighlightTerms(keyword: string) {
  const exactKeyword = keyword.trim();
  const terms = [exactKeyword, ...getSearchTerms(keyword)]
    .map((term) => term.trim())
    .filter(Boolean);

  return [...new Set(terms)].sort((left, right) => right.length - left.length);
}

function getTimeCutoff(timeRange: SearchTimeRange, referenceTimestamp: number) {
  if (timeRange === 'all') {
    return null;
  }

  const days = timeRange === 'year' ? 365 : 730;

  return referenceTimestamp - days * 24 * 60 * 60 * 1000;
}

function getSearchDateBoundary(value: string, boundary: 'end' | 'start') {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(`${value}T${boundary === 'start' ? '00:00:00' : '23:59:59'}`);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getComparableTime(result: SearchResult) {
  return result.sortTime ? Date.parse(result.sortTime) || 0 : 0;
}

function normalizeSearchText(text: string) {
  return text.trim().toLowerCase();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRecentSearches() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY) ?? '[]');

    return Array.isArray(parsedValue)
      ? parsedValue.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

function storeRecentSearch(keyword: string) {
  const nextSearches = [keyword, ...readRecentSearches().filter((item) => item !== keyword)].slice(0, 6);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(nextSearches));
  }

  return nextSearches;
}

function updateSearchQueryParams(
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  options: SearchOptionsSnapshot,
) {
  const params = new URLSearchParams();

  if (options.keyword) {
    params.set('q', options.keyword);
  }

  if (options.searchField !== 'title') {
    params.set('field', options.searchField);
  }

  if (options.rangeMode === 'board' && options.selectedBoard) {
    params.set('board', options.selectedBoard);
  }

  if (options.startDate) {
    params.set('start', options.startDate);
  }

  if (options.endDate) {
    params.set('end', options.endDate);
  }

  if (options.timeRange !== 'year') {
    params.set('timeRange', options.timeRange);
  }

  setSearchParams(params, { replace: true });
}

function getSearchOptionsFromParams(params: URLSearchParams, keyword: string): SearchOptionsSnapshot {
  return {
    keyword,
    searchField: getSearchFieldFromParams(params),
    rangeMode: getSearchRangeFromParams(params),
    selectedBoard: getSearchBoardFromParams(params),
    startDate: normalizeSearchDate(params.get('start')),
    endDate: normalizeSearchDate(params.get('end')),
    timeRange: getSearchTimeRangeFromParams(params),
  };
}

function getSearchFieldFromParams(params: URLSearchParams): SearchFieldMode {
  const field = params.get('field');
  const type = params.get('type');

  return field === 'body' || type === 'post' ? 'body' : 'title';
}

function getSearchRangeFromParams(params: URLSearchParams): SearchRangeMode {
  const board = params.get('board')?.trim();
  if (board && searchBoardOptions.includes(board)) {
    return 'board';
  }

  return 'all';
}

function getSearchBoardFromParams(params: URLSearchParams) {
  const board = params.get('board')?.trim();

  if (board && searchBoardOptions.includes(board)) {
    return board;
  }

  return defaultSearchBoard;
}

function getSearchTimeRangeFromParams(params: URLSearchParams): SearchTimeRange {
  const range = params.get('timeRange');

  return range === 'twoYears' || range === 'all' ? range : 'year';
}

function normalizeSearchDate(value: string | null) {
  const normalizedValue = value?.trim() ?? '';

  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : '';
}
