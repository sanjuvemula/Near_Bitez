// ─── NearBitez Profanity Filter ───────────────────────────────────────────────
// Blocks common English + Hindi abusive words, replaces with ***

const BAD_WORDS = [
  // English
  "fuck", "fuck", "f*ck", "shit", "s*it", "ass", "asshole", "bitch", "bastard",
  "damn", "crap", "dick", "cock", "pussy", "whore", "slut", "cunt", "nigger",
  "nigga", "faggot", "retard", "idiot", "moron", "stupid", "dumb", "loser",
  "motherfucker", "mf", "wtf", "stfu", "kys", "kill yourself",
  // Hindi (romanized)
  "madarchod", "bhencho", "bhenchod", "bsdk", "bc", "mc", "mc bc",
  "chutiya", "chut", "gaand", "lund", "randi", "harami", "kamine",
  "sale", "sali", "gandu", "lavde", "lavda", "saala", "saali",
  "ullu", "ullu ka pattha", "bakwaas", "haramzada", "haramzadi",
  "kutte", "kuttiya", "suar", "maderchod", "betichod",
];

// Build a regex that catches leet speak and spacing tricks
const buildPattern = (word) => {
  return word
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // escape regex chars
    .replace(/a/gi, "[a@4]")
    .replace(/e/gi, "[e3]")
    .replace(/i/gi, "[i1!]")
    .replace(/o/gi, "[o0]")
    .replace(/s/gi, "[s$5]")
    .replace(/u/gi, "[u]");
};

const PATTERNS = BAD_WORDS.map((word) => ({
  original: word,
  regex: new RegExp(`\\b${buildPattern(word)}\\b`, "gi"),
}));

/**
 * Checks if text contains profanity
 * @param {string} text
 * @returns {boolean}
 */
export const hasProfanity = (text) => {
  if (!text) return false;
  return PATTERNS.some(({ regex }) => {
    regex.lastIndex = 0;
    return regex.test(text);
  });
};

/**
 * Replaces bad words with *** and returns { clean, flagged }
 * @param {string} text
 * @returns {{ clean: string, flagged: boolean }}
 */
export const filterText = (text) => {
  if (!text) return { clean: text, flagged: false };

  let clean = text;
  let flagged = false;

  for (const { regex } of PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(clean)) {
      flagged = true;
      regex.lastIndex = 0;
      clean = clean.replace(regex, (match) => "*".repeat(match.length));
    }
  }

  return { clean, flagged };
};