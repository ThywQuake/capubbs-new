import { Bookmark, CalendarCheck2, FileText, MessageSquareText, PenLine, Quote } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UserCenterTab } from '../../types/userCenter';
import { SegmentedTabs } from '../common/SegmentedTabs';

export const userCenterTabs: Array<{ key: UserCenterTab; label: string; icon: ReactNode }> = [
  { key: 'posts', label: '发帖', icon: <FileText size={15} /> },
  { key: 'replies', label: '回复', icon: <MessageSquareText size={15} /> },
  { key: 'activities', label: '报名', icon: <CalendarCheck2 size={15} /> },
  { key: 'bookmarks', label: '收藏', icon: <Bookmark size={15} /> },
  { key: 'drafts', label: '草稿箱', icon: <PenLine size={15} /> },
  { key: 'signatures', label: '签名档', icon: <Quote size={15} /> },
];

type UserCenterTabsProps = {
  activeTab: UserCenterTab;
  onChange: (tab: UserCenterTab) => void;
  tabs?: Array<{ key: UserCenterTab; label: string; icon: ReactNode }>;
};

export function UserCenterTabs({ activeTab, onChange, tabs = userCenterTabs }: UserCenterTabsProps) {
  return (
    <SegmentedTabs activeKey={activeTab} ariaLabel="个人内容切换" options={tabs} onChange={onChange} />
  );
}
