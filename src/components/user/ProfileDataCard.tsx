type ProfileDataCardProps = {
  label: string;
  value: string | number;
  isEditing?: boolean;
  inputType?: 'email' | 'text';
  onChange?: (value: string) => void;
};

export function ProfileDataCard({ label, value, isEditing = false, inputType = 'text', onChange }: ProfileDataCardProps) {
  return (
    <section className="card-surface h-full min-w-0 rounded-lg border border-zinc-200 px-3 py-2 shadow-panel dark:border-zinc-800">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      {isEditing ? (
        <input
          type={inputType}
          value={String(value)}
          onChange={(event) => onChange?.(event.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white/70 px-2 text-sm font-semibold text-zinc-950 outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        />
      ) : (
        <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-zinc-950 dark:text-white">
          {value}
        </div>
      )}
    </section>
  );
}
