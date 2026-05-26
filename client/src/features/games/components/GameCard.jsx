import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getCustomerGameRoute } from "../../../app/routes.jsx";
import { withGameTheme } from "../gameCatalog.js";

const GameThumbnail = ({ game }) => (
  <div className={`relative aspect-[16/10] overflow-hidden rounded-[16px] bg-gradient-to-br ${game.panel}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.32),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_42%)]" />
    <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/85 backdrop-blur">
      {game.group}
    </div>
    <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur">
      {game.crowd || "1P"}
    </div>
    <div className="absolute inset-x-5 bottom-5">
      <div className="mb-4 flex items-end justify-between">
        <div className="grid h-16 w-16 place-items-center rounded-[16px] border border-white/18 bg-white/14 text-xl font-black text-white shadow-[0_20px_40px_-24px_rgba(0,0,0,0.55)] backdrop-blur">
          {game.glyph}
        </div>
        <div className="h-14 w-24 rounded-[16px] border border-white/12 bg-white/10 p-2 backdrop-blur">
          <div className="h-2 rounded-full bg-white/65" />
          <div className="mt-2 h-2 w-2/3 rounded-full bg-white/35" />
          <div className="mt-2 h-2 w-4/5 rounded-full bg-white/25" />
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/20">
        <div className="h-full w-2/3 rounded-full bg-white/70" />
      </div>
    </div>
  </div>
);

const GameCard = ({ game, index = 0 }) => {
  const item = withGameTheme(game);

  return (
    <Motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.035, ease: "easeOut" }}
      className="group overflow-hidden rounded-[18px] border border-[#e5dccf] bg-[#f4f1ec] p-3 shadow-[inset_7px_7px_14px_rgba(139,120,96,0.14),inset_-7px_-7px_14px_rgba(255,255,255,0.92),0_18px_42px_-34px_rgba(65,54,43,0.36)] transition duration-300 hover:-translate-y-0.5 hover:border-orange-200"
    >
      <GameThumbnail game={item} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase text-stone-400">
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

        <Link
          to={getCustomerGameRoute(item.slug)}
          className="mt-5 inline-flex w-full items-center justify-center rounded-[14px] bg-stone-950 px-4 py-3 text-sm font-black text-white no-underline transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600"
        >
          Play Now
        </Link>
      </div>
    </Motion.article>
  );
};

export default GameCard;
