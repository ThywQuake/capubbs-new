import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  initialProfileDetails as fallbackProfileDetails,
} from '../data/userCenter';
import defaultAvatar from '../assets/avatar/default-avatar.avif';
import { ProfileSkeletonContent } from '../components/layout/PageSkeleton';
import { AccountSecurityDialog } from '../components/user/AccountSecurityDialog';
import { AvatarPreviewDialog } from '../components/user/AvatarPreviewDialog';
import { EmptyPanelState } from '../components/user/EmptyPanelState';
import { PaginationControls } from '../components/user/PaginationControls';
import { ProfileDataSection } from '../components/user/ProfileDataSection';
import { ProfileSummaryCard } from '../components/user/ProfileSummaryCard';
import { PublicProfileLink } from '../components/user/PublicProfileLink';
import { UserCenterFilterPanel } from '../components/user/UserCenterFilterPanel';
import { UserCenterTabs, userCenterTabs } from '../components/user/UserCenterTabs';
import { UserRecordCard } from '../components/user/UserRecordCard';
import { getRichTextEditorStorageValue, type RichTextEditorValue } from '../components/editor/RichTextEditor';
import {
  createProfileDraft,
  getRecordVariant,
  isRecordInDateRange,
} from '../components/user/userCenterUtils';
import { useLegacyBbs, useLegacyBbsUserCenter } from '../api/LegacyBbsDataContext';
import { legacyBbsPost } from '../api/legacyBbsClient';
import { deleteStoredReplyDraft, readStoredReplyDrafts, subscribeStoredReplyDrafts } from '../utils/replyDraftStorage';
import {
  deleteThreadComposeDraft,
  readThreadComposeDrafts,
  subscribeThreadComposeDrafts,
} from '../utils/threadComposeStorage';
import { md5LegacyStringHex } from '../utils/md5';
import { getThreadPath } from '../utils/threadRoutes';
import { getViewerStorageOwnerKey } from '../utils/viewerStorage';
import { isGuestViewer } from '../utils/viewerPermissions';
import { readCachedUserAvatar, writeCachedUserAvatar } from '../utils/userAvatarCache';
import {
  appendLegacySignatureFloorReferenceStorage,
  hasLegacySignatureFloorReference,
  normalizeNewForumSignatureFloorsForLegacyStorage,
  translateLegacySignatureHtml,
} from '../utils/legacySignature';
import type {
  EditTarget,
  ProfileField,
  ProfileFieldKey,
  SignatureDraft,
  UserCenterFilterResult,
  UserCenterRecords,
  UserCenterTab,
  UserRecord,
} from '../types/userCenter';
import { DEFAULT_LIST_PAGE_SIZE } from '../types/listDisplay';
import type {
  LegacyBbsPasswordUpdateResponse,
  LegacyBbsUserCenterResponse,
} from '../api/legacyBbsClient';

type UserCenterRouteProps = {
  onOpenMessages: () => void;
  showMessageAction: boolean;
};

type UserCenterNotice = {
  text: string;
  tone: 'error' | 'success';
} | null;

const EMPTY_PROFILE_DETAILS: ProfileField[] = fallbackProfileDetails.map((detail) => ({ ...detail, value: '' }));
const EMPTY_PROFILE_INTRO: ProfileField = { key: 'intro', label: '个人简介', value: '' };
const EMPTY_SIGNATURE_DRAFT: SignatureDraft = { content: '', contentMode: 'rich', sourceHref: '' };
const EMPTY_USER_CENTER_RECORDS: UserCenterRecords = {
  activities: [],
  bookmarks: [],
  drafts: [],
  posts: [],
  replies: [],
  signatures: [],
};
const USER_RECORD_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export function UserCenterRoute({
  onOpenMessages,
  showMessageAction,
}: UserCenterRouteProps) {
  const [searchParams] = useSearchParams();
  const legacyBbs = useLegacyBbs();
  const isGuest = isGuestViewer(legacyBbs.viewer);
  const [activeTab, setActiveTab] = useState<UserCenterTab>('posts');
  const userCenterState = useLegacyBbsUserCenter(!isGuest, getRemoteUserCenterRecordTab(activeTab));
  const liveUserCenter = userCenterState.data;
  const replyDraftOwnerKey = getViewerStorageOwnerKey(legacyBbs.viewer);
  const viewerDisplayName = legacyBbs.viewer?.username.trim() || '用户';
  const [filterKeyword, setFilterKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [profileDetails, setProfileDetails] = useState<ProfileField[]>(EMPTY_PROFILE_DETAILS);
  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft([EMPTY_PROFILE_INTRO, ...EMPTY_PROFILE_DETAILS]));
  const [signatureRecords, setSignatureRecords] = useState<UserRecord[]>([]);
  const [signatureDraft, setSignatureDraft] = useState<SignatureDraft>(EMPTY_SIGNATURE_DRAFT);
  const [editingTarget, setEditingTarget] = useState<EditTarget>(null);
  const [isAccountSecurityOpen, setIsAccountSecurityOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(() => readCachedUserAvatar(viewerDisplayName) ?? defaultAvatar);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState(() => readStoredReplyDrafts(replyDraftOwnerKey));
  const [threadComposeDrafts, setThreadComposeDrafts] = useState(() => readThreadComposeDrafts(replyDraftOwnerKey));
  const [pendingDraftDeletion, setPendingDraftDeletion] = useState<UserRecord | null>(null);
  const [notice, setNotice] = useState<UserCenterNotice>(null);
  const lastRouteActionKeyRef = useRef('');

  const currentUserId = liveUserCenter?.userId ?? viewerDisplayName;
  const currentProfileStats = liveUserCenter?.stats ?? [];
  const currentUserRecords = liveUserCenter?.records ?? EMPTY_USER_CENTER_RECORDS;
  const activePanel = userCenterTabs.find((tab) => tab.key === activeTab) ?? userCenterTabs[0];
  const replyDraftRecords = replyDrafts.map<UserRecord>((draft) => ({
    title: draft.threadTitle,
    board: draft.board,
    excerpt: draft.excerpt || '附件回复草稿',
    time: draft.updatedAt,
    status: '回帖草稿',
    draftId: draft.id,
    draftType: 'reply',
    href: `${getThreadPath(draft.threadId)}?draft=${encodeURIComponent(draft.id)}`,
    boardHref: draft.boardHref,
    date: draft.updatedAt,
  }));
  const threadComposeDraftRecords = threadComposeDrafts.map<UserRecord>((draft) => ({
    title: draft.title.trim() || '未命名主题',
    board: draft.board,
    excerpt: draft.excerpt,
    time: draft.updatedAt,
    status: '发帖草稿',
    draftBoard: draft.board,
    draftId: draft.id,
    draftType: 'thread',
    href: draft.href,
    boardHref: draft.boardHref,
    date: draft.updatedAt,
  }));
  const localDraftRecords = [...threadComposeDraftRecords, ...replyDraftRecords].sort((firstRecord, secondRecord) =>
    secondRecord.date.localeCompare(firstRecord.date),
  );
  const activeRecords =
    activeTab === 'signatures' ? signatureRecords : activeTab === 'drafts' ? localDraftRecords : currentUserRecords[activeTab];
  const showFilterPanel = activeTab !== 'signatures';

  const persistProfileDraft = async (draft: Record<ProfileFieldKey, string>) => {
    if (isGuest) {
      return;
    }

    try {
      const data = await legacyBbsPost<LegacyBbsUserCenterResponse>('/user-center/profile', {
        details: draft,
      });
      const nextAvatarSrc = data.profile.avatar || readCachedUserAvatar(currentUserId) || defaultAvatar;

      legacyBbs.syncViewer(data.viewer);
      setAvatarSrc(nextAvatarSrc);
      setNotice({ text: '资料已保存', tone: 'success' });
      userCenterState.reload();
    } catch (error) {
      setNotice({ text: getErrorMessage(error), tone: 'error' });
    }
  };

  const persistSignatureRecords = async (records: UserRecord[]) => {
    if (isGuest) {
      return;
    }

    try {
      await legacyBbsPost<LegacyBbsUserCenterResponse>('/user-center/signatures', {
        signatures: records.map((record) => record.content ?? record.excerpt),
      });
      setNotice({ text: '签名档已保存', tone: 'success' });
      userCenterState.reload();
    } catch (error) {
      setNotice({ text: getErrorMessage(error), tone: 'error' });
    }
  };

  const commitActiveEdit = () => {
    if (editingTarget?.type === 'profile') {
      if (!hasProfileDraftChanges(profileDraft, profileDetails, liveUserCenter?.intro ?? '')) {
        setProfileDraft(createProfileDraft([{ ...EMPTY_PROFILE_INTRO, value: liveUserCenter?.intro ?? '' }, ...profileDetails]));
        return;
      }

      const nextDetails = profileDetails.map((item) => ({
        ...item,
        value: profileDraft[item.key],
      }));

      setProfileDetails(nextDetails);
      void persistProfileDraft(profileDraft);
      return;
    }

    if (editingTarget?.type === 'signature') {
      const content = getSignatureDraftStorageContent(signatureDraft);
      const excerpt = getSignatureDraftExcerpt(signatureDraft);
      const nextRecords = signatureRecords.map((record) =>
        record.href === editingTarget.href
          ? {
              ...record,
              content,
              excerpt,
              sourceHref: signatureDraft.sourceHref,
            }
          : record,
      );

      setSignatureRecords(nextRecords);
      void persistSignatureRecords(nextRecords);
    }
  };

  const handleProfileEdit = () => {
    if (editingTarget?.type === 'profile') {
      commitActiveEdit();
      setEditingTarget(null);
      return;
    }

    commitActiveEdit();
    setProfileDraft(createProfileDraft([{ ...EMPTY_PROFILE_INTRO, value: liveUserCenter?.intro ?? '' }, ...profileDetails]));
    setEditingTarget({ type: 'profile' });
  };

  const handleSignatureEdit = (record: UserRecord) => {
    if (editingTarget?.type === 'signature' && editingTarget.href === record.href) {
      commitActiveEdit();
      setEditingTarget(null);
      return;
    }

    commitActiveEdit();
    setSignatureDraft(createSignatureDraft(record));
    setEditingTarget({ type: 'signature', href: record.href });
  };

  const handleSignatureLink = (record: UserRecord, linkedSignature: { href: string }) => {
    const nextDraft =
      editingTarget?.type === 'signature' && editingTarget.href === record.href
        ? {
            ...signatureDraft,
            sourceHref: linkedSignature.href,
          }
        : {
            ...createSignatureDraft(record),
            sourceHref: linkedSignature.href,
          };
    const content = getSignatureDraftStorageContent(nextDraft);
    const excerpt = getSignatureDraftExcerpt(nextDraft);
    const nextRecords = signatureRecords.map((signatureRecord) =>
      signatureRecord.href === record.href
        ? {
            ...signatureRecord,
            content,
            excerpt,
            sourceHref: linkedSignature.href,
          }
        : signatureRecord,
    );

    if (editingTarget?.type === 'signature' && editingTarget.href === record.href) {
      setSignatureDraft(nextDraft);
    }

    setSignatureRecords(nextRecords);
    void persistSignatureRecords(nextRecords);
  };

  const handleTabChange = (tab: UserCenterTab) => {
    commitActiveEdit();
    setEditingTarget(null);
    setActiveTab(tab);
  };

  const handleOpenAccountSecurity = () => {
    commitActiveEdit();
    setEditingTarget(null);
    setIsAccountSecurityOpen(true);
  };

  const handleChangePassword = async ({
    newPassword,
    oldPassword,
  }: {
    newPassword: string;
    oldPassword: string;
  }) => {
    await legacyBbsPost<LegacyBbsPasswordUpdateResponse>('/user-center/password', {
      newPasswordHash: md5LegacyStringHex(newPassword),
      oldPasswordHash: md5LegacyStringHex(oldPassword),
    });
    setNotice({ text: '密码已修改', tone: 'success' });
    userCenterState.reload();
  };

  const handleProfileAvatarClick = () => {
    setIsAvatarPreviewOpen(true);
  };

  const confirmDraftDeletion = () => {
    if (pendingDraftDeletion?.draftType === 'thread' && pendingDraftDeletion.draftBoard) {
      deleteThreadComposeDraft(pendingDraftDeletion.draftBoard, replyDraftOwnerKey);
      setThreadComposeDrafts(readThreadComposeDrafts(replyDraftOwnerKey));
    }

    if (pendingDraftDeletion?.draftType === 'reply' && pendingDraftDeletion.draftId) {
      deleteStoredReplyDraft(pendingDraftDeletion.draftId, replyDraftOwnerKey);
      setReplyDrafts(readStoredReplyDrafts(replyDraftOwnerKey));
    }

    setPendingDraftDeletion(null);
  };

  const resetFilters = () => {
    setFilterKeyword('');
    setStartDate('');
    setEndDate('');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, endDate, filterKeyword, startDate]);

  useEffect(() => {
    const tab = getUserCenterTabFromParams(searchParams);

    if (tab) {
      setActiveTab(tab);
    }

    const routeActionKey = searchParams.toString();

    if (routeActionKey && lastRouteActionKeyRef.current === routeActionKey) {
      return;
    }

    lastRouteActionKeyRef.current = routeActionKey;

    if (searchParams.get('open') === 'messages' || searchParams.get('pos') === 'message') {
      onOpenMessages();
    }

    if (searchParams.get('dialog') === 'security' || searchParams.get('pos') === 'security') {
      setIsAccountSecurityOpen(true);
    }
  }, [onOpenMessages, searchParams]);

  useEffect(() => {
    setEditingTarget(null);
    setNotice(null);
    setProfileDetails(EMPTY_PROFILE_DETAILS);
    setProfileDraft(createProfileDraft([EMPTY_PROFILE_INTRO, ...EMPTY_PROFILE_DETAILS]));
    setSignatureRecords([]);
    setSignatureDraft(EMPTY_SIGNATURE_DRAFT);
    setAvatarSrc(readCachedUserAvatar(viewerDisplayName) ?? defaultAvatar);
  }, [replyDraftOwnerKey, viewerDisplayName]);

  useEffect(() => {
    if (!liveUserCenter) {
      return;
    }

    setProfileDetails(liveUserCenter.details);
    setProfileDraft(createProfileDraft([{ ...EMPTY_PROFILE_INTRO, value: liveUserCenter.intro }, ...liveUserCenter.details]));
    setSignatureRecords(liveUserCenter.records.signatures);
    if (liveUserCenter.avatarSrc) {
      writeCachedUserAvatar(liveUserCenter.userId, liveUserCenter.avatarSrc);
    }
    setAvatarSrc(liveUserCenter.avatarSrc || readCachedUserAvatar(liveUserCenter.userId) || defaultAvatar);
  }, [liveUserCenter]);

  useEffect(() => {
    setReplyDrafts(readStoredReplyDrafts(replyDraftOwnerKey));

    return subscribeStoredReplyDrafts(
      () => setReplyDrafts(readStoredReplyDrafts(replyDraftOwnerKey)),
      replyDraftOwnerKey,
    );
  }, [replyDraftOwnerKey]);

  useEffect(() => {
    setThreadComposeDrafts(readThreadComposeDrafts(replyDraftOwnerKey));

    return subscribeThreadComposeDrafts(
      () => setThreadComposeDrafts(readThreadComposeDrafts(replyDraftOwnerKey)),
      replyDraftOwnerKey,
    );
  }, [replyDraftOwnerKey]);

  const filteredResult = useMemo<UserCenterFilterResult>(() => {
    if (activeTab === 'signatures') {
      return {
        records: activeRecords.slice(0, 3),
        matchedCount: Math.min(activeRecords.length, 3),
        limitedCount: Math.min(activeRecords.length, 3),
        currentPage: 1,
        totalPages: 1,
      };
    }

    const keyword = filterKeyword.trim().toLowerCase();
    const matchingRecords = activeRecords.filter((record) => {
      const matchesKeyword =
        keyword.length === 0 ||
        [record.title, record.board, record.excerpt, record.status ?? ''].some((text) =>
          text.toLowerCase().includes(keyword),
        );

      return matchesKeyword && isRecordInDateRange(record.date, startDate, endDate);
    });
    const totalPages = Math.max(1, Math.ceil(matchingRecords.length / USER_RECORD_PAGE_SIZE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStart = (safeCurrentPage - 1) * USER_RECORD_PAGE_SIZE;

    return {
      records: matchingRecords.slice(pageStart, pageStart + USER_RECORD_PAGE_SIZE),
      matchedCount: matchingRecords.length,
      limitedCount: matchingRecords.length,
      currentPage: safeCurrentPage,
      totalPages,
    };
  }, [activeRecords, activeTab, currentPage, endDate, filterKeyword, startDate]);

  if (!liveUserCenter) {
    return <UserCenterLoadingState error={userCenterState.error} />;
  }

  return (
    <div className="space-y-4">
      <ProfileSummaryCard
        avatarSrc={avatarSrc}
        isEditingProfile={editingTarget?.type === 'profile'}
        onAvatarClick={handleProfileAvatarClick}
        onEditProfile={handleProfileEdit}
        onIntroChange={(value) => setProfileDraft((draft) => ({ ...draft, intro: value }))}
        onOpenAccountSecurity={handleOpenAccountSecurity}
        onOpenMessages={onOpenMessages}
        intro={editingTarget?.type === 'profile' ? profileDraft.intro : liveUserCenter.intro}
        rating={liveUserCenter?.rating}
        showMessageAction={showMessageAction}
        userId={currentUserId}
      />

      <ProfileDataSection
        details={profileDetails}
        draft={profileDraft}
        isEditing={editingTarget?.type === 'profile'}
        onDraftChange={(key: ProfileFieldKey, value) => setProfileDraft((draft) => ({ ...draft, [key]: value }))}
        stats={currentProfileStats}
      />

      {(notice || userCenterState.error) ? (
        <div
          role="status"
          className={
            notice?.tone === 'error' || (!notice && userCenterState.error)
              ? 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-panel dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100'
              : 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-panel dark:border-emerald-100/15 dark:bg-emerald-300/10 dark:text-emerald-100'
          }
        >
          {notice?.text ?? userCenterState.error}
        </div>
      ) : null}

      <UserCenterTabs activeTab={activeTab} onChange={handleTabChange} />

      {showFilterPanel && (
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
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 space-y-2">
          {filteredResult.records.map((record, recordIndex) => (
            <UserRecordCard
              key={`${activeTab}-${record.href}`}
              compact
              record={record}
              variant={getRecordVariant(activeTab)}
              signatureIndex={activeTab === 'signatures' ? recordIndex + 1 : undefined}
              isEditing={editingTarget?.type === 'signature' && editingTarget.href === record.href}
              signatureDraft={
                editingTarget?.type === 'signature' && editingTarget.href === record.href ? signatureDraft : undefined
              }
              onDraftDelete={activeTab === 'drafts' ? setPendingDraftDeletion : undefined}
              onSignatureEdit={handleSignatureEdit}
              onSignatureDraftChange={(field, value) =>
                setSignatureDraft((draft) => ({
                  ...draft,
                  [field]: value,
                } as SignatureDraft))
              }
              onSignatureLink={handleSignatureLink}
            />
          ))}

          {filteredResult.records.length === 0 && (
            <EmptyPanelState />
          )}

          {showFilterPanel && filteredResult.totalPages > 1 && (
            <PaginationControls
              currentPage={filteredResult.currentPage}
              totalPages={filteredResult.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </section>

        <aside className="flex flex-col gap-3">
          {showFilterPanel && (
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
          )}

          <PublicProfileLink userId={currentUserId} />
        </aside>
      </div>

      <AccountSecurityDialog
        open={isAccountSecurityOpen}
        onClose={() => setIsAccountSecurityOpen(false)}
        onSubmit={handleChangePassword}
      />
      <AvatarPreviewDialog
        avatarSrc={avatarSrc}
        open={isAvatarPreviewOpen}
        userId={currentUserId}
        onClose={() => setIsAvatarPreviewOpen(false)}
      />
      {pendingDraftDeletion ? (
        <DraftDeleteConfirmDialog
          record={pendingDraftDeletion}
          onCancel={() => setPendingDraftDeletion(null)}
          onConfirm={confirmDraftDeletion}
        />
      ) : null}
    </div>
  );
}

function UserCenterLoadingState({ error }: { error: string | null }) {
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

function DraftDeleteConfirmDialog({
  onCancel,
  onConfirm,
  record,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  record: UserRecord;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-delete-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 dark:bg-black/80"
      onClick={onCancel}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),27rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-100">
            <Trash2 size={17} />
          </span>
          <h2 id="draft-delete-dialog-title" className="text-base font-semibold">
            删除草稿
          </h2>
        </header>
        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            确认删除《{record.title}》这条草稿？删除后无法从草稿箱恢复。
          </p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-md border border-rose-300 bg-rose-600 px-3 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:border-rose-900 dark:bg-rose-300 dark:text-zinc-950 dark:hover:bg-rose-200 dark:focus-visible:ring-rose-200"
          >
            删除
          </button>
        </footer>
      </section>
    </div>
  );
}

function createSignatureDraft(record: UserRecord): SignatureDraft {
  return {
    content: getSignatureEditorContent(record.content ?? record.excerpt),
    contentMode: 'rich',
    sourceHref: record.sourceHref ?? '',
  };
}

function getSignatureEditorContent(content: string) {
  const value = content.trim();

  if (!value) {
    return '';
  }

  return looksLikeHtml(value) ? value : translateLegacySignatureHtml(value);
}

function getSignatureDraftStorageContent(draft: SignatureDraft) {
  const editorValue: RichTextEditorValue = {
    content: draft.content,
    mode: draft.contentMode,
  };

  if (editorValue.mode === 'markdown') {
    const markdownContent = hasSignatureDraftContent(editorValue)
      ? splitSignatureParagraphs(stripMarkdownSignatureText(editorValue.content))
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('')
      : '';

    return appendLegacySignatureFloorReferenceStorage(markdownContent, draft.sourceHref);
  }

  if (!hasSignatureDraftContent(editorValue)) {
    return appendLegacySignatureFloorReferenceStorage('', draft.sourceHref);
  }

  const storageContent = normalizeNewForumSignatureFloorsForLegacyStorage(getRichTextEditorStorageValue(editorValue).content.trim());

  return appendLegacySignatureFloorReferenceStorage(storageContent, draft.sourceHref);
}

function getSignatureDraftExcerpt(draft: SignatureDraft) {
  const editorValue: RichTextEditorValue = {
    content: draft.content,
    mode: draft.contentMode,
  };

  if (editorValue.mode === 'markdown') {
    return stripMarkdownSignatureText(editorValue.content).replace(/\s+/g, ' ').trim();
  }

  return getHtmlPlainText(editorValue.content);
}

function hasSignatureDraftContent(value: RichTextEditorValue) {
  if (value.mode === 'markdown') {
    return stripMarkdownSignatureText(value.content).trim().length > 0;
  }

  return getHtmlPlainText(value.content).length > 0 ||
    hasLegacySignatureFloorReference(value.content) ||
    /<(img|video|iframe|svg)\b/i.test(value.content);
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function getHtmlPlainText(value: string) {
  if (typeof document === 'undefined') {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const container = document.createElement('div');
  container.innerHTML = value;

  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function stripMarkdownSignatureText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[>\-*#]+\s*/gm, '')
    .replace(/[*_`]/g, '');
}

function splitSignatureParagraphs(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function hasProfileDraftChanges(
  draft: Record<ProfileFieldKey, string>,
  details: ProfileField[],
  intro: string,
) {
  if (draft.intro !== intro) {
    return true;
  }

  return details.some((item) => draft[item.key] !== item.value);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

function getUserCenterTabFromParams(searchParams: URLSearchParams): UserCenterTab | null {
  const tab = searchParams.get('tab');

  return isUserCenterTab(tab) ? tab : null;
}

function getRemoteUserCenterRecordTab(tab: UserCenterTab) {
  return tab === 'posts' || tab === 'replies' || tab === 'bookmarks' ? tab : null;
}

function isUserCenterTab(value: string | null): value is UserCenterTab {
  return userCenterTabs.some((tab) => tab.key === value);
}
