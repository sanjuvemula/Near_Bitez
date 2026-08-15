import { motion } from "framer-motion";
import { useTheme } from "../../../hooks/useTheme.js";
import { MoonIcon, SunIcon } from "./VendorIcons.jsx";

/**
 * Light/dark switch. The icon cross-fades and rotates rather than swapping
 * abruptly, which reads as intentional without drawing attention.
 */
const ThemeToggle = ({ className = "" }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-line bg-card text-muted transition-colors hover:border-line-strong hover:text-heading ${className}`}
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex items-center justify-center"
      >
        {isDark ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </motion.span>
    </button>
  );
};

export default ThemeToggle;
