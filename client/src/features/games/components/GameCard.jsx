import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getCustomerGameRoute } from "../../../app/routes.jsx";
import { withGameTheme } from "../gameCatalog.js";

const THUMBNAIL_GRADIENTS = {
  quick: "from-orange-200 via-rose-200 to-sky-200",
  brain: "from-sky-200 via-indigo-200 to-fuchsia-200",
  daily: "from-emerald-200 via-lime-100 to-amber-200",
  duo: "from-cyan-200 via-fuchsia-200 to-orange-200",
  board: "from-violet-200 via-pink-200 to-amber-200",
  party: "from-pink-200 via-yellow-100 to-cyan-200",
};

const getThumbnailGradient = (game) =>
  THUMBNAIL_GRADIENTS[game.group] || THUMBNAIL_GRADIENTS.quick;

const GameThumbnail = ({ game }) => (
  <div className={`relative aspect-[16/10] overflow-hidden rounded-[16px] bg-gradient-to-br ${getThumbnailGradient(game)}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.7),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.24),transparent_42%)]" />
    <div className="absolute left-4 top-4 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-stone-700 backdrop-blur">
      {game.group}
    </div>
    <div className="absolute right-4 top-4 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-stone-700 backdrop-blur">
      {game.crowd || "1P"}
    </div>
    <div className="absolute inset-x-5 bottom-5">
      <div className="mb-4 flex items-end justify-between">
        <div className="grid h-16 w-16 place-items-center rounded-[16px] border border-white/90 bg-white/80 text-xl font-black text-stone-900 shadow-[0_20px_40px_-28px_rgba(14,116,144,0.42)] backdrop-blur">
          {game.glyph}
        </div>
        <div className="h-14 w-24 rounded-[16px] border border-white/80 bg-white/60 p-2 backdrop-blur">
          <div className="h-2 rounded-full bg-stone-700/55" />
          <div className="mt-2 h-2 w-2/3 rounded-full bg-stone-500/32" />
          <div className="mt-2 h-2 w-4/5 rounded-full bg-stone-500/24" />
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/70">
        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-400 via-rose-400 to-cyan-400" />
      </div>
    </div>
  </div>
);

const GameCard = ({ game, index = 0, orderId = "", onBattle }) => {
  const item = withGameTheme(game);
  const isMultiplayer = item.mode === "multiplayer" || item.crowd === "2P";
  const playTo = `${getCustomerGameRoute(item.slug)}${
    orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""
  }`;

  return (
    <Motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.035, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group overflow-hidden rounded-[24px] border border-orange-100 bg-white/90 p-3 shadow-[0_24px_70px_-52px_rgba(14,116,144,0.32)] backdrop-blur-xl transition duration-300 hover:border-orange-200 hover:bg-white"
    >
      <GameThumbnail game={item} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase text-orange-500">
              {item.group}
            </p>
            <h3 className="mt-1 truncate text-2xl font-black leading-none text-stone-950">
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
            className="mt-5 inline-flex w-full items-center justify-center rounded-[16px] bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 px-4 py-3 text-sm font-black text-white shadow-[0_18px_45px_-28px_rgba(34,211,238,0.85)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
          >
            Find Match
          </button>
        ) : (
          <Link
            to={playTo}
            className="mt-5 inline-flex w-full items-center justify-center rounded-[16px] bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 px-4 py-3 text-sm font-black text-white no-underline shadow-[0_18px_45px_-28px_rgba(34,211,238,0.85)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
          >
            Play Now
          </Link>
        )}
      </div>
    </Motion.article>
  );
};

export default GameCard;
