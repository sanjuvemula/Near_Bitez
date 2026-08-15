import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";

/** Access the active theme and the light/dark switch. */
export const useTheme = () => useContext(ThemeContext);
