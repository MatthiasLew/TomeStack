import { supabase, isSupabaseConfigured } from "./client";

export interface UserShelfRecord {
  user_id: string;
  book_id: string;
  edition_id: string;
  updated_at: string;
}

/**
 * Loads user owned books from Supabase if configured, otherwise returns null for local mock fallback.
 */
export async function loadUserShelfFromCloud(userId: string): Promise<Record<string, string> | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("user_books")
      .select("book_id, edition_id")
      .eq("user_id", userId);

    if (error) {
      console.warn("Error fetching shelf from Supabase:", error.message);
      return null;
    }

    const shelfMap: Record<string, string> = {};
    if (data && Array.isArray(data)) {
      data.forEach((row: { book_id: string; edition_id: string }) => {
        shelfMap[row.book_id] = row.edition_id;
      });
    }

    return shelfMap;
  } catch (err) {
    console.warn("Supabase shelf fetch exception:", err);
    return null;
  }
}

/**
 * Upserts a book edition to user's cloud shelf.
 */
export async function saveUserBookToCloud(
  userId: string,
  bookId: string,
  editionId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("user_books")
      .upsert({
        user_id: userId,
        book_id: bookId,
        edition_id: editionId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_id" });

    if (error) {
      console.warn("Error saving to Supabase shelf:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase save exception:", err);
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
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("user_books")
      .delete()
      .match({ user_id: userId, book_id: bookId });

    if (error) {
      console.warn("Error deleting from Supabase shelf:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase delete exception:", err);
    return false;
  }
}
