import type { FeedTab } from '../../types/forum';
import { SegmentedTabs } from '../common/SegmentedTabs';

type FeedTabsProps = {
  activeTab: FeedTab;
  onChange: (tab: FeedTab) => void;
};

const tabs: Array<{ key: FeedTab; label: string }> = [
  { key: 'replies', label: '最新回帖' },
  { key: 'topics', label: '最新主题' },
];

export function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
  return (
    <SegmentedTabs activeKey={activeTab} ariaLabel="首页信息切换" options={tabs} onChange={onChange} />
  );
}
