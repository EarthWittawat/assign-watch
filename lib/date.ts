import { format } from "date-fns";
import { enUS, th } from "date-fns/locale";
import moment from "moment/min/moment-with-locales";

import { i18n } from "#imports";

export function formatDateRelative(date: Date): {
  status: "late" | "today" | "upcoming";
  text: string;
} {
  moment.locale(i18n.t("@@ui_locale") === "th" ? "th" : "en");

  const target = moment(date);
  let status: "late" | "today" | "upcoming" = "upcoming";
  if (target.isBefore(moment())) {
    status = "late";
  } else if (target.isSame(new Date(), "day")) {
    status = "today";
  }

  return { status, text: target.fromNow() };
}

export function formatDate(date: Date, formatStr: string) {
  return format(date, formatStr, {
    locale: i18n.t("@@ui_locale") === "th" ? th : enUS,
  });
}
