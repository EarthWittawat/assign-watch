import { isSameDay } from "date-fns";

import type { SortState } from "@/lib/preferences";
import type { VisibleAssignment } from "@/lib/visible-assignments";
import type { Assignment, ClassInfo } from "@/types";

export interface ClassGroup {
  assignments: Assignment[];
  classInfo: ClassInfo;
}

export interface DateGroupEntry {
  assignments: Assignment[];
  date: string;
}

export interface DayEntry {
  assignments: Assignment[];
  day: Date;
}

export function sortAssignments(
  assignments: Assignment[],
  sortState: SortState
) {
  const field = sortState.sortBy === "postedDate" ? "start_date" : "due_date";
  return assignments.toSorted((a, b) => {
    const comparison =
      new Date(a[field]).getTime() - new Date(b[field]).getTime();
    return sortState.direction === "asc" ? comparison : -comparison;
  });
}

export function groupByClass(
  items: VisibleAssignment[],
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
  items: VisibleAssignment[],
  sortState: SortState
): DateGroupEntry[] {
  const sorted = sortAssignments(
    items.map((item) => item.assignment),
    sortState
  );

  const groups = new Map<string, Assignment[]>();
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

export function groupByDay(
  items: VisibleAssignment[],
  days: Date[]
): DayEntry[] {
  const buckets = new Map<number, Assignment[]>(days.map((day) => [+day, []]));

  for (const { assignment } of items) {
    const dueDate = new Date(assignment.due_date);
    const day = days.find((candidate) => isSameDay(dueDate, candidate));
    if (day) {
      buckets.get(+day)?.push(assignment);
    }
  }

  return days.map((day) => ({ assignments: buckets.get(+day) ?? [], day }));
}
