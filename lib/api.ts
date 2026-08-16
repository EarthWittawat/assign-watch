import { scrapeUserId } from "@/lib/dom";
import type { Activity, Assignment, RootResponse } from "@/types";

/**
 * Only activities with a real `due_date` are surfaced anywhere in the app: the
 * list, the calendar, notifications, and exports all assume one exists. This
 * narrows to {@link Assignment} so the rest of the codebase never has to null
 * check `due_date`.
 */
function hasDueDate(activity: Activity): activity is Assignment {
  return typeof activity.due_date === "string" && activity.due_date.length > 0;
}

export async function fetchAssignments(
  classId: number,
  userId?: string
): Promise<Assignment[]> {
  const finalUserId = userId ?? scrapeUserId();
  const res = await fetch(
    `https://app.leb2.org/api/get/assessment-activities/student?class_id=${classId}&student_id=${finalUserId}&filter_groups[0][filters][0][key]=class_id&filter_groups[0][filters][0][value]=${classId}&sort[]=sequence&sort[]=id&select[]=activities:id,user_id,class_id,adv_starred,group_type,type,peer_assessment,is_allow_repeat,title,description,start_date,due_date,edit_group_mode,created_at&select[]=user:id,firstname_en,lastname_en,firstname_th,lastname_th&includes[]=user:sideload&includes[]=fileactivities:ids&includes[]=questions:ids`
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch assignments for class ${classId}: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as RootResponse;
  return data.activities.filter(hasDueDate);
}
