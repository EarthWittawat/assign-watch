import type { FilterState } from "@/components/assignment-filters";
import type { SortState } from "@/components/assignment-sort";
import { getSubmissionStatus } from "@/lib/assignment";
import type { Activity, ClassInfo } from "@/types";

export interface FilteredAssignment {
  assignment: Activity;
  classInfo: ClassInfo;
}

export interface ClassGroup {
  assignments: Activity[];
  classInfo: ClassInfo;
}

export interface DateGroupEntry {
  assignments: Activity[];
  date: string;
}

export function passesFilters(assignment: Activity, filters: FilterState) {
  const status = getSubmissionStatus(assignment);

  const isSubmitted = status === "submitted" || status === "submitted_late";
  if (isSubmitted && !filters.submissionStatus.submitted) {
    return false;
  }
  if (!(isSubmitted || filters.submissionStatus.notSubmitted)) {
    return false;
  }

  const isAssignment = assignment.type === "ASM";
  if (isAssignment && !filters.assignmentType.assignment) {
    return false;
  }
  if (!(isAssignment || filters.assignmentType.quiz)) {
    return false;
  }

  const isIndividual = assignment.group_type === "IND";
  if (isIndividual && !filters.groupType.individual) {
    return false;
  }
  if (!(isIndividual || filters.groupType.group)) {
    return false;
  }

  return true;
}

export function sortAssignments(assignments: Activity[], sortState: SortState) {
  const field = sortState.sortBy === "postedDate" ? "start_date" : "due_date";
  return assignments.toSorted((a, b) => {
    const comparison =
      new Date(a[field]).getTime() - new Date(b[field]).getTime();
    return sortState.direction === "asc" ? comparison : -comparison;
  });
}

interface CollectParams {
  allClassInfo: ClassInfo[];
  data: (Activity[] | undefined)[];
  filters: FilterState;
  hiddenAssignments: number[];
  hiddenClasses: number[];
}

/** Flatten per-class query results into a single filtered list. */
export function collectAssignments({
  data,
  allClassInfo,
  hiddenClasses,
  hiddenAssignments,
  filters,
}: CollectParams): FilteredAssignment[] {
  const collected: FilteredAssignment[] = [];
  const hiddenClassIds = new Set(hiddenClasses);
  const hiddenAssignmentIds = new Set(hiddenAssignments);

  for (const [index, query] of data.entries()) {
    const classInfo = allClassInfo[index];
    if (hiddenClassIds.has(classInfo.id) || !query?.length) {
      continue;
    }

    for (const assignment of query) {
      // Skip assignments that are both past due and already submitted.
      const status = getSubmissionStatus(assignment);
      const isSubmitted = status === "submitted" || status === "submitted_late";
      if (assignment.due_date_exceed && isSubmitted) {
        continue;
      }
      if (hiddenAssignmentIds.has(assignment.id)) {
        continue;
      }
      if (!passesFilters(assignment, filters)) {
        continue;
      }
      collected.push({ assignment, classInfo });
    }
  }

  return collected;
}

export function groupByClass(
  items: FilteredAssignment[],
  sortState: SortState
): ClassGroup[] {
  const groups = new Map<number, ClassGroup>();

  for (const { assignment, classInfo } of items) {
    let group = groups.get(classInfo.id);
    if (!group) {
      group = { assignments: [], classInfo };
      groups.set(classInfo.id, group);
    }
    group.assignments.push(assignment);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    assignments: sortAssignments(group.assignments, sortState),
  }));
}

export function groupByDueDate(
  items: FilteredAssignment[],
  sortState: SortState
): DateGroupEntry[] {
  const sorted = sortAssignments(
    items.map((item) => item.assignment),
    sortState
  );

  const groups = new Map<string, Activity[]>();
  for (const assignment of sorted) {
    const [dateKey] = new Date(assignment.due_date).toISOString().split("T");
    const bucket = groups.get(dateKey);
    if (bucket) {
      bucket.push(assignment);
    } else {
      groups.set(dateKey, [assignment]);
    }
  }

  return [...groups.entries()]
    .toSorted(([a], [b]) => {
      const comparison = new Date(a).getTime() - new Date(b).getTime();
      return sortState.direction === "asc" ? comparison : -comparison;
    })
    .map(([date, assignments]) => ({ assignments, date }));
}
