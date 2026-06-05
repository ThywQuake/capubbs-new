import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaginationControls } from '../components/user/PaginationControls';
import {
  legacyAddPunishmentRecord,
  legacyUpdatePunishmentRecord,
  type LegacyPunishmentDraft,
} from '../api/legacyBbsApi';
import {
  fetchLegacyDataDisplay,
  type LegacyDataDisplayCheckinRankingRecord,
  type LegacyDataDisplayCheckinRecord,
  type LegacyDataDisplayData,
  type LegacyDataDisplayOnlineUser,
  type LegacyDataDisplayPunishmentRecord,
} from '../api/legacyBbsClient/dataDisplay';
import defaultActivityCover from '../assets/activity/activity.avif';
import defaultActivityDarkCover from '../assets/activity/activity-dark.avif';
import { useLegacyBbs } from '../api/legacyBbsData';
import { getErrorMessage, isAbortError } from '../api/legacyBbsData/requestState';
import { joinClassNames } from '../utils/classNames';
import { formatPostTimestamp } from '../utils/formatPostTimestamp';
import { canManagePunishmentRecords } from '../utils/viewerPermissions';

type DataDisplayPanel = 'checkin-ranking' | 'checkins' | 'online' | 'punishments';
type DataDisplayStatus = 'idle' | 'loading' | 'ready' | 'error';

type DataDisplayState = {
  data: LegacyDataDisplayData | null;
  error: string | null;
  status: DataDisplayStatus;
};

type PunishmentAcademicYearGroup = {
  key: string;
  records: LegacyDataDisplayPunishmentRecord[];
  startYear: number | null;
  title: string;
};

type AddPunishmentFormState = {
  addition: boolean;
  distance: string;
  name: string;
  reason: string;
  startDate: string;
  username: string;
};

type PendingPunishmentFinish = {
  endDate: string;
  error: string | null;
  recordId: string;
  status: 'idle' | 'submitting';
};

type PunishmentSortMode = 'name' | 'time';

const PUNISHMENT_DISTANCE_OPTIONS = [3, 4, 5] as const;
const punishmentNameCollator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});

const punishmentInputClass =
  'h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-white';

const punishmentSecondaryButtonClass =
  'inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800';

const punishmentDangerButtonClass =
  'inline-flex h-9 items-center justify-center rounded-md border border-rose-300 bg-rose-600 px-3 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:bg-rose-300 dark:text-zinc-950 dark:hover:bg-rose-200 dark:focus-visible:ring-rose-200';

export function DataDisplayRoute() {
  const legacyBbs = useLegacyBbs();
  const [searchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState<DataDisplayPanel>(() => getDataDisplayPanelFromParams(searchParams));
  const [state, setState] = useState<DataDisplayState>({
    data: null,
    error: null,
    status: 'idle',
  });
  const [isAddPunishmentOpen, setIsAddPunishmentOpen] = useState(false);
  const [isPunishmentManagementOpen, setIsPunishmentManagementOpen] = useState(false);
  const [punishmentPage, setPunishmentPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const requestedDate = getDataDisplayDateFromParams(searchParams);
  const onlineBoardId = getDataDisplayBoardIdFromParams(searchParams);
  const canManagePunishments = canManagePunishmentRecords(legacyBbs.viewer);

  useEffect(() => {
    setActivePanel(getDataDisplayPanelFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    setPunishmentPage(1);
  }, [activePanel, state.data?.punishmentRecords]);

  useEffect(() => {
    if (canManagePunishments) {
      return;
    }

    setIsAddPunishmentOpen(false);
    setIsPunishmentManagementOpen(false);
  }, [canManagePunishments]);

  useEffect(() => {
    const controller = new AbortController();

    setState({
      data: null,
      error: null,
      status: 'loading',
    });
    fetchLegacyDataDisplay(
      {
        date: requestedDate,
        onlineBoardId,
        panel: activePanel,
      },
      controller.signal,
    )
      .then((data) => {
        setState({
          data,
          error: null,
          status: 'ready',
        });
      })
      .catch((requestError: unknown) => {
        if (isAbortError(requestError)) {
          return;
        }

        setState({
          data: null,
          error: getErrorMessage(requestError),
          status: 'error',
        });
      });

    return () => controller.abort();
  }, [activePanel, onlineBoardId, requestedDate, reloadToken]);

  const reloadDataDisplay = () => {
    setReloadToken((current) => current + 1);
  };

  const handleTogglePunishmentManagement = () => {
    setActivePanel('punishments');
    setIsPunishmentManagementOpen((isOpen) => (activePanel === 'punishments' ? !isOpen : true));
  };

  const handleAddPunishment = async (draft: LegacyPunishmentDraft) => {
    await legacyAddPunishmentRecord(draft);
    window.location.reload();
  };

  const handleFinishPunishment = async (record: LegacyDataDisplayPunishmentRecord, endDate: string) => {
    await legacyUpdatePunishmentRecord({
      action: 'finish',
      endDate,
      punishmentId: record.id,
    });
    window.location.reload();
  };

  if (state.status === 'loading' && !state.data) {
    return <DataDisplaySkeleton activePanel={activePanel} />;
  }

  const data = state.data;
  const punishmentGroups = buildPunishmentAcademicYearGroups(data?.punishmentRecords ?? []);
  const isPunishmentManagementActive = canManagePunishments && isPunishmentManagementOpen && activePanel === 'punishments';

  return (
    <article className="space-y-4">
      <DataDisplayActivityDecoration />

      <nav className="flex flex-wrap gap-2" aria-label="数据展示类型">
        <DataPanelButton
          active={activePanel === 'online'}
          icon={<Users size={15} />}
          label="当前在线"
          onClick={() => setActivePanel('online')}
        />
        <DataPanelButton
          active={activePanel === 'checkins'}
          icon={<CalendarCheck2 size={15} />}
          label="今日签到"
          onClick={() => setActivePanel('checkins')}
        />
        <DataPanelButton
          active={activePanel === 'checkin-ranking'}
          icon={<Trophy size={15} />}
          label="签到排行"
          onClick={() => setActivePanel('checkin-ranking')}
        />
        <DataPanelButton
          active={activePanel === 'punishments'}
          icon={<AlertCircle size={15} />}
          label="罚跑记录"
          onClick={() => setActivePanel('punishments')}
          tone="danger"
        />
      </nav>

      {state.error ? (
        <DataDisplayError message={state.error} />
      ) : activePanel === 'online' ? (
        <OnlineUsersTable records={data?.onlineUsers ?? []} />
      ) : activePanel === 'checkins' ? (
        <CheckinTable records={data?.checkinRecords ?? []} />
      ) : activePanel === 'checkin-ranking' ? (
        <CheckinRankingTable records={data?.checkinRankingRecords ?? []} />
      ) : (
        <PunishmentTable
          canManage={canManagePunishments}
          currentPage={punishmentPage}
          groups={punishmentGroups}
          isManagementActive={isPunishmentManagementActive}
          onAddRecord={() => setIsAddPunishmentOpen(true)}
          onFinishRecord={handleFinishPunishment}
          onPageChange={setPunishmentPage}
          onToggleManagement={handleTogglePunishmentManagement}
        />
      )}
      <AddPunishmentDialog
        onCancel={() => setIsAddPunishmentOpen(false)}
        onSubmit={handleAddPunishment}
        open={isPunishmentManagementActive && isAddPunishmentOpen}
      />
    </article>
  );
}

function DataDisplayActivityDecoration() {
  return (
    <section aria-hidden="true" className="overflow-hidden rounded-lg p-[1px] shadow-panel">
      <div className="relative overflow-hidden rounded-[7px]">
        <div className="relative min-h-[150px] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <img src={defaultActivityCover} alt="" className="h-full w-full object-cover object-top dark:hidden" />
            <img src={defaultActivityDarkCover} alt="" className="hidden h-full w-full object-cover object-top dark:block" />
          </div>
        </div>
      </div>
    </section>
  );
}

function DataPanelButton({
  active,
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'danger' | 'default';
}) {
  const isDanger = tone === 'danger';

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={joinClassNames(
        'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2',
        isDanger ? 'focus-visible:ring-red-500' : 'focus-visible:ring-[#385772]',
        active
          ? isDanger
            ? 'bg-red-600 text-white shadow-sm dark:bg-red-300 dark:text-red-950'
            : 'bg-[#385772] text-white shadow-sm dark:bg-emerald-200 dark:text-zinc-950'
          : isDanger
            ? 'border border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100 dark:border-red-300/20 dark:bg-red-400/[0.08] dark:text-red-100 dark:hover:bg-red-400/[0.14]'
            : 'border border-zinc-200 bg-white/70 text-[#385772] hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function OnlineUsersTable({ records }: { records: LegacyDataDisplayOnlineUser[] }) {
  return (
    <section id="online-users" className="card-surface scroll-mt-6 overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
      <SectionHeader icon={<Users size={17} />} title="当前在线" count={`${records.length} 人`} />
      <div className="overflow-x-auto">
        <table className="min-w-[42rem] w-full text-left text-sm">
          <thead className="border-b border-zinc-200/80 bg-zinc-50 text-xs font-bold text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">所在版面</th>
              <th className="px-4 py-3">登录方式</th>
              <th className="px-4 py-3">最近活动</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
            {records.length > 0 ? records.map((record) => (
              <tr key={record.id} className="bg-white/30 transition hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link to={record.href} className="font-bold text-[#385772] hover:underline dark:text-white">
                    {record.id}
                  </Link>
                </td>
                <td className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{record.location}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{record.loginType}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{formatClockTime(record.recentActiveAt)}</td>
              </tr>
            )) : (
              <tr className="bg-white/30 dark:bg-transparent">
                <td className="px-4 py-8 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400" colSpan={4}>
                  暂无在线记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CheckinTable({ records }: { records: LegacyDataDisplayCheckinRecord[] }) {
  return (
    <section id="today-checkins" className="card-surface scroll-mt-6 overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
      <SectionHeader icon={<CalendarCheck2 size={17} />} title="今日签到" count={`${records.length} 人`} />
      <div className="overflow-x-auto">
        <table className="min-w-[28rem] w-full text-left text-sm">
          <thead className="border-b border-zinc-200/80 bg-zinc-50 text-xs font-bold text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">今日顺序</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
            {records.length > 0 ? records.map((record) => (
              <tr key={record.id} className="bg-white/30 transition hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link to={record.href} className="font-bold text-[#385772] hover:underline dark:text-white">
                    {record.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">#{record.rank}</td>
              </tr>
            )) : (
              <tr className="bg-white/30 dark:bg-transparent">
                <td className="px-4 py-8 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400" colSpan={2}>
                  暂无签到记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CheckinRankingTable({ records }: { records: LegacyDataDisplayCheckinRankingRecord[] }) {
  return (
    <section id="checkin-ranking" className="card-surface scroll-mt-6 overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
      <SectionHeader icon={<Trophy size={17} />} title="签到排行" count={`${records.length} 人`} />
      <div className="overflow-x-auto">
        <table className="min-w-[42rem] w-full text-left text-sm">
          <thead className="border-b border-zinc-200/80 bg-zinc-50 text-xs font-bold text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">排名</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">累计签到</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
            {records.length > 0 ? records.map((record) => (
              <tr key={`${record.rank}-${record.id}`} className="bg-white/30 transition hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/[0.04]">
                <td className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">#{record.rank}</td>
                <td className="px-4 py-3">
                  <Link to={record.href} className="font-bold text-[#385772] hover:underline dark:text-white">
                    {record.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{record.totalCheckins} 次</td>
              </tr>
            )) : (
              <tr className="bg-white/30 dark:bg-transparent">
                <td className="px-4 py-8 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400" colSpan={3}>
                  暂无签到排行
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PunishmentTable({
  canManage,
  currentPage,
  groups,
  isManagementActive,
  onAddRecord,
  onFinishRecord,
  onPageChange,
  onToggleManagement,
}: {
  canManage: boolean;
  currentPage: number;
  groups: PunishmentAcademicYearGroup[];
  isManagementActive: boolean;
  onAddRecord: () => void;
  onFinishRecord: (record: LegacyDataDisplayPunishmentRecord, endDate: string) => Promise<void>;
  onPageChange: (page: number) => void;
  onToggleManagement: () => void;
}) {
  const [pendingFinish, setPendingFinish] = useState<PendingPunishmentFinish | null>(null);
  const [punishmentSortMode, setPunishmentSortMode] = useState<PunishmentSortMode>('time');
  const [showOnlyUnfinished, setShowOnlyUnfinished] = useState(false);
  const totalPages = Math.max(1, groups.length);
  const safeCurrentPage = getSafePunishmentPage(currentPage, groups.length);
  const activeGroup = groups[safeCurrentPage - 1] ?? null;
  const pageRecords = getVisiblePunishmentRecords(
    activeGroup?.records ?? [],
    showOnlyUnfinished,
    punishmentSortMode,
  );
  const showManagementControls = canManage && isManagementActive;
  const tableColumnCount = showManagementControls ? 9 : 8;

  useEffect(() => {
    setPendingFinish(null);
  }, [punishmentSortMode, safeCurrentPage, showManagementControls, showOnlyUnfinished]);

  const startFinishRecord = (record: LegacyDataDisplayPunishmentRecord) => {
    setPendingFinish({
      endDate: getTodayDateInputValue(),
      error: null,
      recordId: record.id,
      status: 'idle',
    });
  };

  const updatePendingEndDate = (endDate: string) => {
    setPendingFinish((current) => (
      current
        ? {
            ...current,
            endDate,
            error: null,
          }
        : current
    ));
  };

  const cancelFinishRecord = () => {
    setPendingFinish(null);
  };

  const confirmFinishRecord = async (record: LegacyDataDisplayPunishmentRecord) => {
    if (!pendingFinish || pendingFinish.recordId !== record.id || pendingFinish.status === 'submitting') {
      return;
    }

    if (!pendingFinish.endDate) {
      setPendingFinish({
        ...pendingFinish,
        error: '请选择完成日期',
      });
      return;
    }

    setPendingFinish({
      ...pendingFinish,
      error: null,
      status: 'submitting',
    });

    try {
      await onFinishRecord(record, pendingFinish.endDate);
      setPendingFinish(null);
    } catch (error) {
      setPendingFinish({
        ...pendingFinish,
        error: getErrorMessage(error),
        status: 'idle',
      });
    }
  };

  return (
    <section id="punishment-records" className="card-surface scroll-mt-6 overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
      <SectionHeader
        actions={(
          <PunishmentTableControls
            canManage={canManage}
            isManagementActive={isManagementActive}
            showOnlyUnfinished={showOnlyUnfinished}
            sortMode={punishmentSortMode}
            onChangeShowOnlyUnfinished={setShowOnlyUnfinished}
            onChangeSortMode={setPunishmentSortMode}
            onToggleManagement={onToggleManagement}
          />
        )}
        icon={<AlertCircle size={17} />}
        title={activeGroup ? `${activeGroup.title} 罚跑记录` : '罚跑记录'}
        count={`${pageRecords.length} 条`}
      />
      {showManagementControls ? (
        <div className="flex justify-center border-b border-zinc-200/80 px-4 py-3 dark:border-white/10 sm:px-5">
          <button
            type="button"
            onClick={onAddRecord}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:bg-red-300 dark:text-red-950 dark:hover:bg-red-200"
          >
            <Plus size={15} />
            添加罚跑记录
          </button>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className={joinClassNames(showManagementControls ? 'min-w-[72rem]' : 'min-w-[58rem]', 'w-full text-left text-sm')}>
          <thead className="border-b border-zinc-200/80 bg-zinc-50 text-xs font-bold text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">原因</th>
              <th className="px-4 py-3">长度</th>
              <th className="px-4 py-3">职务加罚</th>
              <th className="px-4 py-3">开始时间</th>
              <th className="px-4 py-3">结束时间</th>
              <th className="px-4 py-3">完成情况</th>
              {showManagementControls ? <th className="px-4 py-3">操作</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
            {pageRecords.length > 0 ? pageRecords.map((record) => {
              const activePendingFinish = pendingFinish?.recordId === record.id ? pendingFinish : null;
              const previewEndDate = activePendingFinish ? activePendingFinish.endDate : record.endDate;

              return (
                <tr key={record.id} className="bg-white/30 transition hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{record.name || '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={record.href} className="font-bold text-[#385772] hover:underline dark:text-white">
                      {record.username || '—'}
                    </Link>
                  </td>
                  <td className="max-w-[18rem] px-4 py-3 text-zinc-600 dark:text-zinc-300">{record.reason || '—'}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{formatPunishmentDistance(record.distance)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{record.addition === '1' ? '是' : '否'}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{formatPunishmentDate(record.startDate)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{formatPunishmentDate(previewEndDate)}</td>
                  <td className="px-4 py-3">
                    <PunishmentStatusBadge isEnd={record.isEnd} />
                  </td>
                  {showManagementControls ? (
                    <td className="px-4 py-3">
                      <PunishmentRowActions
                        pendingFinish={activePendingFinish}
                        record={record}
                        onCancelFinish={cancelFinishRecord}
                        onConfirmFinish={confirmFinishRecord}
                        onStartFinish={startFinishRecord}
                        onUpdateEndDate={updatePendingEndDate}
                      />
                    </td>
                  ) : null}
                </tr>
              );
            }) : (
              <tr className="bg-white/30 dark:bg-transparent">
                <td className="px-4 py-8 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400" colSpan={tableColumnCount}>
                  暂无罚跑记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {groups.length > 1 ? (
        <div className="border-t border-zinc-200/80 px-4 py-3 dark:border-white/10 sm:px-5">
          <PaginationControls currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      ) : null}
    </section>
  );
}

function PunishmentTableControls({
  canManage,
  isManagementActive,
  onChangeShowOnlyUnfinished,
  onChangeSortMode,
  onToggleManagement,
  showOnlyUnfinished,
  sortMode,
}: {
  canManage: boolean;
  isManagementActive: boolean;
  onChangeShowOnlyUnfinished: (checked: boolean) => void;
  onChangeSortMode: (mode: PunishmentSortMode) => void;
  onToggleManagement: () => void;
  showOnlyUnfinished: boolean;
  sortMode: PunishmentSortMode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canManage ? (
        <button
          type="button"
          aria-pressed={isManagementActive}
          onClick={onToggleManagement}
          className={joinClassNames(
            'inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
            isManagementActive
              ? 'bg-red-600 text-white shadow-sm dark:bg-red-300 dark:text-red-950'
              : 'border border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100 dark:border-red-300/20 dark:bg-red-400/[0.08] dark:text-red-100 dark:hover:bg-red-400/[0.14]',
          )}
        >
          <ShieldCheck size={14} />
          管理罚跑
        </button>
      ) : null}
      <label className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-2.5 text-xs font-bold text-zinc-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300">
        <input
          type="checkbox"
          checked={showOnlyUnfinished}
          onChange={(event) => onChangeShowOnlyUnfinished(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
        />
        只看未完成
      </label>
      <label className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-2.5 text-xs font-bold text-zinc-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300">
        排序
        <select
          value={sortMode}
          onChange={(event) => onChangeSortMode(event.target.value === 'name' ? 'name' : 'time')}
          className="h-6 rounded border border-zinc-200 bg-white px-1.5 text-xs font-bold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900 dark:text-white"
        >
          <option value="time">按时间</option>
          <option value="name">按姓名</option>
        </select>
      </label>
    </div>
  );
}

function PunishmentRowActions({
  onCancelFinish,
  onConfirmFinish,
  onStartFinish,
  onUpdateEndDate,
  pendingFinish,
  record,
}: {
  onCancelFinish: () => void;
  onConfirmFinish: (record: LegacyDataDisplayPunishmentRecord) => void;
  onStartFinish: (record: LegacyDataDisplayPunishmentRecord) => void;
  onUpdateEndDate: (date: string) => void;
  pendingFinish: PendingPunishmentFinish | null;
  record: LegacyDataDisplayPunishmentRecord;
}) {
  if (record.isEnd) {
    return <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">—</span>;
  }

  if (!pendingFinish) {
    return (
      <button
        type="button"
        onClick={() => onStartFinish(record)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-300/20 dark:bg-red-400/[0.08] dark:text-red-100 dark:hover:bg-red-400/[0.14]"
      >
        <CheckCircle2 size={14} />
        记录完成
      </button>
    );
  }

  const isSubmitting = pendingFinish.status === 'submitting';

  return (
    <div className="grid w-44 gap-2">
      <input
        aria-label="完成日期"
        type="date"
        disabled={isSubmitting}
        value={pendingFinish.endDate}
        onChange={(event) => onUpdateEndDate(event.target.value)}
        className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onConfirmFinish(record)}
          className="inline-flex h-8 w-full items-center justify-center rounded-md bg-red-600 px-2.5 text-xs font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-300 dark:text-red-950 dark:hover:bg-red-200"
        >
          {isSubmitting ? '提交中...' : '确认'}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancelFinish}
          className="inline-flex h-8 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          取消
        </button>
      </div>
      {pendingFinish.error ? (
        <p className="text-xs font-bold text-rose-700 dark:text-rose-100">{pendingFinish.error}</p>
      ) : null}
    </div>
  );
}

function PunishmentStatusBadge({ isEnd }: { isEnd: boolean }) {
  return (
    <span
      className={joinClassNames(
        'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-bold',
        isEnd
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-100'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-300/10 dark:text-amber-100',
      )}
    >
      {isEnd ? '已完成' : '未完成'}
    </span>
  );
}

function SectionHeader({
  actions,
  count,
  icon,
  title,
}: {
  actions?: ReactNode;
  count: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#385772]/10 text-[#385772] dark:bg-emerald-200/10 dark:text-emerald-100">
          {icon}
        </span>
        <h2 className="text-base font-bold text-[#385772] dark:text-white">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {actions}
        <span className="rounded-md border border-zinc-200 bg-white/70 px-2.5 py-1 text-xs font-bold text-[#875A41] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70">
          {count}
        </span>
      </div>
    </header>
  );
}

function AddPunishmentDialog({
  onCancel,
  onSubmit,
  open,
}: {
  onCancel: () => void;
  onSubmit: (draft: LegacyPunishmentDraft) => Promise<void>;
  open: boolean;
}) {
  const [draft, setDraft] = useState<AddPunishmentFormState>(() => createDefaultPunishmentFormState());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(createDefaultPunishmentFormState());
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const updateDraft = <Key extends keyof AddPunishmentFormState>(
    key: Key,
    value: AddPunishmentFormState[Key],
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedDraft = normalizePunishmentFormState(draft);

    if (!normalizedDraft) {
      setError('请完整填写姓名、ID、原因、长度和开始时间');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedDraft);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-punishment-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 dark:bg-black/80"
      onClick={isSubmitting ? undefined : onCancel}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),34rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-100">
              <Plus size={17} />
            </span>
            <h2 id="add-punishment-dialog-title" className="text-base font-semibold">
              添加罚跑记录
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭"
            disabled={isSubmitting}
            onClick={onCancel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X size={17} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                姓名
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={draft.name}
                  onChange={(event) => updateDraft('name', event.target.value)}
                  className={punishmentInputClass}
                  autoComplete="off"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                ID
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={draft.username}
                  onChange={(event) => updateDraft('username', event.target.value)}
                  className={punishmentInputClass}
                  autoComplete="off"
                />
              </label>
            </div>

            <label className="grid gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              原因
              <textarea
                disabled={isSubmitting}
                value={draft.reason}
                onChange={(event) => updateDraft('reason', event.target.value)}
                className="min-h-20 w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                长度
                <select
                  disabled={isSubmitting}
                  value={draft.distance}
                  onChange={(event) => updateDraft('distance', event.target.value)}
                  className={punishmentInputClass}
                >
                  {PUNISHMENT_DISTANCE_OPTIONS.map((distance) => (
                    <option key={distance} value={String(distance)}>
                      {distance}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                开始时间
                <input
                  type="date"
                  disabled={isSubmitting}
                  value={draft.startDate}
                  onChange={(event) => updateDraft('startDate', event.target.value)}
                  className={punishmentInputClass}
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                职务加罚
                <span className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 transition dark:border-white/10 dark:bg-zinc-900 dark:text-white">
                  <input
                    type="checkbox"
                    disabled={isSubmitting}
                    checked={draft.addition}
                    onChange={(event) => updateDraft('addition', event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed"
                  />
                  是
                </span>
              </label>
            </div>

            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-100/20 dark:bg-rose-300/10 dark:text-rose-100">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className={punishmentSecondaryButtonClass}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={punishmentDangerButtonClass}
            >
              {isSubmitting ? '提交中...' : '确认添加'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function DataDisplayError({ message }: { message: string }) {
  return (
    <section className="card-surface scroll-mt-6 rounded-lg border border-zinc-200 px-4 py-8 text-center shadow-panel dark:border-zinc-800">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-400/10 dark:text-red-200">
          <AlertCircle size={19} />
        </span>
        <h2 className="text-base font-bold text-[#385772] dark:text-white">数据加载失败</h2>
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{message}</p>
      </div>
    </section>
  );
}

function DataDisplaySkeleton({ activePanel }: { activePanel: DataDisplayPanel }) {
  return (
    <article className="space-y-4" aria-busy="true">
      <DataDisplayActivityDecoration />

      <nav className="flex flex-wrap gap-2" aria-label="数据展示类型">
        <DataPanelButton
          active={activePanel === 'online'}
          icon={<Users size={15} />}
          label="当前在线"
          onClick={() => undefined}
        />
        <DataPanelButton
          active={activePanel === 'checkins'}
          icon={<CalendarCheck2 size={15} />}
          label="今日签到"
          onClick={() => undefined}
        />
        <DataPanelButton
          active={activePanel === 'checkin-ranking'}
          icon={<Trophy size={15} />}
          label="签到排行"
          onClick={() => undefined}
        />
        <DataPanelButton
          active={activePanel === 'punishments'}
          icon={<AlertCircle size={15} />}
          label="罚跑记录"
          onClick={() => undefined}
          tone="danger"
        />
      </nav>

      <section className="card-surface scroll-mt-6 overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
          <div className="flex items-center gap-2">
            <SkeletonLine className="h-8 w-8 rounded-md" />
            <SkeletonLine className="h-5 w-24" />
          </div>
          <SkeletonLine className="h-7 w-16" />
        </header>
        <div className="space-y-0 divide-y divide-zinc-200/80 dark:divide-white/10">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid min-w-[42rem] grid-cols-[1.1fr_0.7fr_1fr_1fr] gap-4 px-4 py-3">
              <SkeletonLine className="h-5 w-28" />
              <SkeletonLine className="h-5 w-16" />
              <SkeletonLine className="h-5 w-24" />
              <SkeletonLine className="h-5 w-20" />
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={joinClassNames(
        'animate-pulse rounded-md bg-zinc-200/75 dark:bg-white/[0.09]',
        className,
      )}
    />
  );
}

function formatClockTime(value: string) {
  if (!value.trim()) {
    return '—';
  }

  const match = value.match(/[T\s](\d{2}):(\d{2})/);

  return match ? `${match[1]}:${match[2]}` : formatPostTimestamp(value);
}

function getDataDisplayPanelFromParams(searchParams: URLSearchParams): DataDisplayPanel {
  const panel = searchParams.get('panel');

  if (panel === 'checkin-ranking' || panel === 'checkins' || panel === 'punishments') {
    return panel;
  }

  return 'online';
}

function getDataDisplayDateFromParams(searchParams: URLSearchParams) {
  const date = searchParams.get('date')?.trim() ?? '';

  return /^\d{4}-\d{1,2}-\d{1,2}$/.test(date) ? date : undefined;
}

function getDataDisplayBoardIdFromParams(searchParams: URLSearchParams) {
  const bid = Number(searchParams.get('bid'));

  return Number.isInteger(bid) && bid > 0 ? bid : null;
}

function getVisiblePunishmentRecords(
  records: LegacyDataDisplayPunishmentRecord[],
  showOnlyUnfinished: boolean,
  sortMode: PunishmentSortMode,
) {
  const filteredRecords = showOnlyUnfinished
    ? records.filter((record) => !record.isEnd)
    : records;

  return [...filteredRecords].sort(
    sortMode === 'name'
      ? comparePunishmentRecordsByName
      : comparePunishmentRecordsByNewestFirst,
  );
}

function comparePunishmentRecordsByName(
  left: LegacyDataDisplayPunishmentRecord,
  right: LegacyDataDisplayPunishmentRecord,
) {
  const nameDiff = punishmentNameCollator.compare(
    getPunishmentSortableName(left),
    getPunishmentSortableName(right),
  );

  if (nameDiff !== 0) {
    return nameDiff;
  }

  const usernameDiff = punishmentNameCollator.compare(left.username.trim(), right.username.trim());

  if (usernameDiff !== 0) {
    return usernameDiff;
  }

  return comparePunishmentRecordsByNewestFirst(left, right);
}

function getPunishmentSortableName(record: LegacyDataDisplayPunishmentRecord) {
  return record.name.trim() || record.username.trim();
}

function createDefaultPunishmentFormState(): AddPunishmentFormState {
  return {
    addition: false,
    distance: String(PUNISHMENT_DISTANCE_OPTIONS[0]),
    name: '',
    reason: '',
    startDate: getTodayDateInputValue(),
    username: '',
  };
}

function normalizePunishmentFormState(draft: AddPunishmentFormState): LegacyPunishmentDraft | null {
  const distance = Number(draft.distance);
  const name = draft.name.trim();
  const reason = draft.reason.trim();
  const startDate = draft.startDate.trim();
  const username = draft.username.trim();

  if (!name || !reason || !startDate || !username || !isPunishmentDistanceOption(distance)) {
    return null;
  }

  return {
    addition: draft.addition ? '1' : '0',
    distance: String(distance),
    name,
    reason,
    startDate,
    username,
  };
}

function isPunishmentDistanceOption(value: number): value is (typeof PUNISHMENT_DISTANCE_OPTIONS)[number] {
  return PUNISHMENT_DISTANCE_OPTIONS.some((option) => option === value);
}

function getTodayDateInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

function buildPunishmentAcademicYearGroups(records: LegacyDataDisplayPunishmentRecord[]) {
  const groups = records.reduce((nextGroups, record) => {
    const startYear = getPunishmentAcademicStartYear(record.startDate);
    const key = startYear === null ? 'unknown' : String(startYear);
    const existingGroup = nextGroups.get(key);

    if (existingGroup) {
      existingGroup.records.push(record);
      return nextGroups;
    }

    nextGroups.set(key, {
      key,
      records: [record],
      startYear,
      title: startYear === null ? '时间未明' : formatPunishmentAcademicYear(startYear),
    });

    return nextGroups;
  }, new Map<string, PunishmentAcademicYearGroup>());

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      records: [...group.records].sort(comparePunishmentRecordsByNewestFirst),
    }))
    .sort(comparePunishmentGroupsByNewestFirst);
}

function comparePunishmentGroupsByNewestFirst(
  left: PunishmentAcademicYearGroup,
  right: PunishmentAcademicYearGroup,
) {
  if (left.startYear === null && right.startYear === null) {
    return 0;
  }

  if (left.startYear === null) {
    return 1;
  }

  if (right.startYear === null) {
    return -1;
  }

  return right.startYear - left.startYear;
}

function comparePunishmentRecordsByNewestFirst(
  left: LegacyDataDisplayPunishmentRecord,
  right: LegacyDataDisplayPunishmentRecord,
) {
  const dateDiff = Date.parse(right.startDate) - Date.parse(left.startDate);

  if (Number.isFinite(dateDiff) && dateDiff !== 0) {
    return dateDiff;
  }

  return getPunishmentNumericId(right) - getPunishmentNumericId(left);
}

function getPunishmentAcademicStartYear(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return month >= 9 ? year : year - 1;
}

function getSafePunishmentPage(currentPage: number, totalGroups: number) {
  return Math.min(Math.max(1, totalGroups), Math.max(1, currentPage));
}

function getPunishmentNumericId(record: LegacyDataDisplayPunishmentRecord) {
  const id = Number(record.id);

  return Number.isFinite(id) ? id : 0;
}

function formatPunishmentAcademicYear(startYear: number) {
  return `${startYear}-${startYear + 1} 学年`;
}

function formatPunishmentDistance(value: string) {
  const distance = value.trim();

  return distance ? `${distance} km` : '—';
}

function formatPunishmentDate(value: string) {
  const date = value.trim();

  return date ? formatPostTimestamp(date) : '—';
}
