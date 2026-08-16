const HTML_TAG = /<[^>]*>/gu;
const MULTIPLE_WHITESPACE = /\s+/gu;

/**
 * Turns an HTML fragment (assignment/class descriptions arrive as HTML) into a
 * single line of plain text suitable for CSV cells, JSON values, and calendar
 * descriptions.
 *
 * Tags are always stripped so output is identical regardless of environment; a
 * DOMParser, when available, additionally decodes entities like `&amp;`.
 */
export function toPlainText(value: string): string {
  if (!value) {
    return "";
  }

  const decoded =
    typeof DOMParser === "undefined"
      ? value
      : (new DOMParser().parseFromString(value, "text/html").body.textContent ??
        value);

  return decoded
    .replace(HTML_TAG, " ")
    .replace(MULTIPLE_WHITESPACE, " ")
    .trim();
}
