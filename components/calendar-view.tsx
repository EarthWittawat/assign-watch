import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { i18n } from "#imports";
import { CalendarMonthView } from "@/components/calendar-month-view";
import { CalendarWeekView } from "@/components/calendar-week-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/date";
import { showCalendarByStorage } from "@/lib/storage";
import type { ShowCalendarBy } from "@/lib/storage";
import { useStorageState } from "@/lib/use-storage-state";
import type { Activity, ClassInfo } from "@/types";

const WEEK_STARTS_ON_SUNDAY = { weekStartsOn: 0 } as const;

interface CalendarViewProps {
  allAssignments: (Activity[] | undefined)[];
  allClassInfo: ClassInfo[];
  applyFilters: (assignment: Activity) => boolean;
  hiddenAssignments: number[];
}

export function CalendarView({
  allClassInfo,
  allAssignments,
  hiddenAssignments,
  applyFilters,
}: CalendarViewProps) {
  const [showCalendarBy, setShowCalendarBy] = useStorageState(
    showCalendarByStorage
  );

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();

  const currentWeek = addWeeks(now, weekOffset);
  const weekStart = startOfWeek(currentWeek, WEEK_STARTS_ON_SUNDAY);
  const weekEnd = endOfWeek(currentWeek, WEEK_STARTS_ON_SUNDAY);
  const daysInWeek = eachDayOfInterval({ end: weekEnd, start: weekStart });

  const currentMonth = addMonths(now, monthOffset);
  const calendarStart = startOfWeek(
    startOfMonth(currentMonth),
    WEEK_STARTS_ON_SUNDAY
  );
  const calendarEnd = endOfWeek(
    endOfMonth(currentMonth),
    WEEK_STARTS_ON_SUNDAY
  );
  const daysInMonth = eachDayOfInterval({
    end: calendarEnd,
    start: calendarStart,
  });

  const hiddenAssignmentIds = new Set(hiddenAssignments);
  const getAssignmentsForRange = (start: Date, end: Date) =>
    allAssignments.flat().filter((assignment): assignment is Activity => {
      if (!assignment) {
        return false;
      }
      if (hiddenAssignmentIds.has(assignment.id)) {
        return false;
      }
      if (!applyFilters(assignment)) {
        return false;
      }

      const dueDate = new Date(assignment.due_date);
      return dueDate >= start && dueDate <= end;
    });

  const thisWeekAssignments = getAssignmentsForRange(weekStart, weekEnd);
  const thisMonthAssignments = getAssignmentsForRange(
    calendarStart,
    calendarEnd
  );

  const assignmentsByDayWeek = daysInWeek.map((day) => ({
    assignments: thisWeekAssignments.filter((assignment) =>
      isSameDay(new Date(assignment.due_date), day)
    ),
    day,
  }));

  const assignmentsByDayMonth = daysInMonth.map((day) => ({
    assignments: thisMonthAssignments.filter((assignment) =>
      isSameDay(new Date(assignment.due_date), day)
    ),
    day,
  }));

  const getClassTitle = (classId: number) =>
    allClassInfo.find((c) => c.id === classId)?.title ?? undefined;

  const weekRangeLabel =
    formatDate(weekStart, "M") === formatDate(weekEnd, "M")
      ? formatDate(weekStart, "MMMM yyyy")
      : `${formatDate(weekStart, "MMM")} - ${formatDate(weekEnd, "MMM yyyy")}`;

  return (
    <Tabs
      className="flex h-full flex-col"
      onValueChange={(value) => setShowCalendarBy(value as ShowCalendarBy)}
      value={showCalendarBy}
    >
      <div className="grid grid-cols-3 items-center">
        <TabsList className="h-8 w-fit">
          <TabsTrigger className="text-xs" value="week">
            {i18n.t("weekly_view")}
          </TabsTrigger>
          <TabsTrigger className="text-xs" value="month">
            {i18n.t("monthly_view")}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center justify-center">
          {showCalendarBy === "week" ? (
            <>
              <Button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft />
                <span className="sr-only">{i18n.t("previous_week")}</span>
              </Button>
              <Button
                className="min-w-35 text-center"
                onClick={() => setWeekOffset(0)}
                title={
                  weekOffset === 0 ? undefined : i18n.t("go_to_current_week")
                }
                variant="ghost"
              >
                {weekRangeLabel}
              </Button>
              <Button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronRight />
                <span className="sr-only">{i18n.t("next_week")}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setMonthOffset((prev) => prev - 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft />
                <span className="sr-only">{i18n.t("previous_month")}</span>
              </Button>
              <Button
                className="min-w-35 text-center"
                onClick={() => setMonthOffset(0)}
                title={
                  monthOffset === 0 ? undefined : i18n.t("go_to_current_month")
                }
                variant="ghost"
              >
                {formatDate(currentMonth, "MMMM yyyy")}
              </Button>
              <Button
                onClick={() => setMonthOffset((prev) => prev + 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronRight />
                <span className="sr-only">{i18n.t("next_month")}</span>
              </Button>
            </>
          )}
        </div>
      </div>
      <TabsContent className="flex h-full flex-1 flex-col" value="week">
        <CalendarWeekView
          days={assignmentsByDayWeek}
          getClassTitle={getClassTitle}
        />
      </TabsContent>
      <TabsContent className="flex h-full flex-1 flex-col" value="month">
        <CalendarMonthView
          currentMonth={currentMonth}
          days={assignmentsByDayMonth}
          getClassTitle={getClassTitle}
          weekdays={daysInWeek}
        />
      </TabsContent>
    </Tabs>
  );
}
