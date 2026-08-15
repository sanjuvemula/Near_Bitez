/**
 * Bite Catcher — game logic, no React and no rendering.
 *
 * Every constant below was read out of the web game
 * (`client/src/features/games/bite-catcher/scenes/GameScene.js`) so the mobile
 * round plays by identical rules and the two clients' scores stay comparable on
 * a shared leaderboard.
 *
 * Two deliberate departures from the Phaser original, both required by mobile:
 *
 *  - **Frame-rate independence.** Phaser's catcher lerped a fixed 0.24 per
 *    frame, which is only correct at 60 fps; on a 120 Hz phone that doubles the
 *    responsiveness and on a slow frame it halves it. Here the same feel is
 *    expressed as an exponential decay against elapsed time.
 *  - **A fixed entity pool.** Items are recycled from a pre-allocated array
 *    rather than created and destroyed, so a run does no allocation and the
 *    renderer can bind one view per slot for the whole round.
 */

export const ROUND_SECONDS = 35;
const SPAWN_INTERVAL = 0.62;
const HAZARD_CHANCE = 0.18;
const HAZARD_VALUE = -20;
const HAZARD_TIME_PENALTY = 1.6;
const BASE_VALUE = 10;
const COMBO_BONUS_CAP = 20;
const MIN_FALL_SPEED = 195;
const MAX_FALL_SPEED = 330;
const SPEED_FROM_SCORE_CAP = 150;
const SPEED_FROM_SCORE_RATE = 0.42;
/** Phaser's per-frame lerp factor, restated as a rate so dt can vary. */
const CATCHER_LERP = 0.24;
const POOL_SIZE = 14;

export interface Item {
  active: boolean;
  x: number;
  y: number;
  speed: number;
  hazard: boolean;
  value: number;
  /** 0–2 for food, 3 for the chilli. Chooses the sprite. */
  frame: number;
  spin: number;
}

export interface Bounds {
  width: number;
  height: number;
  /** Catcher's fixed vertical centre. */
  catcherY: number;
  catcherHalfWidth: number;
  catcherHalfHeight: number;
  itemRadius: number;
}

export interface CatchEvent {
  hazard: boolean;
  value: number;
  x: number;
  y: number;
}

export interface World {
  score: number;
  combo: number;
  bestCombo: number;
  timeLeft: number;
  catcherX: number;
  targetX: number;
  items: Item[];
  finished: boolean;
  spawnAccumulator: number;
  caught: number;
  missed: number;
  /** Drained by the renderer each frame for pop-text and haptics. */
  events: CatchEvent[];
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

export const createWorld = (bounds: Bounds): World => ({
  score: 0,
  combo: 0,
  bestCombo: 0,
  timeLeft: ROUND_SECONDS,
  catcherX: bounds.width / 2,
  targetX: bounds.width / 2,
  items: Array.from({ length: POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    speed: 0,
    hazard: false,
    value: 0,
    frame: 0,
    spin: 0,
  })),
  finished: false,
  spawnAccumulator: 0,
  caught: 0,
  missed: 0,
  events: [],
});

/** Horizontal limit, matching Phaser's 62 px inset scaled to the catcher. */
const edgeInset = (bounds: Bounds) => Math.min(bounds.catcherHalfWidth + 8, bounds.width / 2);

export const setTarget = (world: World, x: number, bounds: Bounds): void => {
  const inset = edgeInset(bounds);
  world.targetX = Math.max(inset, Math.min(bounds.width - inset, x));
};

const spawn = (world: World, bounds: Bounds): void => {
  const slot = world.items.find((item) => !item.active);
  // Pool exhausted: drop the spawn rather than grow. At the game's spawn rate
  // and fall speeds this cannot happen, but a dropped bite is a far better
  // failure than an unbounded array.
  if (!slot) return;

  const hazard = Math.random() < HAZARD_CHANCE;
  const margin = bounds.itemRadius + 10;

  slot.active = true;
  slot.hazard = hazard;
  slot.frame = hazard ? 3 : Math.floor(Math.random() * 3);
  slot.x = between(margin, Math.max(margin + 1, bounds.width - margin));
  slot.y = -bounds.itemRadius * 2;
  slot.speed =
    between(MIN_FALL_SPEED, MAX_FALL_SPEED) +
    Math.min(SPEED_FROM_SCORE_CAP, world.score * SPEED_FROM_SCORE_RATE);
  slot.value = hazard ? HAZARD_VALUE : BASE_VALUE + Math.min(COMBO_BONUS_CAP, world.combo * 2);
  slot.spin = between(-120, 120);
};

const overlaps = (item: Item, world: World, bounds: Bounds): boolean =>
  Math.abs(item.x - world.catcherX) <= bounds.catcherHalfWidth + bounds.itemRadius * 0.6 &&
  Math.abs(item.y - bounds.catcherY) <= bounds.catcherHalfHeight + bounds.itemRadius * 0.6;

/**
 * Advances the world by `dt` seconds.
 *
 * Mutates in place and returns nothing — the caller reads `world` directly.
 * Allocating a new state object per frame is exactly the pressure a 60 fps loop
 * cannot afford.
 */
export const step = (world: World, dt: number, bounds: Bounds): void => {
  if (world.finished) return;

  world.timeLeft -= dt;
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    world.finished = true;
    return;
  }

  // Exponential approach: equivalent to Phaser's 0.24-per-frame lerp at 60 fps,
  // but identical in feel at any refresh rate.
  const smoothing = 1 - Math.pow(1 - CATCHER_LERP, dt * 60);
  world.catcherX += (world.targetX - world.catcherX) * smoothing;

  world.spawnAccumulator += dt;
  while (world.spawnAccumulator >= SPAWN_INTERVAL) {
    world.spawnAccumulator -= SPAWN_INTERVAL;
    spawn(world, bounds);
  }

  for (const item of world.items) {
    if (!item.active) continue;

    item.y += item.speed * dt;

    if (overlaps(item, world, bounds)) {
      item.active = false;
      world.events.push({ hazard: item.hazard, value: item.value, x: item.x, y: item.y });

      if (item.hazard) {
        world.combo = 0;
        world.score = Math.max(0, world.score + item.value);
        world.timeLeft = Math.max(0, world.timeLeft - HAZARD_TIME_PENALTY);
      } else {
        world.combo += 1;
        world.bestCombo = Math.max(world.bestCombo, world.combo);
        world.score += item.value;
        world.caught += 1;
      }
      continue;
    }

    if (item.y > bounds.height + bounds.itemRadius * 2) {
      item.active = false;
      // Only food breaks the combo. Letting a chilli fall past is correct play.
      if (!item.hazard) {
        world.combo = 0;
        world.missed += 1;
      }
    }
  }
};

/** Rules text shown before the first run, kept next to the rules themselves. */
export const BITE_CATCHER_RULES = [
  `Catch falling food for ${BASE_VALUE}+ points — each catch in a row is worth more.`,
  `Chillies cost ${Math.abs(HAZARD_VALUE)} points and ${HAZARD_TIME_PENALTY}s off the clock.`,
  "Dropping food resets your combo. Dropping a chilli is fine.",
  `You have ${ROUND_SECONDS} seconds. Drag anywhere to move the basket.`,
];
