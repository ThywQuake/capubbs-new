import { useEffect, useState } from 'react';

const SIDEBAR_MINIMIZE_DURATION_MS = 300;

export function useSidebarState() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isSidebarMinimizing, setIsSidebarMinimizing] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarMinimizing(false);
    setIsSidebarMinimized(false);
    setIsSidebarCollapsed((value) => !value);
  };

  const minimizeSidebar = () => {
    if (isSidebarCollapsed && !isSidebarMinimized && !isSidebarMinimizing) {
      setIsSidebarMinimizing(true);
    }
  };

  const restoreMinimizedSidebar = () => {
    setIsSidebarMinimizing(false);
    setIsSidebarCollapsed(true);
    setIsSidebarMinimized(false);
  };

  const collapseSidebarForThread = () => {
    setIsSidebarMinimizing(false);
    setIsSidebarMinimized(false);
    setIsSidebarCollapsed(true);
  };

  const minimizeSidebarForThread = () => {
    setIsSidebarMinimizing(false);
    setIsSidebarCollapsed(true);
    setIsSidebarMinimized(true);
  };

  useEffect(() => {
    if (!isSidebarMinimizing) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsSidebarMinimized(true);
      setIsSidebarMinimizing(false);
    }, SIDEBAR_MINIMIZE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [isSidebarMinimizing]);

  return {
    collapseSidebarForThread,
    isSidebarCollapsed,
    isSidebarMinimized,
    isSidebarMinimizing,
    minimizeSidebar,
    minimizeSidebarForThread,
    restoreMinimizedSidebar,
    toggleSidebar,
  };
}
