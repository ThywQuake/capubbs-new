import { ChevronRight, MessageCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicProfile, OWN_PUBLIC_PROFILE_SLUG } from '../data/publicProfiles';
import { useLegacyBbs, useLegacyBbsPublicProfile } from '../api/LegacyBbsDataContext';
import { ProfileSkeletonContent } from '../components/layout/PageSkeleton';
import { EmptyPanelState } from '../components/user/EmptyPanelState';
import { PaginationControls } from '../components/user/PaginationControls';
import { ProfileSummaryCard } from '../components/user/ProfileSummaryCard';
import { UserCenterFilterPanel } from '../components/user/UserCenterFilterPanel';
import { UserCenterTabs, userCenterTabs } from '../components/user/UserCenterTabs';
import { UserRecordCard } from '../components/user/UserRecordCard';
import { ProfileInfoGrid } from '../components/profile/ProfileInfoGrid';
import {
  getRecordVariant,
  isRecordInDateRange,
} from '../components/user/userCenterUtils';
import { DEFAULT_LIST_PAGE_SIZE } from '../types/listDisplay';
import type { UserCenterFilterResult, UserCenterTab, UserRecord } from '../types/userCenter';

type PublicProfileRouteProps = {
  profileName: string | null;
  onOpenMessages: (userId: string) => void;
  showMessageAction: boolean;
  showUserCenterEntry?: boolean;
};

const publicProfileTabs = userCenterTabs.filter((tab) =>
  ['posts', 'replies', 'activities', 'bookmarks'].includes(tab.key),
);
const PUBLIC_PROFILE_RECORD_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export function PublicProfileRoute({
  profileName,
  onOpenMessages,
  showMessageAction,
  showUserCenterEntry = true,
}: PublicProfileRouteProps) {
  const legacyBbs = useLegacyBbs();
  const fallbackProfile = getPublicProfile(profileName);
  const requestedProfileName = getLegacyProfileRequestName(profileName, fallbackProfile);
  const publicProfileState = useLegacyBbsPublicProfile(requestedProfileName, Boolean(requestedProfileName));
  const profile = publicProfileState.data;
  const viewerName = legacyBbs.viewer?.username.trim() ?? '';
  const isOwnProfile =
    Boolean(profile && viewerName.length > 0 && viewerName === profile.id.trim()) ||
    Boolean(profile && profile.slug === OWN_PUBLIC_PROFILE_SLUG && viewerName === profile.id.trim());
  const [activeTab, setActiveTab] = useState<UserCenterTab>('posts');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const activePanel = publicProfileTabs.find((tab) => tab.key === activeTab) ?? publicProfileTabs[0];
  const publicRecords: Partial<Record<UserCenterTab, UserRecord[]>> = profile
    ? {
        activities: profile.activities,
        bookmarks: profile.bookmarks,
        posts: profile.posts,
        replies: profile.replies,
      }
    : {};
  const activeRecords = publicRecords[activeTab] ?? [];
  const stats = profile ? [{ label: '上次在线', value: profile.lastSeen }, ...profile.stats] : [];

  const resetFilters = () => {
    setFilterKeyword('');
    setStartDate('');
    setEndDate('');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, endDate, filterKeyword, startDate, profileName]);

  const filteredResult = useMemo<UserCenterFilterResult>(() => {
    const keyword = filterKeyword.trim().toLowerCase();
    const matchingRecords = activeRecords.filter((record) => {
      const matchesKeyword =
        keyword.length === 0 ||
        [record.title, record.board, record.excerpt, record.status ?? '', record.author ?? ''].some((text) =>
          text.toLowerCase().includes(keyword),
        );

      return matchesKeyword && isRecordInDateRange(record.date, startDate, endDate);
    });
    const totalPages = Math.max(1, Math.ceil(matchingRecords.length / PUBLIC_PROFILE_RECORD_PAGE_SIZE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStart = (safeCurrentPage - 1) * PUBLIC_PROFILE_RECORD_PAGE_SIZE;

    return {
      records: matchingRecords.slice(pageStart, pageStart + PUBLIC_PROFILE_RECORD_PAGE_SIZE),
      matchedCount: matchingRecords.length,
      limitedCount: matchingRecords.length,
      currentPage: safeCurrentPage,
      totalPages,
    };
  }, [activeRecords, currentPage, endDate, filterKeyword, startDate]);

  if (!profile) {
    return <PublicProfileLoadingState error={publicProfileState.error} />;
  }

  return (
    <div className="space-y-4">
      <ProfileSummaryCard
        avatarSrc={profile.avatarSrc}
        messageIcon={<MessageCircle size={15} />}
        messageLabel="私信"
        onOpenMessages={() => onOpenMessages(profile.id)}
        intro={profile.intro}
        rating={profile.rating}
        showMessageAction={showMessageAction}
        showEditAction={false}
        userId={profile.id}
      />

      <div className="space-y-2">
        <ProfileInfoGrid items={profile.details} />
        <ProfileInfoGrid items={stats} columnsClassName="grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" />
      </div>

      <UserCenterTabs activeTab={activeTab} onChange={setActiveTab} tabs={publicProfileTabs} />

      <div className="lg:hidden">
        <UserCenterFilterPanel
          activePanelLabel={activePanel.label}
          endDate={endDate}
          filterKeyword={filterKeyword}
          filteredResult={filteredResult}
          startDate={startDate}
          onEndDateChange={setEndDate}
          onFilterKeywordChange={setFilterKeyword}
          onReset={resetFilters}
          onStartDateChange={setStartDate}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 space-y-2">
          {filteredResult.records.map((record) => (
            <UserRecordCard
              key={`${activeTab}-${record.href}`}
              compact
              record={record}
              variant={getRecordVariant(activeTab)}
            />
          ))}

          {filteredResult.records.length === 0 && (
            <EmptyPanelState />
          )}

          {filteredResult.totalPages > 1 && (
            <PaginationControls
              currentPage={filteredResult.currentPage}
              totalPages={filteredResult.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <div className="hidden lg:block">
            <UserCenterFilterPanel
              activePanelLabel={activePanel.label}
              endDate={endDate}
              filterKeyword={filterKeyword}
              filteredResult={filteredResult}
              startDate={startDate}
              onEndDateChange={setEndDate}
              onFilterKeywordChange={setFilterKeyword}
              onReset={resetFilters}
              onStartDateChange={setStartDate}
            />
          </div>

          {isOwnProfile && showUserCenterEntry ? (
            <Link
              to="/user-center"
              className="card-surface group flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 text-sm font-semibold text-[#385772] shadow-panel transition hover:bg-zinc-100/80 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-zinc-800 dark:text-white dark:hover:bg-white/[0.06]"
            >
              <span>进入个人中心</span>
              <ChevronRight size={16} className="text-emerald-700/80 transition group-hover:translate-x-0.5 dark:text-emerald-100/80" />
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function PublicProfileLoadingState({ error }: { error: string | null }) {
  if (error) {
    return (
      <div
        role="status"
        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-panel dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100"
      >
        {error}
      </div>
    );
  }

  return <ProfileSkeletonContent />;
}

function getLegacyProfileRequestName(profileName: string | null, fallbackProfile: ReturnType<typeof getPublicProfile>) {
  const normalizedProfileName = profileName?.trim();

  if (!normalizedProfileName) {
    return fallbackProfile.id;
  }

  return normalizedProfileName === fallbackProfile.slug ? fallbackProfile.id : normalizedProfileName;
}
