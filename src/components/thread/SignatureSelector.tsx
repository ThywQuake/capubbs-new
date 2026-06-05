import { FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLegacyXmlUserProfileRow } from '../../api/legacyBbsClient/legacyXmlProfile';
import { useSignatureSourcePreview } from '../../hooks/useSignatureSourcePreview';
import { joinClassNames } from '../../utils/classNames';
import { getLegacySignatureExcerpt, getLegacySignatureFloorReferenceHref, translateLegacySignatureHtml } from '../../utils/legacySignature';

export type LegacySignatureOption = {
  excerpt: string;
  html: string;
  index: number;
  isEmpty: boolean;
  sourceHref?: string;
};

export type SignatureLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

type LegacySignatureProfile = {
  sig1?: unknown;
  sig2?: unknown;
  sig3?: unknown;
};

type SignatureSelectorProps = {
  disabled?: boolean;
  id: string;
  onChange: (value: number) => void;
  options: LegacySignatureOption[];
  status: SignatureLoadStatus;
  value: number;
};

const SIGNATURE_INDEXES = [1, 2, 3] as const;

export function useLegacySignatureOptions(username: string | null | undefined) {
  const [options, setOptions] = useState<LegacySignatureOption[]>(() => createFallbackSignatureOptions());
  const [status, setStatus] = useState<SignatureLoadStatus>('idle');

  useEffect(() => {
    const normalizedUsername = username?.trim();

    if (!normalizedUsername) {
      setOptions(createFallbackSignatureOptions());
      setStatus('idle');
      return;
    }

    const abortController = new AbortController();

    setStatus('loading');
    fetchLegacyXmlUserProfileRow(normalizedUsername, abortController.signal)
      .then((profileRow) => {
        setOptions(createSignatureOptions(profileRow));
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        setOptions(createFallbackSignatureOptions());
        setStatus('error');
      });

    return () => abortController.abort();
  }, [username]);

  return useMemo(() => ({ options, status }), [options, status]);
}

export function SignatureSelector({
  disabled = false,
  id,
  onChange,
  options,
  status,
  value,
}: SignatureSelectorProps) {
  const normalizedOptions = options.length > 0 ? options : createFallbackSignatureOptions();
  const selectedIndex = normalizeSignatureIndex(value) || normalizedOptions[0]?.index || 1;
  const selectedOption = getSignatureOptionByIndex(normalizedOptions, selectedIndex);
  const isSignatureEnabled = normalizeSignatureIndex(value) > 0;
  const statusLabel = getStatusLabel(status);
  const signatureSourceState = useSignatureSourcePreview(
    isSignatureEnabled ? selectedOption?.sourceHref ?? '' : '',
  );
  const signatureSource = signatureSourceState.preview;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm font-bold text-[#385772] dark:text-white">
          <input
            type="checkbox"
            checked={isSignatureEnabled}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked ? selectedIndex : 0)}
            className="h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-zinc-900 dark:focus:ring-emerald-200"
          />
          <span className="inline-flex items-center gap-2">
            <FileText size={15} className="text-emerald-700/80 dark:text-emerald-100/80" />
            使用签名档
          </span>
        </label>
        {statusLabel ? (
          <span
            className={joinClassNames(
              'rounded-full px-2 py-1 text-xs font-bold',
              status === 'error'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-300/10 dark:text-rose-100'
                : 'bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300',
            )}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>

      {isSignatureEnabled ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] sm:items-center">
          <label className="sr-only" htmlFor={id}>
            选择签名档
          </label>
          <select
            id={id}
            value={selectedIndex}
            disabled={disabled}
            onChange={(event) => onChange(Number.parseInt(event.currentTarget.value, 10))}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-bold text-[#385772] outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          >
            {normalizedOptions.map((signatureOption) => (
              <option key={signatureOption.index} value={signatureOption.index}>
                {getSignatureOptionLabel(signatureOption)}
              </option>
            ))}
          </select>
          <p className="min-w-0 truncate rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300">
            {selectedOption && !selectedOption.isEmpty ? selectedOption.excerpt : '当前签名档为空'}
          </p>
        </div>
      ) : null}

      {isSignatureEnabled && (signatureSource || signatureSourceState.isLoading || signatureSourceState.error) ? (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/55 p-3 dark:border-emerald-200/15 dark:bg-emerald-300/[0.06]">
          {signatureSource ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#875A41] dark:text-white/65">
                  链接楼层 · {signatureSource.title} #{signatureSource.floor} · {signatureSource.author}
                </span>
                <Link
                  to={signatureSource.path}
                  className="rounded-sm text-sm font-semibold text-teal-700 outline-none hover:text-teal-900 hover:underline focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-white"
                >
                  跳转到链接楼层 &gt;&gt;
                </Link>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300">
                {signatureSource.excerpt}
              </p>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold text-[#875A41] dark:text-white/65">
                链接楼层
              </span>
              <p className="mt-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300">
                {signatureSourceState.isLoading ? '读取链接楼层中...' : '这个链接指向的楼层暂时无法预览。'}
              </p>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function getSignatureOptionByIndex(options: LegacySignatureOption[], signatureIndex: number) {
  const normalizedIndex = normalizeSignatureIndex(signatureIndex);

  if (normalizedIndex <= 0) {
    return null;
  }

  return options.find((option) => option.index === normalizedIndex) ?? null;
}

export function normalizeSignatureIndex(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return SIGNATURE_INDEXES.includes(value as (typeof SIGNATURE_INDEXES)[number]) ? value : 0;
}

function createSignatureOptions(profile: LegacySignatureProfile): LegacySignatureOption[] {
  return SIGNATURE_INDEXES.map((signatureIndex) => {
    const rawSignature = getSignatureValueByIndex(profile, signatureIndex);
    const excerpt = getLegacySignatureExcerpt(rawSignature).trim();

    return {
      excerpt,
      html: translateLegacySignatureHtml(rawSignature),
      index: signatureIndex,
      isEmpty: rawSignature.trim().length === 0,
      sourceHref: getLegacySignatureFloorReferenceHref(rawSignature) || undefined,
    };
  });
}

function createFallbackSignatureOptions(): LegacySignatureOption[] {
  return SIGNATURE_INDEXES.map((signatureIndex) => ({
    excerpt: '',
    html: '',
    index: signatureIndex,
    isEmpty: true,
  }));
}

function getSignatureValueByIndex(profile: LegacySignatureProfile, signatureIndex: number) {
  const key = `sig${signatureIndex}` as keyof LegacySignatureProfile;
  const value = profile[key];

  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function getSignatureOptionLabel(option: LegacySignatureOption) {
  if (option.isEmpty) {
    return `签名档 ${option.index}（空）`;
  }

  const excerpt = option.excerpt.length > 18 ? `${option.excerpt.slice(0, 18)}...` : option.excerpt;

  return excerpt ? `签名档 ${option.index}：${excerpt}` : `签名档 ${option.index}`;
}

function getStatusLabel(status: SignatureLoadStatus) {
  if (status === 'loading') {
    return '读取签名档中';
  }

  if (status === 'error') {
    return '签名档读取失败';
  }

  return '';
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}
