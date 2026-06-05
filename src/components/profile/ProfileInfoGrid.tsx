type ProfileInfoGridProps = {
  items: Array<{ label: string; value: string | number }>;
  columnsClassName?: string;
};

export function ProfileInfoGrid({ items, columnsClassName = 'grid-cols-2 sm:grid-cols-4' }: ProfileInfoGridProps) {
  return (
    <div className={`grid gap-2 ${columnsClassName}`}>
      {items.map((item) => (
        <section
          key={item.label}
          className="card-surface h-full min-w-0 rounded-lg border border-zinc-200 px-3 py-2 shadow-panel dark:border-zinc-800"
        >
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.label}</div>
          <div className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-zinc-950 dark:text-white">
            {item.value}
          </div>
        </section>
      ))}
    </div>
  );
}
