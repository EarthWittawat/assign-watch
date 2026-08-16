import { CalendarPlus, Download, FileJson, Sheet } from "lucide-react";
import { useState } from "react";

import { i18n } from "#imports";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createCalendarExport } from "@/lib/calendar-export";
import {
  createAssignmentExport,
  downloadTextFile,
} from "@/lib/export-assignments";
import type {
  AssignmentExportFormat,
  AssignmentExportItem,
} from "@/lib/export-assignments";
import type { Assignment, ClassInfo } from "@/types";

interface AssignmentExportProps {
  allAssignments: (Assignment[] | undefined)[];
  allClassInfo: ClassInfo[];
  isLoading: boolean;
}

function collectExportItems(
  allAssignments: (Assignment[] | undefined)[],
  allClassInfo: ClassInfo[]
): AssignmentExportItem[] {
  const items: AssignmentExportItem[] = [];
  const seenAssignmentKeys = new Set<string>();

  for (const [index, assignments] of allAssignments.entries()) {
    const classInfo = allClassInfo[index];
    if (!(classInfo && assignments)) {
      continue;
    }

    for (const assignment of assignments) {
      const assignmentKey = `${assignment.class_id}:${assignment.id}`;
      if (seenAssignmentKeys.has(assignmentKey)) {
        continue;
      }

      seenAssignmentKeys.add(assignmentKey);
      items.push({ assignment, classInfo });
    }
  }

  return items;
}

export function AssignmentExport({
  allAssignments,
  allClassInfo,
  isLoading,
}: AssignmentExportProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const exportItems = collectExportItems(allAssignments, allClassInfo);
  const isDisabled = isLoading || exportItems.length === 0;

  const runExport = (format: AssignmentExportFormat) => {
    setErrorMessage("");
    try {
      downloadTextFile(createAssignmentExport(exportItems, format));
    } catch {
      setErrorMessage(i18n.t("export_failed"));
    }
  };

  const exportCalendar = () => {
    setErrorMessage("");
    try {
      downloadTextFile(createCalendarExport(exportItems));
    } catch {
      setErrorMessage(i18n.t("export_failed"));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isDisabled}
        render={
          <Button
            title={isDisabled ? i18n.t("export_unavailable") : undefined}
            variant="secondary"
          >
            <Download data-icon="inline-start" />
            {i18n.t("export")}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {i18n.t("export_all_assignments")}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => runExport("csv")}>
            <Sheet />
            {i18n.t("export_csv")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => runExport("json")}>
            <FileJson />
            {i18n.t("export_json")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>{i18n.t("calendar_export")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={exportCalendar}>
            <CalendarPlus />
            {i18n.t("export_google_calendar")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {errorMessage ? (
          <>
            <DropdownMenuSeparator />
            <p className="px-1.5 py-1 text-destructive text-xs" role="alert">
              {errorMessage}
            </p>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
