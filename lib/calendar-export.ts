import { getAssignmentUrl, isSubmitted } from "@/lib/assignment";
import type { AssignmentExportItem } from "@/lib/export-assignments";
import { toPlainText } from "@/lib/html";

interface CalendarExportFile {
  content: string;
  filename: string;
  mimeType: "text/calendar;charset=utf-8";
}

const ICS_LINE_BREAK = "\r\n";
/** Give each deadline a one-hour block ending at the due time. */
const EVENT_DURATION_MS = 60 * 60 * 1000;

function getDateStamp(now: Date): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIcsDate(date: Date): string {
  return date
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/u, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r?\n/gu, "\\n");
}

function foldIcsLine(line: string): string[] {
  const maxBytes = 75;
  const chunks: string[] = [];
  let currentChunk = "";
  let currentBytes = 0;
  const encoder = new TextEncoder();

  for (const character of line) {
    const characterBytes = encoder.encode(character).length;
    if (currentChunk && currentBytes + characterBytes > maxBytes) {
      chunks.push(currentChunk);
      currentChunk = ` ${character}`;
      currentBytes = 1 + characterBytes;
      continue;
    }

    currentChunk += character;
    currentBytes += characterBytes;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function serializeIcs(lines: string[]): string {
  return `${lines.flatMap(foldIcsLine).join(ICS_LINE_BREAK)}${ICS_LINE_BREAK}`;
}

function sortItems(items: AssignmentExportItem[]): AssignmentExportItem[] {
  return items.toSorted(
    (left, right) =>
      new Date(left.assignment.due_date).getTime() -
        new Date(right.assignment.due_date).getTime() ||
      left.assignment.id - right.assignment.id
  );
}

export function createCalendarExport(
  items: AssignmentExportItem[],
  now = new Date()
): CalendarExportFile {
  const timestamp = toIcsDate(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//Assign Watch//Assignment Deadlines//EN",
    "X-WR-CALNAME:Assign Watch Deadlines",
  ];

  for (const { assignment, classInfo } of sortItems(items)) {
    const dueDate = new Date(assignment.due_date);
    if (Number.isNaN(dueDate.getTime())) {
      continue;
    }

    const assignmentUrl = getAssignmentUrl(assignment);
    const startDate = new Date(dueDate.getTime() - EVENT_DURATION_MS);
    const done = isSubmitted(assignment);
    const descriptionParts = [
      toPlainText(assignment.description),
      `Class: ${classInfo.title}`,
      `Type: ${assignment.type}`,
      `Status: ${done ? "Submitted" : "Not submitted"}`,
      `LEB2: ${assignmentUrl}`,
    ].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:assign-watch-${assignment.class_id}-${assignment.id}@leb2.org`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${toIcsDate(startDate)}`,
      `DTEND:${toIcsDate(dueDate)}`,
      `SUMMARY:${escapeIcsText(`[${classInfo.title}] ${assignment.title}`)}`,
      `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n"))}`,
      `URL:${assignmentUrl}`,
      `CATEGORIES:${escapeIcsText(assignment.type === "ASM" ? "Assignment" : "Quiz")}`,
      `STATUS:${done ? "CONFIRMED" : "TENTATIVE"}`,
      "TRANSP:TRANSPARENT"
    );

    // Only remind for work that is still outstanding, mirroring the extension's
    // own 24h / 1h due-soon notifications.
    if (!done) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcsText(`Due in 24 hours: ${assignment.title}`)}`,
        "TRIGGER:-P1D",
        "END:VALARM",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcsText(`Due in 1 hour: ${assignment.title}`)}`,
        "TRIGGER:-PT1H",
        "END:VALARM"
      );
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return {
    content: serializeIcs(lines),
    filename: `assign-watch-deadlines-${getDateStamp(now)}.ics`,
    mimeType: "text/calendar;charset=utf-8",
  };
}
