export interface ClassInfo {
  description: string;
  id: number;
  section: string;
  semester: string;
  title: string;
}

export interface RootResponse {
  activities: Activity[];
  user: User[];
}

export interface Activity {
  activity_group_id: null;
  activity_group_name: null;
  activity_submission_id: number;
  activity_submission_is_late: boolean;
  activity_submission_submitted_at: ActivitySubmissionSubmittedAt | null;
  adv_starred: number;
  class_id: number;
  class_user_id: number;
  count_group_member: number;
  created_at: string;
  description: string;
  due_date: null | string;
  due_date_exceed: boolean;
  edit_group_mode: string;
  fileactivities: number[];
  group_type: "IND" | "STU";
  id: number;
  is_allow_repeat: number;
  peer_assessment: number;
  questions: number[];
  quiz_submission_is_submitted: number;
  start_date: string;
  submissions?: Submission[];
  title: string;
  type: "ASM" | "QUZ";
  user: number;
  user_id: number;
}

/**
 * An {@link Activity} that is guaranteed to have a `due_date`. `fetchAssignments`
 * drops activities without one, so every assignment shown, notified, or exported
 * is of this narrowed shape.
 */
export type Assignment = Activity & {
  due_date: string;
};

export interface Submission {
  activity_id: number;
  created_at: string;
  deleted_at: null;
  description: string;
  description_file_id: null | number;
  file_activity_submissions?: FileActivitySubmission[];
  group_id: null;
  id: number;
  is_submitted: number;
  spent_time: null;
  submitted_at: string;
  updated_at: string;
  user_id: number;
}

export interface FileActivitySubmission {
  activity_id: number;
  created_at: string;
  deleted_at: null;
  display_name: string;
  file_id: number;
  file_size: string;
  file_type: string;
  group_id: null;
  id: number;
  submission_id: number;
  system_generate: number;
  updated_at: string;
  user_id: number;
}

export interface AssignmentFile {
  downloadUrl: string;
  fileId: number;
  name: string;
}

export interface ActivitySubmissionSubmittedAt {
  date: string;
  timezone: string;
  timezone_type: number;
}

interface User {
  firstname_en: string;
  firstname_th: string;
  id: number;
  lastname_en: string;
  lastname_th: string;
}
