export type SidebarThreadCollapseMode = 'none' | 'collapsed' | 'minimized';

export type InterfaceSettings = {
  autoCollapseTopBarOnThread: boolean;
  autoExpandSidebarOnCollapsedOptionClick: boolean;
  alwaysShowCompactMode: boolean;
  enableFloatingThreadPreview: boolean;
  followSystemDarkMode: boolean;
  fontScale: number;
  listCompactMode: boolean;
  sidebarThreadCollapseMode: SidebarThreadCollapseMode;
  showThreadFloorDirectory: boolean;
  showThreadTitleInTopBar: boolean;
};
