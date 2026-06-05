import type { ThreadAttachment, ThreadDetail, ThreadFloor } from '../types/forum';

const THREAD_EDIT_STORAGE_KEY = 'capubbs-thread-floor-edits';

export type ThreadFloorEditPayload = {
  attachments?: ThreadAttachment[];
  content: string[];
  editedAt: string;
  title?: string;
};

type ThreadEditStorage = Record<string, Record<string, ThreadFloorEditPayload>>;

export function saveThreadFloorEdit(threadId: string, floorNumber: number, payload: ThreadFloorEditPayload) {
  const storage = readThreadEditStorage();
  const normalizedThreadId = threadId.trim();

  storage[normalizedThreadId] = {
    ...(storage[normalizedThreadId] ?? {}),
    [String(floorNumber)]: payload,
  };

  writeThreadEditStorage(storage);
}

export function applyThreadEditOverrides(thread: ThreadDetail) {
  const overrides = readThreadEditStorage()[thread.id];

  if (!overrides) {
    return thread;
  }

  const mainPostOverride = overrides[String(thread.mainPost.floor)];
  const mainPost = applyFloorEditOverride(thread.mainPost, mainPostOverride);
  const floors = thread.floors.map((floor) => applyFloorEditOverride(floor, overrides[String(floor.floor)]));
  const title = mainPostOverride?.title?.trim() || thread.title;

  if (title === thread.title && mainPost === thread.mainPost && floors.every((floor, index) => floor === thread.floors[index])) {
    return thread;
  }

  return {
    ...thread,
    floors,
    mainPost,
    title,
  };
}

function applyFloorEditOverride(floor: ThreadFloor, override?: ThreadFloorEditPayload) {
  if (!override) {
    return floor;
  }

  return {
    ...floor,
    attachments: override.attachments ?? floor.attachments,
    content: override.content.length > 0 ? override.content : floor.content,
    editedAt: override.editedAt,
  };
}

function readThreadEditStorage(): ThreadEditStorage {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(THREAD_EDIT_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : {};

    return sanitizeThreadEditStorage(parsedValue);
  } catch {
    return {};
  }
}

function writeThreadEditStorage(storage: ThreadEditStorage) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THREAD_EDIT_STORAGE_KEY, JSON.stringify(storage));
}

function sanitizeThreadEditStorage(value: unknown): ThreadEditStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<ThreadEditStorage>((storage, [threadId, floorEntries]) => {
    if (!floorEntries || typeof floorEntries !== 'object' || Array.isArray(floorEntries)) {
      return storage;
    }

    const sanitizedFloors = Object.entries(floorEntries).reduce<Record<string, ThreadFloorEditPayload>>(
      (floors, [floorNumber, payload]) => {
        const sanitizedPayload = sanitizeThreadFloorEditPayload(payload);

        if (sanitizedPayload) {
          floors[floorNumber] = sanitizedPayload;
        }

        return floors;
      },
      {},
    );

    if (Object.keys(sanitizedFloors).length > 0) {
      storage[threadId] = sanitizedFloors;
    }

    return storage;
  }, {});
}

function sanitizeThreadFloorEditPayload(value: unknown): ThreadFloorEditPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const payload = value as Partial<ThreadFloorEditPayload>;
  const content = Array.isArray(payload.content)
    ? payload.content.filter((paragraph): paragraph is string => typeof paragraph === 'string')
    : [];
  const editedAt = typeof payload.editedAt === 'string' ? payload.editedAt : '';

  if (!editedAt) {
    return null;
  }

  return {
    content,
    editedAt,
    ...(Array.isArray(payload.attachments)
      ? {
          attachments: payload.attachments.filter(isThreadAttachment),
        }
      : {}),
    ...(typeof payload.title === 'string' ? { title: payload.title } : {}),
  };
}

function isThreadAttachment(value: unknown): value is ThreadAttachment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const attachment = value as Partial<ThreadAttachment>;

  return (
    typeof attachment.href === 'string' &&
    typeof attachment.meta === 'string' &&
    typeof attachment.name === 'string'
  );
}
