export const DEFAULT_GAME_KEY = "food-quiz-battle";

export const GAME_LIBRARY = [
  {
    key: "food-quiz-battle",
    slug: "food-quiz-battle",
    title: "Food Quiz Battle",
    description: "Online-first food trivia. If no player is ready, a hard AI rival joins after matchmaking.",
    glyph: "QB",
    mark: "Live",
    shortTitle: "Quiz Battle",
    group: "multiplayer",
    crowd: "2P",
    mode: "multiplayer",
    homeHint: "Fast answers beat real rivals",
    actionHint: "Find live match",
    accent: "text-cyan-700 bg-cyan-50 border-cyan-200",
    chip: "bg-cyan-100 text-cyan-700",
    softCard: "border-cyan-200 bg-[linear-gradient(135deg,#ecfeff,#cffafe_55%,#f5f3ff)]",
    panel: "from-[#061628] via-[#075985] to-[#a21caf]",
  },
  {
    key: "delivery-race",
    slug: "delivery-race",
    title: "Delivery Race",
    description: "Race another rider through delivery pressure. Falls back to a sharp bot when the queue is empty.",
    glyph: "DR",
    mark: "Race",
    shortTitle: "Race",
    group: "multiplayer",
    crowd: "2P",
    mode: "multiplayer",
    homeHint: "Online race, bot fallback",
    actionHint: "Find rider",
    accent: "text-rose-700 bg-rose-50 border-rose-200",
    chip: "bg-rose-100 text-rose-700",
    softCard: "border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#fee2e2_55%,#fff7ed)]",
    panel: "from-[#2b0909] via-[#991b1b] to-[#f97316]",
  },
  {
    key: "hand-cricket",
    slug: "hand-cricket",
    title: "Hand Cricket Night",
    description: "A floodlit number duel against a bot. Build runs, read pressure, and survive smart bowling.",
    glyph: "HC",
    mark: "Bot",
    shortTitle: "Cricket",
    group: "bot",
    crowd: "Bot",
    mode: "bot",
    homeHint: "Hard number duel",
    actionHint: "Play ball",
    accent: "text-lime-700 bg-lime-50 border-lime-200",
    chip: "bg-lime-100 text-lime-800",
    softCard: "border-emerald-200 bg-[linear-gradient(135deg,#ecfeff,#dcfce7_55%,#fef3c7)]",
    panel: "from-[#03120d] via-[#047857] to-[#f59e0b]",
  },
  {
    key: "snakes-sprint",
    slug: "snake",
    title: "Snakes Sprint",
    description: "A compact board-race against a bot with ladders, traps, and a tough finish line.",
    glyph: "SS",
    mark: "Bot",
    shortTitle: "Snakes",
    group: "bot",
    crowd: "Bot",
    mode: "bot",
    homeHint: "Board sprint versus bot",
    actionHint: "Race bot",
    accent: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200",
    chip: "bg-fuchsia-100 text-fuchsia-700",
    softCard: "border-fuchsia-200 bg-[linear-gradient(135deg,#fdf4ff,#fae8ff_55%,#fce7f3)]",
    panel: "from-[#3b0764] via-[#a21caf] to-[#f472b6]",
  },
  {
    key: "bite-catcher",
    slug: "bite-catcher",
    title: "Bite Catcher",
    description: "A full-screen arcade run with falling bites, dodges, combos, and best-score chasing.",
    glyph: "BC",
    mark: "Arcade",
    shortTitle: "Catcher",
    group: "solo",
    crowd: "1P",
    mode: "solo",
    homeHint: "Full-screen arcade",
    actionHint: "Catch run",
    accent: "text-teal-700 bg-teal-50 border-teal-200",
    chip: "bg-teal-100 text-teal-700",
    softCard: "border-teal-200 bg-[linear-gradient(135deg,#ecfeff,#e0f2fe_55%,#fff7ed)]",
    panel: "from-[#07111f] via-[#0f766e] to-[#f97316]",
  },
  {
    key: "food-memory",
    slug: "food-memory",
    title: "Food Memory",
    description: "Match dishes and restaurants under time pressure. Clean streaks make the score jump.",
    glyph: "FM",
    mark: "Solo",
    shortTitle: "Memory",
    group: "solo",
    crowd: "1P",
    mode: "solo",
    homeHint: "Timed memory streaks",
    actionHint: "Flip cards",
    accent: "text-sky-700 bg-sky-50 border-sky-200",
    chip: "bg-sky-100 text-sky-700",
    softCard: "border-sky-200 bg-[linear-gradient(135deg,#eff6ff,#dbeafe_55%,#ecfeff)]",
    panel: "from-[#082f49] via-[#0f4c81] to-[#2563eb]",
  },
  {
    key: "tray-shuffle",
    slug: "tray-shuffle",
    title: "Tray Shuffle",
    description: "Track the hidden tray through quick shuffles and tap the right one before the timer bites.",
    glyph: "TS",
    mark: "Solo",
    shortTitle: "Shuffle",
    group: "solo",
    crowd: "1P",
    mode: "solo",
    homeHint: "Watch, track, tap",
    actionHint: "Track tray",
    accent: "text-indigo-700 bg-indigo-50 border-indigo-200",
    chip: "bg-indigo-100 text-indigo-700",
    softCard: "border-indigo-200 bg-[linear-gradient(135deg,#eef2ff,#e0e7ff_55%,#f5f3ff)]",
    panel: "from-[#1e1b4b] via-[#4338ca] to-[#818cf8]",
  },
];

export const GAME_THEME_BY_KEY = Object.fromEntries(
  GAME_LIBRARY.map((game) => [game.key, game])
);

export const GAME_OPTIONS = [
  { value: "any", label: "Any game" },
  ...GAME_LIBRARY.map((game) => ({ value: game.key, label: game.title })),
];

export const GAME_GROUPS = [
  { key: "all", label: "All" },
  { key: "multiplayer", label: "Live" },
  { key: "bot", label: "Bot" },
  { key: "solo", label: "Solo" },
];

export const getGameTheme = (gameKey) =>
  GAME_THEME_BY_KEY[gameKey] || GAME_THEME_BY_KEY[DEFAULT_GAME_KEY];

export const getGameSlug = (gameKey) =>
  GAME_THEME_BY_KEY[gameKey]?.slug || gameKey || DEFAULT_GAME_KEY;

export const getGameKeyFromSlug = (slug) => {
  const normalized = String(slug || "").toLowerCase();
  return (
    GAME_LIBRARY.find((game) => game.slug === normalized || game.key === normalized)
      ?.key || null
  );
};

export const withGameTheme = (game = {}) => {
  const source = game || {};
  const theme = getGameTheme(source.key);
  return {
    ...theme,
    ...source,
    slug: getGameSlug(source.key),
    description: source.description || theme.description || theme.homeHint,
  };
};
