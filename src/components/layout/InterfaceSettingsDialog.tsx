import { CircleDot, List, Monitor, PanelLeftClose, PanelLeftOpen, PanelTopClose, Settings2, Type, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import type { InterfaceSettings, SidebarThreadCollapseMode } from '../../types/interfaceSettings';
import { joinClassNames } from '../../utils/classNames';

type InterfaceSettingsDialogProps = {
  fontScaleMax: number;
  fontScaleMin: number;
  fontScaleStep: number;
  settings: InterfaceSettings;
  onChange: (settings: InterfaceSettings) => void;
  onClose: () => void;
};

export function InterfaceSettingsDialog({
  fontScaleMax,
  fontScaleMin,
  fontScaleStep,
  settings,
  onChange,
  onClose,
}: InterfaceSettingsDialogProps) {
  const updateSettings = (updates: Partial<InterfaceSettings>) => {
    onChange({
      ...settings,
      ...updates,
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="关闭界面设置"
        className="absolute inset-0 cursor-default border-0 bg-zinc-950/45 p-0 backdrop-blur-sm dark:bg-zinc-950/65"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="interface-settings-title"
        className="card-surface relative max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 p-4 shadow-2xl dark:border-zinc-800 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
              <Settings2 size={20} />
            </span>
            <div>
              <h2 id="interface-settings-title" className="text-base font-bold text-[#385772] dark:text-white">
                界面设置
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                调整阅读时的侧栏、顶栏、字号和暗黑模式。
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <SidebarCollapseSettingRow
            className="hidden lg:block"
            value={settings.sidebarThreadCollapseMode}
            onChange={(value) => updateSettings({ sidebarThreadCollapseMode: value })}
          />
          <SwitchSettingRow
            checked={settings.autoExpandSidebarOnCollapsedOptionClick}
            className="hidden lg:block"
            description="左侧栏已折叠时，点击首页、板块、数据展示等选项后自动恢复完整宽度。"
            icon={<PanelLeftOpen size={18} />}
            title="点击折叠侧栏选项后自动展开"
            onCheckedChange={(checked) => updateSettings({ autoExpandSidebarOnCollapsedOptionClick: checked })}
          />
          <SwitchSettingRow
            checked={settings.autoCollapseTopBarOnThread}
            description="打开帖子详情页时，自动收起顶部栏，保留上方的小型展开把手。"
            icon={<PanelTopClose size={18} />}
            title="进入帖子后自动折叠 Topbar"
            onCheckedChange={(checked) => updateSettings({ autoCollapseTopBarOnThread: checked })}
          />
          <SwitchSettingRow
            checked={settings.showThreadTitleInTopBar}
            description="在帖子详情页向上滚动时，顶栏切换为当前帖子标题；向下滚动恢复常规顶栏。"
            icon={<Type size={18} />}
            title="帖子内顶栏展示标题"
            onCheckedChange={(checked) => updateSettings({ showThreadTitleInTopBar: checked })}
          />
          <SwitchSettingRow
            checked={settings.enableFloatingThreadPreview}
            description="桌面端点击帖子正文里的站内帖子链接时，使用可拖拽悬浮窗口预览；关闭后直接跳转。"
            icon={<Monitor size={18} />}
            title="帖子链接悬浮窗口"
            onCheckedChange={(checked) => updateSettings({ enableFloatingThreadPreview: checked })}
          />
          <SwitchSettingRow
            checked={settings.showThreadFloorDirectory}
            description="帖子详情页右侧显示楼层圆点目录，悬停时预览该楼摘要。"
            icon={<CircleDot size={18} />}
            title="帖子楼层目录"
            onCheckedChange={(checked) => updateSettings({ showThreadFloorDirectory: checked })}
          />
          <SwitchSettingRow
            checked={settings.alwaysShowCompactMode}
            description="帖子列表、回帖列表和个人记录列表固定为只展示标题。"
            icon={<List size={18} />}
            title="总是展示紧凑模式"
            onCheckedChange={(checked) => updateSettings({ alwaysShowCompactMode: checked })}
          />
          <SwitchSettingRow
            checked={settings.followSystemDarkMode}
            description="开启后会跟随系统外观；使用顶栏明暗按钮会切回手动模式。"
            icon={<Monitor size={18} />}
            title="跟随系统暗黑模式"
            onCheckedChange={(checked) => updateSettings({ followSystemDarkMode: checked })}
          />

          <FontScaleSettingRow
            currentFontScale={settings.fontScale}
            maxFontScale={fontScaleMax}
            minFontScale={fontScaleMin}
            step={fontScaleStep}
            onChange={(fontScale) => updateSettings({ fontScale })}
          />
        </div>
      </section>
    </div>
  );
}

type SwitchSettingRowProps = {
  checked: boolean;
  className?: string;
  description: string;
  icon: ReactNode;
  title: string;
  onCheckedChange: (checked: boolean) => void;
};

type SidebarCollapseSettingRowProps = {
  className?: string;
  value: SidebarThreadCollapseMode;
  onChange: (value: SidebarThreadCollapseMode) => void;
};

type FontScaleSettingRowProps = {
  currentFontScale: number;
  maxFontScale: number;
  minFontScale: number;
  step: number;
  onChange: (fontScale: number) => void;
};

const sidebarCollapseModeOptions: Array<{
  description: string;
  label: string;
  value: SidebarThreadCollapseMode;
}> = [
  {
    description: '保持当前侧栏状态，不主动调整。',
    label: '不折叠',
    value: 'none',
  },
  {
    description: '进入帖子后收为图标栏。',
    label: '折叠',
    value: 'collapsed',
  },
  {
    description: '进入帖子后只保留底部恢复按钮。',
    label: '最小化',
    value: 'minimized',
  },
];

function FontScaleSettingRow({
  currentFontScale,
  maxFontScale,
  minFontScale,
  onChange,
  step,
}: FontScaleSettingRowProps) {
  const fontScaleOptions = getFontScaleOptions(minFontScale, maxFontScale, step);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          <Type size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#385772] dark:text-white">网页字号大小</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            选择后会影响全站主要文字、帖子卡片行距和左侧栏宽度。
          </p>
          <div role="radiogroup" aria-label="网页字号大小" className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
            {fontScaleOptions.map((fontScale, index) => {
              const selected = fontScale === currentFontScale;

              return (
                <button
                  key={fontScale}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`网页字号选项${index + 1}`}
                  onClick={() => onChange(fontScale)}
                  className={joinClassNames(
                    'flex min-h-12 items-center justify-center rounded-lg border px-1.5 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
                    selected
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-zinc-950'
                      : 'border-zinc-200 bg-white/60 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.1]',
                  )}
                >
                  <span
                    className="block font-bold leading-none"
                    style={{ fontSize: `${fontScale / currentFontScale}rem` }}
                  >
                    Aa
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function getFontScaleOptions(minFontScale: number, maxFontScale: number, step: number) {
  const optionCount = Math.floor((maxFontScale - minFontScale) / step) + 1;

  return Array.from({ length: optionCount }, (_, index) => minFontScale + index * step);
}

function SidebarCollapseSettingRow({
  className,
  value,
  onChange,
}: SidebarCollapseSettingRowProps) {
  return (
    <section
      className={joinClassNames(
        'rounded-lg border border-zinc-200 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          <PanelLeftClose size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#385772] dark:text-white">进入帖子后的左侧栏状态</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            选择打开帖子详情页时左侧栏如何自动处理。
          </p>
          <div
            role="radiogroup"
            aria-label="进入帖子后的左侧栏状态"
            className="mt-3 grid gap-2 sm:grid-cols-3"
          >
            {sidebarCollapseModeOptions.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(option.value)}
                  className={joinClassNames(
                    'rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
                    selected
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-900 dark:border-emerald-200 dark:bg-emerald-200 dark:text-zinc-950'
                      : 'border-zinc-200 bg-white/60 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.1]',
                  )}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 opacity-80">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SwitchSettingRow({
  checked,
  className,
  description,
  icon,
  title,
  onCheckedChange,
}: SwitchSettingRowProps) {
  return (
    <section
      className={joinClassNames(
        'rounded-lg border border-zinc-200 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#385772] dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          onClick={() => onCheckedChange(!checked)}
          className={joinClassNames(
            'mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]',
            checked
              ? 'border-emerald-800 bg-emerald-800 dark:border-emerald-200 dark:bg-emerald-200'
              : 'border-zinc-300 bg-zinc-200 dark:border-white/15 dark:bg-white/[0.12]',
          )}
        >
          <span
            className={joinClassNames(
              'h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-950',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
      </div>
    </section>
  );
}
