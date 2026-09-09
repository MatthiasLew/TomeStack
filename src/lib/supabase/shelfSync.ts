import { supabase, isSupabaseConfigured } from "./client";
import type { ReadingStatus } from "@/types";

export interface UserShelfRecord {
  user_id: string;
  book_id: string;
  edition_id: string;
  reading_status?: string;
  is_hidden?: boolean;
  updated_at: string;
}

export interface CloudShelfData {
  ownedBooks: Record<string, string>;
  readingStatus: Record<string, ReadingStatus>;
  hiddenBooks: Record<string, boolean>;
}

export interface QueuedSyncMutation {
  userId: string;
  bookId: string;
  type: "upsert" | "delete" | "reading_status" | "is_hidden";
  editionId?: string;
  readingStatus?: ReadingStatus;
  isHidden?: boolean;
  timestamp: number;
}

const SYNC_QUEUE_KEY = "tomestack_sync_queue";

function readQueue(): QueuedSyncMutation[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SYNC_QUEUE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSyncMutation[]) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue.slice(-50)));
    }
  } catch {
    // Ignore storage write failure
  }
}

function enqueueMutation(mutation: QueuedSyncMutation) {
  const queue = readQueue();
  queue.push(mutation);
  writeQueue(queue);
}

/**
 * Loads user owned books, reading status and hidden preferences from Supabase if configured.
 */
export async function loadUserShelfFromCloud(userId: string): Promise<CloudShelfData | null> {
  if (!isSupabaseConfigured || !supabase || userId.startsWith("local-")) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("user_books")
      .select("book_id, edition_id, reading_status, is_hidden")
      .eq("user_id", userId);

    if (error) {
      console.warn("Error fetching shelf from Supabase:", error.message);
      return null;
    }

    const ownedBooks: Record<string, string> = {};
    const readingStatus: Record<string, ReadingStatus> = {};
    const hiddenBooks: Record<string, boolean> = {};

    if (data && Array.isArray(data)) {
      data.forEach((row: { book_id: string; edition_id: string; reading_status?: string; is_hidden?: boolean }) => {
        if (row.edition_id) {
          ownedBooks[row.book_id] = row.edition_id;
        }
        if (row.reading_status && row.reading_status !== "unread") {
          readingStatus[row.book_id] = row.reading_status as ReadingStatus;
        }
        if (row.is_hidden) {
          hiddenBooks[row.book_id] = true;
        }
      });
    }

    return { ownedBooks, readingStatus, hiddenBooks };
  } catch (err) {
    console.warn("Supabase shelf fetch exception:", err);
    return null;
  }
}

/**
 * Upserts a book edition, reading status, and hidden preference to user's cloud shelf.
 */
export async function saveUserBookToCloud(
  userId: string,
  bookId: string,
  editionId: string,
  readingStatus?: ReadingStatus,
  isHidden?: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId.startsWith("local-")) {
    return false;
  }

  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      book_id: bookId,
      edition_id: editionId,
      updated_at: new Date().toISOString(),
    };
    if (readingStatus !== undefined) payload.reading_status = readingStatus;
    if (isHidden !== undefined) payload.is_hidden = isHidden;

    const { error } = await supabase
      .from("user_books")
      .upsert(payload, { onConflict: "user_id,book_id" });

    if (error) {
      console.warn("Error saving to Supabase shelf:", error.message);
      enqueueMutation({ userId, bookId, type: "upsert", editionId, readingStatus, isHidden, timestamp: Date.now() });
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase save exception:", err);
    enqueueMutation({ userId, bookId, type: "upsert", editionId, readingStatus, isHidden, timestamp: Date.now() });
    return false;
  }
}

/**
 * Updates reading status for a book in user's cloud shelf.
 */
export async function saveUserReadingStatusToCloud(
  userId: string,
  bookId: string,
  readingStatus: ReadingStatus,
  editionId: string = ""
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId.startsWith("local-")) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("user_books")
      .upsert({
        user_id: userId,
        book_id: bookId,
        edition_id: editionId,
        reading_status: readingStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_id" });

    if (error) {
      console.warn("Error updating reading status in Supabase:", error.message);
      enqueueMutation({ userId, bookId, type: "reading_status", readingStatus, editionId, timestamp: Date.now() });
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase reading status exception:", err);
    enqueueMutation({ userId, bookId, type: "reading_status", readingStatus, editionId, timestamp: Date.now() });
    return false;
  }
}

/**
 * Updates hidden status for a book in user's cloud shelf.
 */
export async function saveUserBookHiddenToCloud(
  userId: string,
  bookId: string,
  isHidden: boolean,
  editionId: string = ""
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId.startsWith("local-")) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("user_books")
      .upsert({
        user_id: userId,
        book_id: bookId,
        edition_id: editionId,
        is_hidden: isHidden,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_id" });

    if (error) {
      console.warn("Error updating hidden status in Supabase:", error.message);
      enqueueMutation({ userId, bookId, type: "is_hidden", isHidden, editionId, timestamp: Date.now() });
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase hidden status exception:", err);
    enqueueMutation({ userId, bookId, type: "is_hidden", isHidden, editionId, timestamp: Date.now() });
    return false;
  }
}

/**
 * Removes a book from user's cloud shelf.
 */
export async function removeUserBookFromCloud(
  userId: string,
  bookId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId.startsWith("local-")) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("user_books")
      .delete()
      .match({ user_id: userId, book_id: bookId });

    if (error) {
      console.warn("Error deleting from Supabase shelf:", error.message);
      enqueueMutation({ userId, bookId, type: "delete", timestamp: Date.now() });
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase delete exception:", err);
    enqueueMutation({ userId, bookId, type: "delete", timestamp: Date.now() });
    return false;
  }
}

/**
 * Flushes any queued sync mutations that failed while offline or during temporary network errors.
 */
export async function flushSyncQueue(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase || userId.startsWith("local-")) {
    return 0;
  }

  const queue = readQueue().filter((m) => m.userId === userId);
  if (queue.length === 0) return 0;

  let successful = 0;
  const remaining: QueuedSyncMutation[] = [];

  for (const item of queue) {
    try {
      let ok = false;
      if (item.type === "upsert" && item.editionId) {
        const { error } = await supabase.from("user_books").upsert({
          user_id: item.userId,
          book_id: item.bookId,
          edition_id: item.editionId,
          ...(item.readingStatus !== undefined ? { reading_status: item.readingStatus } : {}),
          ...(item.isHidden !== undefined ? { is_hidden: item.isHidden } : {}),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,book_id" });
        ok = !error;
      } else if (item.type === "reading_status" && item.readingStatus) {
        const { error } = await supabase.from("user_books").upsert({
          user_id: item.userId,
          book_id: item.bookId,
          edition_id: item.editionId || "",
          reading_status: item.readingStatus,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,book_id" });
        ok = !error;
      } else if (item.type === "is_hidden" && item.isHidden !== undefined) {
        const { error } = await supabase.from("user_books").upsert({
          user_id: item.userId,
          book_id: item.bookId,
          edition_id: item.editionId || "",
          is_hidden: item.isHidden,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,book_id" });
        ok = !error;
      } else if (item.type === "delete") {
        const { error } = await supabase.from("user_books").delete().match({ user_id: item.userId, book_id: item.bookId });
        ok = !error;
      }
      if (ok) successful++;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  const otherUsersQueue = readQueue().filter((m) => m.userId !== userId);
  writeQueue([...otherUsersQueue, ...remaining]);
  return successful;
}
