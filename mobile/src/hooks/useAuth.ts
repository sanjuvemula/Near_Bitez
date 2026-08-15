import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

/** Current session, role and the auth actions. */
export const useAuth = () => useContext(AuthContext);

export type { AuthMode } from "@/context/AuthContext";
