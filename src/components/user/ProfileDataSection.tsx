import type { ProfileField, ProfileFieldKey } from '../../types/userCenter';
import { ProfileDataCard } from './ProfileDataCard';

type ProfileDataSectionProps = {
  details: ProfileField[];
  draft: Record<ProfileFieldKey, string>;
  isEditing: boolean;
  onDraftChange: (key: ProfileFieldKey, value: string) => void;
  stats: Array<{ label: string; value: string | number }>;
};

export function ProfileDataSection({ details, draft, isEditing, onDraftChange, stats }: ProfileDataSectionProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {details.map((item) => (
          <ProfileDataCard
            key={item.key}
            label={item.label}
            value={isEditing ? draft[item.key] : item.value}
            isEditing={isEditing}
            inputType={item.key === 'email' ? 'email' : 'text'}
            onChange={(value) => onDraftChange(item.key, value)}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {stats.map((item) => (
          <ProfileDataCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
}
