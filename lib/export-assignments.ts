import { getAssignmentUrl, getSubmissionStatus } from "@/lib/assignment";
import { toPlainText } from "@/lib/html";
import type { Assignment, ClassInfo, FileActivitySubmission } from "@/types";

export type AssignmentExportFormat = "csv" | "json";

export interface AssignmentExportItem {
  assignment: Assignment;
  classInfo: ClassInfo;
}

interface AssignmentExportRecord {
  assignment: Assignment;
  assignmentUrl: string;
  class: ClassInfo;
  classUrl: string;
  status: ReturnType<typeof getSubmissionStatus>;
}

interface AssignmentExportDocument {
  assignments: AssignmentExportRecord[];
  count: number;
  exportedAt: string;
  source: "Assign Watch";
}

interface ExportFile {
  content: string;
  filename: string;
  mimeType: string;
}

const CSV_FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/u;
const NEWLINE = /\r?\n/gu;

const CSV_COLUMNS = [
  "assignment_id",
  "class_id",
  "class_title",
  "class_description",
  "class_section",
  "class_semester",
  "title",
  "description",
  "type",
  "group_type",
  "status",
  "start_date",
  "due_date",
  "created_at",
  "due_date_exceeded",
  "submitted_at",
  "submitted_late",
  "assignment_url",
  "class_url",
  "assignment_file_ids",
  "assignment_file_count",
  "submission_ids",
  "submission_descriptions",
  "submission_file_ids",
  "submission_files",
  "question_ids",
  "raw_assignment_json",
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];
type CsvRow = Record<CsvColumn, boolean | number | string>;

function getClassUrl(classId: number): string {
  return `https://app.leb2.org/class/${classId}/checkAfterAccessClass`;
}

function getExportDateStamp(now: Date): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortItems(items: AssignmentExportItem[]): AssignmentExportItem[] {
  return items.toSorted((left, right) => {
    const dueDateComparison =
      new Date(left.assignment.due_date).getTime() -
      new Date(right.assignment.due_date).getTime();
    if (dueDateComparison !== 0) {
      return dueDateComparison;
    }

    const classComparison = left.classInfo.title.localeCompare(
      right.classInfo.title
    );
    if (classComparison !== 0) {
      return classComparison;
    }

    return left.assignment.id - right.assignment.id;
  });
}

function toExportRecords(
  items: AssignmentExportItem[]
): AssignmentExportRecord[] {
  return sortItems(items).map(({ assignment, classInfo }) => ({
    assignment,
    assignmentUrl: getAssignmentUrl(assignment),
    class: classInfo,
    classUrl: getClassUrl(classInfo.id),
    status: getSubmissionStatus(assignment),
  }));
}

function getSubmissionFiles(assignment: Assignment): FileActivitySubmission[] {
  return (
    assignment.submissions?.flatMap(
      (submission) => submission.file_activity_submissions ?? []
    ) ?? []
  );
}

function getSubmittedAt(assignment: Assignment): string {
  const activitySubmittedAt = assignment.activity_submission_submitted_at?.date;
  if (activitySubmittedAt) {
    return activitySubmittedAt;
  }

  const submittedDates =
    assignment.submissions?.flatMap((submission) =>
      submission.submitted_at ? [submission.submitted_at] : []
    ) ?? [];
  return submittedDates.toSorted().at(-1) ?? "";
}

function joinValues(values: (number | string)[]): string {
  return values.filter((value) => value !== "").join(" | ");
}

function toCsvRow(record: AssignmentExportRecord): CsvRow {
  const { assignment, class: classInfo } = record;
  const submissionFiles = getSubmissionFiles(assignment);
  const submissions = assignment.submissions ?? [];

  return {
    assignment_file_count: assignment.fileactivities.length,
    assignment_file_ids: joinValues(assignment.fileactivities),
    assignment_id: assignment.id,
    assignment_url: record.assignmentUrl,
    class_description: toPlainText(classInfo.description),
    class_id: classInfo.id,
    class_section: classInfo.section,
    class_semester: classInfo.semester,
    class_title: classInfo.title,
    class_url: record.classUrl,
    created_at: assignment.created_at,
    description: toPlainText(assignment.description),
    due_date: assignment.due_date,
    due_date_exceeded: assignment.due_date_exceed,
    group_type: assignment.group_type,
    question_ids: joinValues(assignment.questions ?? []),
    raw_assignment_json: JSON.stringify(assignment),
    start_date: assignment.start_date,
    status: record.status,
    submission_descriptions: joinValues(
      submissions.map((submission) => toPlainText(submission.description))
    ),
    submission_file_ids: joinValues(
      submissionFiles.map((file) => file.file_id)
    ),
    submission_files: joinValues(
      submissionFiles.map((file) => file.display_name)
    ),
    submission_ids: joinValues(submissions.map((submission) => submission.id)),
    submitted_at: getSubmittedAt(assignment),
    submitted_late: assignment.activity_submission_is_late,
    title: assignment.title,
    type: assignment.type,
  };
}

function escapeCsvValue(value: boolean | number | string): string {
  let stringValue = String(value);

  if (CSV_FORMULA_PREFIX.test(stringValue)) {
    stringValue = `'${stringValue}`;
  }

  return `"${stringValue.replaceAll('"', '""').replace(NEWLINE, "\\n")}"`;
}

function createCsv(records: AssignmentExportRecord[]): string {
  const rows = records.map(toCsvRow);
  const lines = [
    CSV_COLUMNS.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      CSV_COLUMNS.map((column) => escapeCsvValue(row[column])).join(",")
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

function createJson(records: AssignmentExportRecord[], now: Date): string {
  const document: AssignmentExportDocument = {
    assignments: records,
    count: records.length,
    exportedAt: now.toISOString(),
    source: "Assign Watch",
  };
  return JSON.stringify(document, null, 2);
}

export function createAssignmentExport(
  items: AssignmentExportItem[],
  format: AssignmentExportFormat,
  now = new Date()
): ExportFile {
  const records = toExportRecords(items);
  const dateStamp = getExportDateStamp(now);

  if (format === "csv") {
    return {
      content: createCsv(records),
      filename: `assign-watch-${dateStamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
    };
  }

  return {
    content: createJson(records, now),
    filename: `assign-watch-${dateStamp}.json`,
    mimeType: "application/json;charset=utf-8",
  };
}

export function downloadTextFile({
  content,
  filename,
  mimeType,
}: ExportFile): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
