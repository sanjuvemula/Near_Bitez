import { useContext } from "react";
import { ToastContext } from "@/context/ToastContext";

/** Short-lived user-facing messages. */
export const useToast = () => useContext(ToastContext);
