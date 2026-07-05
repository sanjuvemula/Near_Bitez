import { motion as Motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { getCustomerGameRoute } from "../../../app/routes.jsx";
import { withGameTheme } from "../gameCatalog.js";

const THUMBNAIL_GRADIENTS = {
  multiplayer: "from-cyan-500 to-blue-700",
  bot: "from-emerald-500 to-lime-700",
  solo: "from-orange-500 to-rose-700",
};

const getThumbnailGradient = (game) =>
  THUMBNAIL_GRADIENTS[game.group] || THUMBNAIL_GRADIENTS.solo;

const GameThumbnail = ({ game }) => (
  <div className={`relative aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-br ${getThumbnailGradient(game)}`}>
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_42%)]" />
    <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-stone-800">
      {game.crowd || "1P"}
    </div>
    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">
          {game.mark}
        </p>
        <p className="truncate text-[1.35rem] font-black leading-tight text-white sm:text-2xl">{game.shortTitle}</p>
      </div>
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-lg font-black text-stone-950 shadow-sm">
        {game.glyph}
      </div>
    </div>
  </div>
);

const GameCard = ({ game, index = 0, orderId = "", onBattle }) => {
  const reduceMotion = useReducedMotion();
  const item = withGameTheme(game);
  const isMultiplayer = item.mode === "multiplayer" || item.crowd === "2P";
  const playTo = `${getCustomerGameRoute(item.slug)}${
    orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""
  }`;

  return (
    <Motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.16), ease: "easeOut" }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className="group h-full overflow-hidden rounded-[22px] border border-stone-200 bg-white p-3 shadow-sm transition duration-200 hover:border-stone-300"
    >
      <GameThumbnail game={item} />
      <div className="p-3">
        <div className="flex min-h-[58px] items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-stone-500">
              {item.group}
            </p>
            <h3 className="mt-1 truncate text-xl font-black leading-tight text-stone-950">
              {item.title}
            </h3>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${item.chip}`}>
            {item.mark}
          </span>
        </div>

        {isMultiplayer ? (
          <button
            type="button"
            onClick={() => onBattle?.(item)}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-stone-950 px-4 text-sm font-black text-white transition hover:bg-stone-800"
          >
            Battle
          </button>
        ) : (
          <Link
            to={playTo}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-stone-950 px-4 text-sm font-black text-white no-underline transition hover:bg-stone-800"
          >
            Play
          </Link>
        )}
      </div>
    </Motion.article>
  );
};

export default GameCard;
