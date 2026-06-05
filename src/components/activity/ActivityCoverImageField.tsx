import { ImageIcon, Upload, X } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import type { ActivityCoverImage } from '../../utils/activitySignup';

type ActivityCoverImageFieldProps = {
  label?: string;
  onChange: (coverImage: ActivityCoverImage | null) => void;
  value: ActivityCoverImage | null;
};

export function ActivityCoverImageField({
  label = '活动封面图',
  onChange,
  value,
}: ActivityCoverImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      onChange({
        dataUrl: reader.result,
        meta: `${formatFileSize(file.size)} · 封面图`,
        name: file.name,
      });
    };

    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-bold text-[#385772] dark:text-white">
          <ImageIcon size={15} className="text-emerald-700/80 dark:text-emerald-100/80" />
          {label}
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-3 text-xs font-bold text-[#385772] transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
        >
          <Upload size={15} />
          {value ? '更换封面' : '上传封面'}
        </button>
      </div>

      {value ? (
        <div className="mt-3 grid gap-3 rounded-lg border border-zinc-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.05] sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center">
          <img
            src={value.dataUrl}
            alt="活动封面预览"
            className="aspect-[16/9] w-full rounded-md object-cover ring-1 ring-zinc-200 dark:ring-white/10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-800 dark:text-white">{value.name}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{value.meta}</p>
          </div>
          <button
            type="button"
            aria-label="移除活动封面图"
            onClick={() => onChange(null)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:text-zinc-300 dark:hover:bg-rose-300/10 dark:hover:text-rose-100"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">未上传封面。</p>
      )}
    </section>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
