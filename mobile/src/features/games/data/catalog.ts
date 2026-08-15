import type { GameKey, GameMeta } from "@/features/games/utils/types";

/**
 * The mobile game catalogue.
 *
 * Keys match `server/controllers/gameController.js` GAME_CONFIGS exactly, so a
 * score submitted from here lands under the same game name the web app uses and
 * both clients share one leaderboard.
 *
 * `status` records what actually exists on mobile. The web catalogue advertises
 * seven games but only five have distinct implementations — `food-quiz-battle`
 * and `delivery-race` fall through to a spinner there. Rather than repeat that,
 * this list says plainly which are playable.
 */
export const GAME_CATALOG: GameMeta[] = [
  {
    key: "bite-catcher",
    title: "Bite Catcher",
    short: "Catcher",
    tagline: "Catch falling bites, dodge the chillies",
    description:
      "A 35-second arcade run. Slide the basket to catch food and build a combo — chillies cost you points and time.",
    mode: "solo",
    difficulty: "Arcade",
    rewardType: "coins",
    hue: "#0f766e",
    glyph: "BC",
    status: "playable",
  },
  {
    key: "food-memory",
    title: "Food Memory",
    short: "Memory",
    tagline: "Match the pairs before the clock runs out",
    description:
      "Flip cards to find matching dishes. Clean streaks multiply the score; a wrong pair breaks the streak.",
    mode: "solo",
    difficulty: "Timed",
    rewardType: "xp",
    hue: "#0f4c81",
    glyph: "FM",
    status: "playable",
  },
  {
    key: "tray-shuffle",
    title: "Tray Shuffle",
    short: "Shuffle",
    tagline: "Track the covered tray through the shuffle",
    description:
      "Watch which tray hides the dish, follow it through the shuffle, then tap it. Each round gets faster.",
    mode: "solo",
    difficulty: "Timed",
    rewardType: "coupon",
    hue: "#4338ca",
    glyph: "TS",
    status: "playable",
  },
  {
    key: "snakes-sprint",
    title: "Snakes Sprint",
    short: "Snakes",
    tagline: "Race a bot to square 30",
    description:
      "Roll to move up the board. Ladders jump you forward, snakes drag you back, and the bot is not gentle.",
    mode: "bot",
    difficulty: "Hard Bot",
    rewardType: "coins",
    hue: "#a21caf",
    glyph: "SS",
    status: "playable",
  },
  {
    key: "hand-cricket",
    title: "Hand Cricket Night",
    short: "Cricket",
    tagline: "A number duel under floodlights",
    description: "Pick a number each ball. Match the bowler and you are out.",
    mode: "bot",
    difficulty: "Hard Bot",
    rewardType: "coins",
    hue: "#047857",
    glyph: "HC",
    status: "web-only",
  },
  {
    key: "food-quiz-battle",
    title: "Food Quiz Battle",
    short: "Quiz Battle",
    tagline: "Live food trivia against another player",
    description: "Answer faster than your rival.",
    mode: "multiplayer",
    difficulty: "Live PvP",
    rewardType: "xp",
    hue: "#075985",
    glyph: "QB",
    status: "web-only",
  },
  {
    key: "delivery-race",
    title: "Delivery Race",
    short: "Race",
    tagline: "Race another rider through delivery pressure",
    description: "Beat the rival rider to the drop-off.",
    mode: "multiplayer",
    difficulty: "Live PvP",
    rewardType: "coins",
    hue: "#991b1b",
    glyph: "DR",
    status: "web-only",
  },
];

export const PLAYABLE_GAMES = GAME_CATALOG.filter((game) => game.status === "playable");

export const GAME_BY_KEY: Record<string, GameMeta> = Object.fromEntries(
  GAME_CATALOG.map((game) => [game.key, game])
);

export const getGame = (key: GameKey | string): GameMeta | undefined => GAME_BY_KEY[key];
