import { Check, ImagePlus, RotateCcw, Scissors, Upload, X } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

type AvatarEditorDialogProps = {
  currentAvatarSrc: string;
  defaultAvatarSrc: string;
  open: boolean;
  showUploadButton?: boolean;
  userId: string;
  onClose: () => void;
  onSave: (avatarSrc: string) => Promise<void> | void;
};

type DisplayMetrics = {
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  width: number;
};

type ResizeCorner = 'ne' | 'nw' | 'se' | 'sw';

type CropAreaBounds = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
};

type MoveDragState = {
  kind: 'move';
  pointerId: number;
  startCropX: number;
  startCropY: number;
  startPointerX: number;
  startPointerY: number;
};

type ResizeDragState = {
  corner: ResizeCorner;
  kind: 'resize';
  pointerId: number;
  startCropSize: number;
  startCropX: number;
  startCropY: number;
  startPointerX: number;
  startPointerY: number;
};

type DragState = MoveDragState | ResizeDragState;

const OUTPUT_SIZE = 320;
const WORKSPACE_SIZE = 360;
const MIN_CROP_SIZE = 48;
const DEFAULT_CROP_SIZE = WORKSPACE_SIZE;
const KEYBOARD_MOVE_STEP = 4;
const KEYBOARD_FAST_MOVE_STEP = 16;

const cornerHandles: Array<{
  corner: ResizeCorner;
  className: string;
  cursorClassName: string;
}> = [
  {
    corner: 'nw',
    className: '-left-3 -top-3 border-l-2 border-t-2',
    cursorClassName: 'cursor-nwse-resize',
  },
  {
    corner: 'ne',
    className: '-right-3 -top-3 border-r-2 border-t-2',
    cursorClassName: 'cursor-nesw-resize',
  },
  {
    corner: 'sw',
    className: '-bottom-3 -left-3 border-b-2 border-l-2',
    cursorClassName: 'cursor-nesw-resize',
  },
  {
    corner: 'se',
    className: '-bottom-3 -right-3 border-b-2 border-r-2',
    cursorClassName: 'cursor-nwse-resize',
  },
];

export function AvatarEditorDialog({
  currentAvatarSrc,
  defaultAvatarSrc,
  open,
  showUploadButton = true,
  userId,
  onClose,
  onSave,
}: AvatarEditorDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropBoxRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceViewportRef = useRef<HTMLDivElement | null>(null);
  const [sourceSrc, setSourceSrc] = useState(currentAvatarSrc);
  const [previewSrc, setPreviewSrc] = useState(currentAvatarSrc);
  const [fileName, setFileName] = useState('');
  const [isDefaultSelected, setIsDefaultSelected] = useState(currentAvatarSrc === defaultAvatarSrc);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [workspaceScale, setWorkspaceScale] = useState(1);
  const [cropSize, setCropSize] = useState(DEFAULT_CROP_SIZE);
  const [cropX, setCropX] = useState(70);
  const [cropY, setCropY] = useState(70);
  const [imageSize, setImageSize] = useState<{ naturalHeight: number; naturalWidth: number } | null>(null);
  const displayMetrics = useMemo(
    () => (imageSize ? getDisplayMetrics(imageSize.naturalWidth, imageSize.naturalHeight) : null),
    [imageSize],
  );
  const maxCropSize = displayMetrics ? getMaxCropSize(displayMetrics) : WORKSPACE_SIZE;
  const minCropSize = Math.min(MIN_CROP_SIZE, maxCropSize);
  const safeCropSize = getSafeCropSize(cropSize, minCropSize, maxCropSize);
  const cropAreaBounds = displayMetrics ? getCropAreaBounds(displayMetrics) : getWorkspaceAreaBounds();
  const cropPositionBounds = getCropPositionBounds(cropAreaBounds, safeCropSize);
  const safeCropX = clamp(cropX, cropPositionBounds.minX, cropPositionBounds.maxX);
  const safeCropY = clamp(cropY, cropPositionBounds.minY, cropPositionBounds.maxY);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSourceSrc(currentAvatarSrc);
    setPreviewSrc(currentAvatarSrc);
    setFileName('');
    setIsDefaultSelected(currentAvatarSrc === defaultAvatarSrc);
    setIsSaving(false);
    setStatus('');
    setCropSize(DEFAULT_CROP_SIZE);
    setCropX(70);
    setCropY(70);
    setImageSize(null);
    dragStateRef.current = null;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentAvatarSrc, defaultAvatarSrc, onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const workspaceElement = workspaceViewportRef.current;

    if (!workspaceElement) {
      return;
    }

    const updateWorkspaceScale = () => {
      const width = workspaceElement.getBoundingClientRect().width;

      setWorkspaceScale(width > 0 ? width / WORKSPACE_SIZE : 1);
    };

    updateWorkspaceScale();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWorkspaceScale);
      return () => window.removeEventListener('resize', updateWorkspaceScale);
    }

    const resizeObserver = new ResizeObserver(updateWorkspaceScale);
    resizeObserver.observe(workspaceElement);

    return () => resizeObserver.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) {
        return;
      }

      const nextImageSize = {
        naturalHeight: image.naturalHeight,
        naturalWidth: image.naturalWidth,
      };
      const nextMetrics = getDisplayMetrics(nextImageSize.naturalWidth, nextImageSize.naturalHeight);
      const centeredCrop = getCenteredCrop(nextMetrics);

      setImageSize(nextImageSize);
      setCropSize(centeredCrop.size);
      setCropX(centeredCrop.x);
      setCropY(centeredCrop.y);
      setStatus('');
    };
    image.onerror = () => {
      if (!cancelled) {
        setImageSize(null);
        setStatus('图片加载失败');
      }
    };
    image.src = sourceSrc;

    return () => {
      cancelled = true;
    };
  }, [open, sourceSrc]);

  useEffect(() => {
    if (!open || !displayMetrics) {
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (!cancelled) {
        redrawPreview(image, displayMetrics);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setStatus('图片加载失败');
      }
    };
    image.src = sourceSrc;

    return () => {
      cancelled = true;
    };
  }, [displayMetrics, open, safeCropSize, safeCropX, safeCropY, sourceSrc]);

  if (!open) {
    return null;
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setStatus('图片读取失败');
        return;
      }

      setSourceSrc(reader.result);
      setPreviewSrc(reader.result);
      setFileName(file.name);
      setIsDefaultSelected(false);
      setStatus('');
      resetCrop();
    };
    reader.onerror = () => setStatus('图片读取失败');
    reader.readAsDataURL(file);
  };

  const useDefaultAvatar = () => {
    setSourceSrc(defaultAvatarSrc);
    setPreviewSrc(defaultAvatarSrc);
    setFileName('');
    setIsDefaultSelected(true);
    setStatus('');
    resetCrop();
  };

  const resetCrop = () => {
    const centeredCrop = getCenteredCrop(displayMetrics);

    setCropSize(centeredCrop.size);
    setCropX(centeredCrop.x);
    setCropY(centeredCrop.y);
    dragStateRef.current = null;
  };

  const handleCropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      kind: 'move',
      pointerId: event.pointerId,
      startCropX: safeCropX,
      startCropY: safeCropY,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
    };
  };

  const handleResizePointerDown = (event: PointerEvent<HTMLSpanElement>, corner: ResizeCorner) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      corner,
      kind: 'resize',
      pointerId: event.pointerId,
      startCropSize: safeCropSize,
      startCropX: safeCropX,
      startCropY: safeCropY,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
    };
    cropBoxRef.current?.focus();
  };

  const handleCropPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - dragState.startPointerX) / workspaceScale;
    const deltaY = (event.clientY - dragState.startPointerY) / workspaceScale;

    if (dragState.kind === 'move') {
      setCropX(clamp(dragState.startCropX + deltaX, cropPositionBounds.minX, cropPositionBounds.maxX));
      setCropY(clamp(dragState.startCropY + deltaY, cropPositionBounds.minY, cropPositionBounds.maxY));
      return;
    }

    const nextCrop = getResizedCrop(dragState, deltaX, deltaY, cropAreaBounds, minCropSize);

    setCropSize(nextCrop.size);
    setCropX(nextCrop.x);
    setCropY(nextCrop.y);
  };

  const handleCropPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;

    if (dragState?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  };

  const handleCropKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const movementMap: Partial<Record<string, { x: number; y: number }>> = {
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
    };
    const movement = movementMap[event.key];

    if (!movement) {
      return;
    }

    event.preventDefault();

    const step = event.shiftKey ? KEYBOARD_FAST_MOVE_STEP : KEYBOARD_MOVE_STEP;

    setCropX(clamp(safeCropX + movement.x * step, cropPositionBounds.minX, cropPositionBounds.maxX));
    setCropY(clamp(safeCropY + movement.y * step, cropPositionBounds.minY, cropPositionBounds.maxY));
  };

  const saveAvatar = async () => {
    const nextAvatarSrc = isDefaultSelected ? defaultAvatarSrc : previewSrc;

    if (!nextAvatarSrc) {
      setStatus('请先完成裁切');
      return;
    }

    try {
      setIsSaving(true);
      setStatus(isDefaultSelected ? '正在保存头像' : '正在上传头像');
      await onSave(nextAvatarSrc);
      onClose();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '头像保存失败，请重试。');
    } finally {
      setIsSaving(false);
    }
  };

  function redrawPreview(image: HTMLImageElement, metrics: DisplayMetrics) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      setStatus('无法处理当前图片');
      return;
    }

    const cropOnImage = getCropOnImage(metrics, safeCropX, safeCropY, safeCropSize);

    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    if (cropOnImage.width > 0 && cropOnImage.height > 0) {
      context.drawImage(
        image,
        cropOnImage.x,
        cropOnImage.y,
        cropOnImage.width,
        cropOnImage.height,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
    }

    try {
      setPreviewSrc(canvas.toDataURL('image/png'));
    } catch {
      setStatus('无法保存当前裁切结果');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 backdrop-blur-[3px]">
      <button type="button" aria-label="关闭头像编辑窗口" className="absolute inset-0 cursor-default" onClick={isSaving ? undefined : onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-editor-title"
        className="card-surface relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 p-4 shadow-2xl dark:border-zinc-800"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
              <Scissors size={18} />
            </span>
            <h2 id="avatar-editor-title" className="text-base font-semibold text-[#385772] dark:text-white">
              加工头像
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭"
            disabled={isSaving}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem]">
          <div>
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 p-3 dark:border-white/10 dark:bg-white/[0.06]">
              <div
                ref={workspaceViewportRef}
                className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-md bg-zinc-200 touch-none select-none dark:bg-zinc-900"
              >
                <div
                  className="absolute left-0 top-0 origin-top-left"
                  style={{
                    height: WORKSPACE_SIZE,
                    transform: `scale(${workspaceScale})`,
                    width: WORKSPACE_SIZE,
                  }}
                >
                  {displayMetrics ? (
                    <img
                      src={sourceSrc}
                      alt=""
                      draggable={false}
                      className="absolute object-contain"
                      style={{
                        height: displayMetrics.height,
                        left: displayMetrics.offsetX,
                        top: displayMetrics.offsetY,
                        width: displayMetrics.width,
                      }}
                    />
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 bg-zinc-950/45" />
                  <div
                    ref={cropBoxRef}
                    aria-label={`${userId}的头像裁剪框`}
                    role="group"
                    tabIndex={0}
                    onKeyDown={handleCropKeyDown}
                    onPointerCancel={handleCropPointerEnd}
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerEnd}
                    className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.34)] outline-none ring-1 ring-zinc-950/15 focus-visible:ring-2 focus-visible:ring-[#385772]"
                    style={{
                      height: safeCropSize,
                      left: safeCropX,
                      top: safeCropY,
                      width: safeCropSize,
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {displayMetrics ? (
                        <img
                          src={sourceSrc}
                          alt=""
                          draggable={false}
                          className="absolute max-w-none object-contain"
                          style={{
                            height: displayMetrics.height,
                            left: displayMetrics.offsetX - safeCropX,
                            top: displayMetrics.offsetY - safeCropY,
                            width: displayMetrics.width,
                          }}
                        />
                      ) : null}
                      <span className="absolute inset-0 border border-white/70" />
                      <span className="absolute left-1/3 top-0 h-full w-px bg-white/45" />
                      <span className="absolute left-2/3 top-0 h-full w-px bg-white/45" />
                      <span className="absolute left-0 top-1/3 h-px w-full bg-white/45" />
                      <span className="absolute left-0 top-2/3 h-px w-full bg-white/45" />
                    </div>
                    {cornerHandles.map((handle) => (
                      <span
                        key={handle.corner}
                        aria-hidden="true"
                        className={`absolute h-8 w-8 border-white ${handle.className} ${handle.cursorClassName}`}
                        onPointerCancel={handleCropPointerEnd}
                        onPointerDown={(event) => handleResizePointerDown(event, handle.corner)}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerEnd}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          <aside className="flex flex-col gap-3">
            <div className="rounded-lg border border-zinc-200 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <img src={previewSrc} alt={`${userId}的头像预览`} className="aspect-square w-full rounded-full object-cover ring-1 ring-zinc-200 dark:ring-white/10" />
            </div>

            {showUploadButton ? (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-zinc-100 dark:hover:bg-white/[0.12]"
                >
                  <Upload size={15} />
                  上传图片
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={isSaving}
              onClick={useDefaultAvatar}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-zinc-100 dark:hover:bg-white/[0.12]"
            >
              <ImagePlus size={15} />
              默认头像
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={resetCrop}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.08] dark:text-zinc-100 dark:hover:bg-white/[0.12]"
            >
              <RotateCcw size={15} />
              重置裁切
            </button>

            <div className="min-h-5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {status || fileName}
            </div>
          </aside>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-white/10">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="h-9 rounded-md border border-zinc-200 bg-white/70 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={saveAvatar}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-800 px-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
          >
            <Check size={15} />
            {isSaving ? '保存中' : '保存头像'}
          </button>
        </div>
      </section>
    </div>
  );
}

function getDisplayMetrics(naturalWidth: number, naturalHeight: number): DisplayMetrics {
  const scale = Math.min(WORKSPACE_SIZE / naturalWidth, WORKSPACE_SIZE / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;

  return {
    height,
    offsetX: (WORKSPACE_SIZE - width) / 2,
    offsetY: (WORKSPACE_SIZE - height) / 2,
    scale,
    width,
  };
}

function getCropOnImage(metrics: DisplayMetrics, cropX: number, cropY: number, cropSize: number) {
  return {
    height: cropSize / metrics.scale,
    width: cropSize / metrics.scale,
    x: (cropX - metrics.offsetX) / metrics.scale,
    y: (cropY - metrics.offsetY) / metrics.scale,
  };
}

function getCenteredCrop(metrics: DisplayMetrics | null) {
  if (!metrics) {
    return {
      size: DEFAULT_CROP_SIZE,
      x: (WORKSPACE_SIZE - DEFAULT_CROP_SIZE) / 2,
      y: (WORKSPACE_SIZE - DEFAULT_CROP_SIZE) / 2,
    };
  }

  const maxSize = getMaxCropSize(metrics);
  const minSize = Math.min(MIN_CROP_SIZE, maxSize);
  const size = getSafeCropSize(maxSize, minSize, maxSize);

  return {
    size,
    x: metrics.offsetX + (metrics.width - size) / 2,
    y: metrics.offsetY + (metrics.height - size) / 2,
  };
}

function getMaxCropSize(metrics: DisplayMetrics) {
  return Math.max(1, Math.min(metrics.width, metrics.height));
}

function getCropAreaBounds(metrics: DisplayMetrics): CropAreaBounds {
  return {
    maxX: metrics.offsetX + metrics.width,
    maxY: metrics.offsetY + metrics.height,
    minX: metrics.offsetX,
    minY: metrics.offsetY,
  };
}

function getWorkspaceAreaBounds(): CropAreaBounds {
  return {
    maxX: WORKSPACE_SIZE,
    maxY: WORKSPACE_SIZE,
    minX: 0,
    minY: 0,
  };
}

function getCropPositionBounds(bounds: CropAreaBounds, cropSize: number) {
  return {
    maxX: bounds.maxX - cropSize,
    maxY: bounds.maxY - cropSize,
    minX: bounds.minX,
    minY: bounds.minY,
  };
}

function getResizedCrop(
  dragState: ResizeDragState,
  deltaX: number,
  deltaY: number,
  bounds: CropAreaBounds,
  minCropSize: number,
) {
  const horizontalSizeDelta = dragState.corner.endsWith('e') ? deltaX : -deltaX;
  const verticalSizeDelta = dragState.corner.startsWith('s') ? deltaY : -deltaY;
  const sizeDelta =
    Math.abs(horizontalSizeDelta) > Math.abs(verticalSizeDelta)
      ? horizontalSizeDelta
      : verticalSizeDelta;
  const maxCropSize = getMaxCropSizeForCorner(dragState, bounds);
  const size = getSafeCropSize(dragState.startCropSize + sizeDelta, minCropSize, maxCropSize);
  const right = dragState.startCropX + dragState.startCropSize;
  const bottom = dragState.startCropY + dragState.startCropSize;
  const x = dragState.corner.endsWith('e') ? dragState.startCropX : right - size;
  const y = dragState.corner.startsWith('s') ? dragState.startCropY : bottom - size;

  return { size, x, y };
}

function getMaxCropSizeForCorner(dragState: ResizeDragState, bounds: CropAreaBounds) {
  const right = dragState.startCropX + dragState.startCropSize;
  const bottom = dragState.startCropY + dragState.startCropSize;

  switch (dragState.corner) {
    case 'ne':
      return Math.min(bounds.maxX - dragState.startCropX, bottom - bounds.minY);
    case 'nw':
      return Math.min(right - bounds.minX, bottom - bounds.minY);
    case 'se':
      return Math.min(bounds.maxX - dragState.startCropX, bounds.maxY - dragState.startCropY);
    case 'sw':
      return Math.min(right - bounds.minX, bounds.maxY - dragState.startCropY);
  }
}

function getSafeCropSize(size: number, minSize: number, maxSize: number) {
  return clamp(size, minSize, maxSize);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
