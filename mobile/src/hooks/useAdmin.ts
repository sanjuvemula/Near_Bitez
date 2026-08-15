import { useContext } from "react";
import { AdminContext } from "@/context/AdminContext";

/** Shared platform stats, subscription analytics and derived alerts. */
export const useAdmin = () => useContext(AdminContext);
