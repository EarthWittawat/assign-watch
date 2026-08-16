import { getAssignmentUrl } from "@/lib/assignment";
import type { Assignment, AssignmentFile } from "@/types";

const DOWNLOAD_ALL_LABEL = "download all files";
const DOWNLOAD_LINK_PATTERN = /download|attachment|file/iu;
const INVALID_FILENAME_CHARACTER = /[<>:"/\\|?*]/gu;
const MULTIPLE_SEPARATOR = /[-\s_]+/gu;
const QUERY_ID_KEYS = ["file_id", "fileId", "id"] as const;
const SCRIPT_PROTOCOL = ["java", "script:"].join("");

export type AssignmentFileDiscoveryStatus = "ok" | "no_files" | "unavailable";

export interface AssignmentFileDiscovery {
  files: AssignmentFile[];
  nativeDownload: boolean;
  status: AssignmentFileDiscoveryStatus;
}

function normalizeWhitespace(value: string): string {
  return value.replaceAll(/\s+/gu, " ").trim();
}

function sanitizeFilename(value: string, fallback: string): string {
  const sanitized = normalizeWhitespace(value)
    .replace(INVALID_FILENAME_CHARACTER, "-")
    .replace(MULTIPLE_SEPARATOR, "-")
    .replaceAll(/^\.+|\.+$/gu, "")
    .slice(0, 180);
  return sanitized || fallback;
}

function getNativeBundleFilename(assignment: Assignment): string {
  return sanitizeFilename(
    `${assignment.title}-files.zip`,
    `assignment-${assignment.id}-files.zip`
  );
}

function getFileId(url: URL, index: number): number {
  for (const key of QUERY_ID_KEYS) {
    const value = url.searchParams.get(key);
    if (value && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  const numericPathSegment = url.pathname
    .split("/")
    .findLast((segment) => /^\d+$/u.test(segment));
  if (numericPathSegment) {
    return Number(numericPathSegment);
  }

  return index + 1;
}

function getFilename(anchor: HTMLAnchorElement, index: number): string {
  const downloadName =
    typeof anchor.download === "string" ? anchor.download.trim() : "";
  const textName = normalizeWhitespace(anchor.textContent ?? "");
  const fallback = `attachment-${index + 1}`;

  return sanitizeFilename(downloadName || textName, fallback);
}

function isDownloadCandidate(anchor: HTMLAnchorElement): boolean {
  const text = normalizeWhitespace(anchor.textContent ?? "").toLowerCase();
  if (text === DOWNLOAD_ALL_LABEL) {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return true;
  }

  const href = anchor.getAttribute("href") ?? "";
  const metadata = [
    anchor.className,
    anchor.id,
    anchor.getAttribute("title") ?? "",
    anchor.getAttribute("aria-label") ?? "",
    href,
  ].join(" ");

  return DOWNLOAD_LINK_PATTERN.test(metadata);
}

export function extractAssignmentFiles(
  html: string,
  pageUrl: string
): AssignmentFile[] {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  const files: AssignmentFile[] = [];
  const seenUrls = new Set<string>();

  for (const [index, anchor] of [
    ...documentFragment.querySelectorAll<HTMLAnchorElement>("a[href]"),
  ].entries()) {
    if (!isDownloadCandidate(anchor)) {
      continue;
    }

    const href = anchor.getAttribute("href");
    const url = href ? new URL(href, pageUrl) : null;
    if (!url || href?.startsWith("#") || url.protocol === SCRIPT_PROTOCOL) {
      continue;
    }

    if (url.origin !== new URL(pageUrl).origin || seenUrls.has(url.href)) {
      continue;
    }

    seenUrls.add(url.href);
    files.push({
      downloadUrl: url.href,
      fileId: getFileId(url, index),
      name: getFilename(anchor, index),
    });
  }

  return files;
}

function getNativeDownloadAllUrl(html: string, pageUrl: string): string | null {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");

  for (const anchor of documentFragment.querySelectorAll<HTMLAnchorElement>(
    "a[href]"
  )) {
    const text = normalizeWhitespace(anchor.textContent ?? "").toLowerCase();
    if (text !== DOWNLOAD_ALL_LABEL) {
      continue;
    }

    const href = anchor.getAttribute("href");
    if (href) {
      return new URL(href, pageUrl).href;
    }
  }

  return null;
}

function isLoginResponse(response: Response): boolean {
  return (
    response.redirected &&
    !new URL(response.url).hostname.endsWith("app.leb2.org")
  );
}

export async function discoverAssignmentFiles(
  assignment: Assignment
): Promise<AssignmentFileDiscovery> {
  const pageUrl = getAssignmentUrl(assignment);
  const response = await fetch(pageUrl, {
    credentials: "include",
    redirect: "follow",
  });

  if (!response.ok || isLoginResponse(response)) {
    return { files: [], nativeDownload: false, status: "unavailable" };
  }

  const html = await response.text();
  const nativeDownloadUrl = getNativeDownloadAllUrl(html, pageUrl);
  if (nativeDownloadUrl) {
    return {
      files: [
        {
          downloadUrl: nativeDownloadUrl,
          fileId: assignment.id,
          name: getNativeBundleFilename(assignment),
        },
      ],
      nativeDownload: true,
      status: "ok",
    };
  }

  const files = extractAssignmentFiles(html, pageUrl);
  return {
    files,
    nativeDownload: false,
    status: files.length > 0 ? "ok" : "no_files",
  };
}

export function downloadAssignmentFiles(
  files: AssignmentFile[],
  onDownload: (file: AssignmentFile) => void = (file) => {
    window.open(file.downloadUrl, "_blank", "noopener,noreferrer");
  }
): number {
  for (const file of files) {
    onDownload(file);
  }
  return files.length;
}
