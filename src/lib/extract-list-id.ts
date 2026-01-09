/**
 * Extract an X/Twitter list ID from a list URL or raw list ID.
 *
 * @param input List URL or list ID.
 * @returns List ID or null when invalid.
 */

const LIST_URL_REGEX = /(?:twitter\.com|x\.com)\/i\/lists\/(\d+)/i;
const LIST_ID_REGEX = /^\d{5,}$/;

export function extractListId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const urlMatch = LIST_URL_REGEX.exec(trimmed);
  if (urlMatch) {
    return urlMatch[1];
  }
  if (LIST_ID_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}
