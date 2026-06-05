import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLegacyBbs } from '../api/LegacyBbsDataContext';
import {
  fetchPanArchiveFolder,
  getPanArchiveExternalUrl,
  type ArchivePanFileKind,
  type ArchivePanNode,
  type ArchivePanNodeType,
} from '../api/archivePan';
import { getErrorMessage, isAbortError } from '../api/legacyBbsData/requestState';
import { joinClassNames } from '../utils/classNames';
import { canManageArchiveFiles } from '../utils/viewerPermissions';

type ArchiveNodeType = ArchivePanNodeType;
type ArchiveFileKind = ArchivePanFileKind;
type ArchiveNode = ArchivePanNode;

type ArchiveColumn = {
  depth: number;
  folder: ArchiveNode;
};

type ArchiveStatus = 'loading' | 'ready' | 'error';

const ARCHIVE_ROOT_ID = 'pan-archive-root';

const emptyArchiveTree: ArchiveNode = {
  children: [],
  id: ARCHIVE_ROOT_ID,
  isLoaded: false,
  isLoading: true,
  name: '档案室',
  type: 'folder',
};

export function ArchiveRoute() {
  const legacyBbs = useLegacyBbs();
  const canManage = canManageArchiveFiles(legacyBbs.viewer);
  const [archiveTree, setArchiveTree] = useState<ArchiveNode>(emptyArchiveTree);
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('loading');
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [folderPathIds, setFolderPathIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(ARCHIVE_ROOT_ID);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setArchiveStatus('loading');
    setArchiveError(null);
    setArchiveTree({ ...emptyArchiveTree });
    setFolderPathIds([]);
    setSelectedNodeId(ARCHIVE_ROOT_ID);

    fetchPanArchiveFolder(undefined, controller.signal)
      .then((tree) => {
        const initialFolderPathIds = getInitialFolderPathIds(tree);

        setArchiveTree(tree);
        setFolderPathIds(initialFolderPathIds);
        setSelectedNodeId(getInitialSelectedNodeId(tree, initialFolderPathIds));
        setArchiveStatus('ready');
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        setArchiveTree({
          ...emptyArchiveTree,
          error: getErrorMessage(error),
          isLoading: false,
        });
        setArchiveError(getErrorMessage(error));
        setArchiveStatus('error');
      });

    return () => controller.abort();
  }, [reloadKey]);

  const loadRemoteFolder = useCallback((folder: ArchiveNode) => {
    if (folder.type !== 'folder' || !folder.path || folder.isLoaded || folder.isLoading) {
      return;
    }

    const folderId = folder.id;

    setArchiveTree((tree) =>
      updateNode(tree, folderId, (node) => ({
        ...node,
        error: undefined,
        isLoading: true,
      })),
    );

    fetchPanArchiveFolder(folder.path)
      .then((remoteFolder) => {
        setArchiveTree((tree) =>
          updateNode(tree, folderId, (node) => ({
            ...node,
            children: remoteFolder.children ?? [],
            error: undefined,
            isLoaded: true,
            isLoading: false,
            sourceUrl: remoteFolder.sourceUrl ?? node.sourceUrl,
          })),
        );
      })
      .catch((error: unknown) => {
        setArchiveTree((tree) =>
          updateNode(tree, folderId, (node) => ({
            ...node,
            error: getErrorMessage(error),
            isLoading: false,
          })),
        );
      });
  }, []);

  const selectedNode = selectedNodeId ? findArchiveNode(archiveTree, selectedNodeId) : null;
  const currentFolder = getNodeByFolderPath(archiveTree, folderPathIds) ?? archiveTree;
  const pathNodes = getFolderPathNodes(archiveTree, folderPathIds);
  const columns = getArchiveColumns(archiveTree, folderPathIds);
  const folderCount = Math.max(0, countNodes(archiveTree, 'folder') - 1);
  const fileCount = countNodes(archiveTree, 'file');
  const pathLabel = pathNodes.map((node) => node.name).join(' / ');

  const selectNode = (node: ArchiveNode, depth: number) => {
    setSelectedNodeId(node.id);

    if (node.type === 'folder') {
      setFolderPathIds((currentPath) => [...currentPath.slice(0, depth), node.id]);
      loadRemoteFolder(node);
      return;
    }

    setFolderPathIds((currentPath) => currentPath.slice(0, depth));
  };

  const goBackMobile = () => {
    setFolderPathIds((currentPath) => currentPath.slice(0, -1));
    setSelectedNodeId(folderPathIds.length >= 2 ? folderPathIds[folderPathIds.length - 2] : ARCHIVE_ROOT_ID);
  };

  const refreshArchive = () => {
    setReloadKey((value) => value + 1);
  };

  const openPanArchive = () => {
    window.open(getPanArchiveExternalUrl(), '_blank', 'noopener,noreferrer');
  };

  const downloadSelectedNode = () => {
    if (!selectedNode || selectedNode.type !== 'file' || !selectedNode.downloadUrl) {
      return;
    }

    window.open(selectedNode.downloadUrl, '_blank', 'noopener,noreferrer');
    setArchiveTree((tree) =>
      updateNode(tree, selectedNode.id, (node) => ({
        ...node,
        downloads: (node.downloads ?? 0) + 1,
      })),
    );
  };

  return (
    <article className="space-y-4">
      <section className="card-surface overflow-hidden rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#385772]/10 text-[#385772] dark:bg-emerald-200/10 dark:text-emerald-100">
                <Archive size={18} />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-[#385772] dark:text-white sm:text-3xl">档案室</h1>
                <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  论坛网盘
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white/70 px-3 text-xs font-bold text-[#875A41] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70">
              {archiveStatus === 'loading' ? '读取中' : archiveStatus === 'error' ? '连接失败' : canManage ? '档案管理员' : '只读浏览'}
            </span>
            <ToolbarButton icon={<RefreshCw size={15} />} label="刷新" onClick={refreshArchive} />
            <ToolbarButton icon={<ExternalLink size={15} />} label="打开网盘" onClick={openPanArchive} />
          </div>
        </header>

        <div className="border-b border-zinc-200/80 px-4 py-3 dark:border-white/10 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              路径：<span className="text-[#385772] dark:text-white">{pathLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              <span>{folderCount} 个文件夹</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-white/30" />
              <span>{fileCount} 个文件</span>
            </div>
          </div>
        </div>

        {archiveError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100 sm:px-5">
            {archiveError}
          </div>
        ) : null}

        <div className="hidden overflow-x-auto lg:block">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(12rem, 1fr))`,
              minWidth: `${Math.max(columns.length, 4) * 12}rem`,
            }}
          >
            {columns.map((column) => (
              <ArchiveColumnView
                key={column.folder.id}
                column={column}
                folderPathIds={folderPathIds}
                selectedNodeId={selectedNodeId}
                onSelect={selectNode}
              />
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
            <button
              type="button"
              disabled={folderPathIds.length === 0}
              onClick={goBackMobile}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-bold text-[#385772] transition enabled:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            >
              <ChevronLeft size={16} />
              上级
            </button>
            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{currentFolder.name}</span>
          </div>
          <ArchiveColumnView
            column={{ depth: folderPathIds.length, folder: currentFolder }}
            folderPathIds={folderPathIds}
            selectedNodeId={selectedNodeId}
            onSelect={selectNode}
          />
        </div>
      </section>

      <ArchiveDetailPanel
        node={selectedNode}
        onDownload={downloadSelectedNode}
      />
    </article>
  );
}

function ArchiveColumnView({
  column,
  folderPathIds,
  selectedNodeId,
  onSelect,
}: {
  column: ArchiveColumn;
  folderPathIds: string[];
  selectedNodeId: string | null;
  onSelect: (node: ArchiveNode, depth: number) => void;
}) {
  const children = sortArchiveChildren(column.folder.children ?? []);

  return (
    <section className="min-h-[18rem] border-b border-zinc-200/80 dark:border-white/10 lg:border-b-0 lg:border-r">
      <header className="border-b border-zinc-200/80 bg-zinc-50/70 px-4 py-3 text-xs font-bold text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
        {column.folder.name}
      </header>
      <div className="divide-y divide-zinc-200/70 dark:divide-white/10">
        {column.folder.isLoading ? (
          <ArchiveColumnStatus icon={<RefreshCw className="animate-spin" size={16} />} label="正在读取真实网盘" />
        ) : column.folder.error ? (
          <ArchiveColumnStatus label={column.folder.error} />
        ) : children.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500">空文件夹</div>
        ) : (
          children.map((node) => {
            const isSelected = selectedNodeId === node.id || folderPathIds[column.depth] === node.id;
            const Icon = node.type === 'folder' ? Folder : getFileIcon(node.kind);

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelect(node, column.depth)}
                className={joinClassNames(
                  'flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
                  isSelected
                    ? 'bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100'
                    : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/[0.04]',
                )}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/70 text-[#385772] shadow-sm dark:bg-white/[0.08] dark:text-emerald-100">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{node.name}</span>
                  {node.type === 'file' ? (
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {node.size ?? node.uploadedBy ?? 'pan.chexie.net'}
                    </span>
                  ) : null}
                </span>
                {node.type === 'folder' ? <ChevronRight className="shrink-0 text-zinc-400" size={16} /> : null}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function ArchiveColumnStatus({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-8 text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ArchiveDetailPanel({
  node,
  onDownload,
}: {
  node: ArchiveNode | null;
  onDownload: () => void;
}) {
  if (!node) {
    return (
      <section className="card-surface rounded-lg border border-zinc-200 p-5 shadow-panel dark:border-zinc-800">
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">请选择文件或文件夹</p>
      </section>
    );
  }

  const Icon = node.type === 'folder' ? Folder : getFileIcon(node.kind);

  return (
    <section className="card-surface rounded-lg border border-zinc-200 shadow-panel dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200/80 px-4 py-4 dark:border-white/10 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#385772]/10 text-[#385772] dark:bg-emerald-200/10 dark:text-emerald-100">
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-[#385772] dark:text-white">{node.name}</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {node.type === 'folder' ? `${node.children?.length ?? 0} 个项目` : getKindLabel(node.kind)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {node.type === 'file' ? <ToolbarButton disabled={!node.downloadUrl} icon={<Download size={15} />} label="下载" onClick={onDownload} /> : null}
        </div>
      </div>

      <dl className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
        <DetailItem label="类型" value={node.type === 'folder' ? '文件夹' : getKindLabel(node.kind)} />
        <DetailItem label="大小" value={node.size ?? '--'} />
        <DetailItem label="上传" value={node.uploadedBy ?? '--'} />
        <DetailItem label="下载" value={typeof node.downloads === 'number' ? `${node.downloads} 次` : '--'} />
        <DetailItem label="更新" value={node.updatedAt ? formatArchiveTime(node.updatedAt) : '--'} />
      </dl>
    </section>
  );
}

function ToolbarButton({
  danger = false,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={joinClassNames(
        'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45',
        danger
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-400 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100 dark:hover:bg-red-400/15'
          : 'border-zinc-200 bg-white/70 text-[#385772] hover:bg-zinc-100 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 font-semibold text-zinc-700 dark:text-zinc-200">{value}</dd>
    </div>
  );
}

function getInitialFolderPathIds(root: ArchiveNode) {
  const firstFolder = root.children?.find((child) => child.type === 'folder');

  return firstFolder ? [firstFolder.id] : [];
}

function getInitialSelectedNodeId(root: ArchiveNode, folderPathIds: string[]) {
  const currentFolder = getNodeByFolderPath(root, folderPathIds);
  const firstChild = currentFolder?.children?.[0] ?? root.children?.[0];

  return currentFolder?.id ?? firstChild?.id ?? root.id;
}

function getArchiveColumns(root: ArchiveNode, folderPathIds: string[]): ArchiveColumn[] {
  const columns: ArchiveColumn[] = [{ depth: 0, folder: root }];
  let cursor = root;

  folderPathIds.forEach((folderId, index) => {
    const nextFolder = cursor.children?.find((child) => child.id === folderId && child.type === 'folder');

    if (!nextFolder) {
      return;
    }

    columns.push({ depth: index + 1, folder: nextFolder });
    cursor = nextFolder;
  });

  while (columns.length < 4) {
    columns.push({
      depth: columns.length,
      folder: {
        children: [],
        id: `empty-${columns.length}`,
        isLoaded: true,
        name: '',
        type: 'folder',
      },
    });
  }

  return columns;
}

function getFolderPathNodes(root: ArchiveNode, folderPathIds: string[]) {
  const path = [root];
  let cursor = root;

  folderPathIds.forEach((folderId) => {
    const nextFolder = cursor.children?.find((child) => child.id === folderId && child.type === 'folder');

    if (!nextFolder) {
      return;
    }

    path.push(nextFolder);
    cursor = nextFolder;
  });

  return path;
}

function getNodeByFolderPath(root: ArchiveNode, folderPathIds: string[]) {
  const pathNodes = getFolderPathNodes(root, folderPathIds);

  return pathNodes[pathNodes.length - 1] ?? root;
}

function findArchiveNode(root: ArchiveNode, nodeId: string): ArchiveNode | null {
  if (root.id === nodeId) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findArchiveNode(child, nodeId);

    if (found) {
      return found;
    }
  }

  return null;
}

function updateNode(root: ArchiveNode, nodeId: string, updater: (node: ArchiveNode) => ArchiveNode): ArchiveNode {
  if (root.id === nodeId) {
    return updater(root);
  }

  return {
    ...root,
    children: root.children?.map((child) => updateNode(child, nodeId, updater)),
  };
}

function sortArchiveChildren(children: ArchiveNode[]) {
  return [...children].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'zh-CN');
  });
}

function countNodes(root: ArchiveNode, type: ArchiveNodeType): number {
  const self = root.type === type ? 1 : 0;

  return self + (root.children ?? []).reduce((sum, child) => sum + countNodes(child, type), 0);
}

function getFileIcon(kind: ArchiveFileKind | undefined) {
  if (kind === 'zip') {
    return FileArchive;
  }

  if (kind === 'image') {
    return FileImage;
  }

  return FileText;
}

function getKindLabel(kind: ArchiveFileKind | undefined) {
  if (kind === 'route') {
    return '路线轨迹';
  }

  if (kind === 'zip') {
    return '压缩包';
  }

  if (kind === 'image') {
    return '图片';
  }

  if (kind === 'spreadsheet') {
    return '表格';
  }

  return '文档';
}

function formatArchiveTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}.${day} ${hour}:${minute}`;
}
