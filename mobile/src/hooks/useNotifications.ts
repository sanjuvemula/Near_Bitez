import { useContext } from "react";
import { NotificationContext } from "@/context/NotificationContext";

/** Notification list plus the unread badge count. */
export const useNotifications = () => useContext(NotificationContext);
