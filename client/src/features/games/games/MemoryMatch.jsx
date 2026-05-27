import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import ScorePop from "../../../components/ScorePop.jsx";

const categories = [
  "North Indian",
  "South Indian",
  "Chinese",
  "Italian",
  "Dessert",
  "Street Food",
  "Biryani",
  "Beverage",
];

const shuffle = (items) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

const CategoryIcon = ({ label }) => {
  const seed = label.length;
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="#ffedd5" stroke="#ea580c" strokeWidth="2" />
      <path
        d={`M${14 + (seed % 4)} ${25 - (seed % 5)}c5-9 15-9 20 0M16 29h16M20 34h8`}
        fill="none"
        stroke="#9a3412"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
};

const MemoryMatch = ({ onScore }) => {
  const [cards] = useState(() =>
    shuffle(
      categories.flatMap((category) => [
        { id: `${category}-a`, pairId: category, label: category },
        { id: `${category}-b`, pairId: category, label: category },
      ])
    )
  );
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [wrongIds, setWrongIds] = useState([]);
  const [wrongs, setWrongs] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [pop, setPop] = useState(null);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (completed) return undefined;
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [completed, startedAt]);

  const finishIfDone = async (nextMatched, nextWrongs, x, y) => {
    if (nextMatched.length < categories.length || completed) return;
    setCompleted(true);
    const elapsed = seconds;
    const timeBonus = elapsed < 30 ? 100 : elapsed < 60 ? 50 : 0;
    const points = Math.max(0, nextMatched.length * 20 - nextWrongs * 5 + timeBonus);
    setPop({ id: `${nextMatched.length}-${nextWrongs}`, points, x, y });
    await onScore?.("MemoryMatch", points);
  };

  const flip = (card, event) => {
    if (completed || flipped.includes(card.id) || matched.includes(card.pairId) || flipped.length >= 2) return;
    const nextFlipped = [...flipped, card.id];
    setFlipped(nextFlipped);

    if (nextFlipped.length !== 2) return;

    const first = cards.find((item) => item.id === nextFlipped[0]);
    const second = cards.find((item) => item.id === nextFlipped[1]);

    if (first?.pairId === second?.pairId) {
      const nextMatched = [...matched, card.pairId];
      setMatched(nextMatched);
      setFlipped([]);
      finishIfDone(nextMatched, wrongs, event.clientX, event.clientY);
      return;
    }

    setWrongIds(nextFlipped);
    setWrongs((value) => value + 1);
    window.setTimeout(() => {
      setFlipped([]);
      setWrongIds([]);
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#fafaf8] p-4">
      <style>{`
        @keyframes memory-match-pulse {
          0%, 100% { box-shadow: 0 0 0 rgba(234,88,12,0); }
          50% { box-shadow: 0 0 0 5px rgba(234,88,12,0.18); }
        }
        @keyframes memory-no-match {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .memory-card-inner { transform-style: preserve-3d; }
        .memory-card-face { backface-visibility: hidden; }
        .memory-card-back { transform: rotateY(180deg); }
        .memory-card-matched { animation: memory-match-pulse 0.7s ease-out; }
        .memory-card-wrong { animation: memory-no-match 0.42s ease-in-out; }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <div className="sticky top-0 z-10 rounded-[24px] bg-white p-4 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase text-orange-600">Memory Match</p>
              <h2 className="text-2xl font-black text-stone-950">
                {matched.length}/8 pairs
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-stone-400">Time</p>
                <p className="text-2xl font-medium text-stone-950">{seconds}s</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-stone-400">Wrongs</p>
                <p className="text-2xl font-medium text-stone-950">{wrongs}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
            <Motion.div
              className="h-full rounded-full bg-[#ea580c]"
              animate={{ width: `${Math.max(0, 100 - (Math.min(seconds, 60) / 60) * 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => {
            const visible = flipped.includes(card.id) || matched.includes(card.pairId);
            const isMatched = matched.includes(card.pairId);
            const isWrong = wrongIds.includes(card.id);

            return (
              <button
                key={card.id}
                type="button"
                onClick={(event) => flip(card, event)}
                className={`relative aspect-square min-h-20 rounded-[18px] border border-[#efe8dc] bg-white p-0 transition ${isMatched ? "memory-card-matched" : ""} ${isWrong ? "memory-card-wrong" : ""}`}
              >
                <Motion.div
                  className="memory-card-inner relative h-full w-full"
                  animate={{ rotateY: visible ? 180 : 0 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  style={{ transformPerspective: 1000 }}
                >
                  <div className="memory-card-face absolute inset-0 grid place-items-center rounded-[18px] bg-white shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
                    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
                      <rect x="12" y="12" width="24" height="24" rx="7" fill="#ffedd5" stroke="#ea580c" strokeWidth="2.5" />
                      <path d="M19 24h10M24 19v10" stroke="#9a3412" strokeLinecap="round" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <div className="memory-card-face memory-card-back absolute inset-0 grid place-items-center rounded-[18px] bg-orange-50 p-2">
                    <CategoryIcon label={card.label} />
                    <span className="mt-2 block text-center text-[11px] font-black uppercase text-stone-700">
                      {card.label}
                    </span>
                  </div>
                </Motion.div>
              </button>
            );
          })}
        </div>
      </div>

      {completed ? (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-[24px] bg-white p-5 text-center shadow-2xl">
          <p className="text-[11px] font-black uppercase text-orange-600">Complete</p>
          <h3 className="mt-2 text-2xl font-black text-stone-950">All pairs matched</h3>
        </div>
      ) : null}

      {pop ? (
        <ScorePop key={pop.id} points={pop.points} x={pop.x} y={pop.y} onDone={() => setPop(null)} />
      ) : null}
    </div>
  );
};

export default MemoryMatch;
