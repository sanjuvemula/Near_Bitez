import { useRef, useState } from "react";
import { animated as Animated, useSpring } from "@react-spring/web";
import ScorePop from "../../../components/ScorePop.jsx";
import { useAuth } from "../../../hooks/useAuth.js";

const faces = [
  { key: "north-indian", label: "North Indian", color: "#ffedd5" },
  { key: "south-indian", label: "South Indian", color: "#dcfce7" },
  { key: "chinese", label: "Chinese", color: "#fee2e2" },
  { key: "italian", label: "Italian", color: "#dbeafe" },
  { key: "dessert", label: "Dessert", color: "#fce7f3" },
  { key: "street-food", label: "Street Food", color: "#fef3c7" },
];

const Icon = ({ type }) => {
  const common = {
    fill: "none",
    stroke: "#9a3412",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2.4,
  };

  if (type === "dessert") {
    return (
      <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
        <path {...common} d="M14 22h20l-3 16H17l-3-16Z" />
        <path {...common} d="M17 22c0-6 14-6 14 0" />
        <path {...common} d="M21 13c2 2 4 2 6 0" />
      </svg>
    );
  }
  if (type === "italian") {
    return (
      <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
        <circle {...common} cx="24" cy="24" r="15" />
        <circle fill="#ea580c" cx="20" cy="20" r="2.5" />
        <circle fill="#16a34a" cx="28" cy="28" r="2.5" />
        <path {...common} d="M15 24h18M24 15v18" />
      </svg>
    );
  }
  if (type === "chinese") {
    return (
      <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
        <path {...common} d="M13 22h22l-4 14H17l-4-14Z" />
        <path {...common} d="M18 18l15-8M24 19l11-5" />
      </svg>
    );
  }
  if (type === "south-indian") {
    return (
      <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
        <path {...common} d="M10 28c8-13 22-13 28 0" />
        <path {...common} d="M14 28h20v8H14z" />
        <circle fill="#ea580c" cx="24" cy="25" r="2" />
      </svg>
    );
  }
  if (type === "street-food") {
    return (
      <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
        <path {...common} d="M15 17h18l-2 20H17l-2-20Z" />
        <path {...common} d="M19 17c0-5 10-5 10 0M18 25h12" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
      <path {...common} d="M12 20h24v15H12z" />
      <path {...common} d="M16 20c1-8 15-8 16 0M18 35l-2 5M30 35l2 5" />
      <circle fill="#ea580c" cx="24" cy="26" r="3" />
    </svg>
  );
};

const faceTransforms = [
  "translateZ(72px)",
  "rotateY(180deg) translateZ(72px)",
  "rotateY(90deg) translateZ(72px)",
  "rotateY(-90deg) translateZ(72px)",
  "rotateX(90deg) translateZ(72px)",
  "rotateX(-90deg) translateZ(72px)",
];

const FoodDice = ({ order, onScore }) => {
  const { user } = useAuth();
  const lockRef = useRef(false);
  const buttonRef = useRef(null);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [lastFace, setLastFace] = useState(null);
  const [total, setTotal] = useState(0);
  const [pop, setPop] = useState(null);
  const [spring, api] = useSpring(() => ({
    transform: "rotateX(-18deg) rotateY(28deg)",
    config: { tension: 120, friction: 16 },
  }));

  const favoriteCuisine =
    user?.favoriteCuisine ||
    order?.restaurant?.category ||
    order?.restaurant?.cuisineType?.[0] ||
    "";

  const roll = () => {
    if (lockRef.current || rollsLeft <= 0) return;
    lockRef.current = true;

    const faceIndex = Math.floor(Math.random() * faces.length);
    const face = faces[faceIndex];
    const matched =
      favoriteCuisine &&
      face.label.toLowerCase().includes(String(favoriteCuisine).toLowerCase().split(" ")[0]);
    const points = matched ? 50 : 10 + Math.floor(Math.random() * 31);
    const rect = buttonRef.current?.getBoundingClientRect();

    api.start({
      transform: `rotateX(${360 + Math.random() * 540}deg) rotateY(${360 + faceIndex * 90}deg) rotateZ(${faceIndex * 24}deg)`,
      onRest: async () => {
        setRollsLeft((value) => value - 1);
        setLastFace(face);
        setTotal((value) => value + points);
        setPop({
          id: Date.now(),
          points,
          x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          y: rect ? rect.top : window.innerHeight / 2,
        });
        await onScore?.("FoodDice", points);
        lockRef.current = false;
      },
    });
  };

  return (
    <div className="grid min-h-[calc(100vh-96px)] gap-6 bg-[#fafaf8] p-4 lg:grid-cols-[minmax(0,1fr),320px]">
      <style>{`
        .food-dice-scene { perspective: 900px; }
        .food-dice-cube { height: 144px; position: relative; transform-style: preserve-3d; width: 144px; }
        .food-dice-face { align-items: center; backface-visibility: hidden; border: 1px solid #f0e3d6; border-radius: 20px; display: flex; flex-direction: column; gap: 8px; height: 144px; justify-content: center; position: absolute; width: 144px; box-shadow: inset 6px 6px 14px rgba(0,0,0,0.08), inset -4px -4px 10px rgba(255,255,255,0.8); }
      `}</style>

      <section className="flex min-h-[520px] items-center justify-center rounded-[24px] bg-white p-6 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
        <div className="food-dice-scene">
          <Animated.div className="food-dice-cube" style={spring}>
            {faces.map((face, index) => (
              <div
                key={face.key}
                className="food-dice-face"
                style={{ background: face.color, transform: faceTransforms[index] }}
              >
                <Icon type={face.key} />
                <span className="text-center text-[11px] font-black uppercase text-stone-600">
                  {face.label}
                </span>
              </div>
            ))}
          </Animated.div>
        </div>
      </section>

      <aside className="rounded-[24px] bg-white p-5 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
        <p className="text-[11px] font-black uppercase text-orange-600">Food Dice</p>
        <h2 className="mt-2 text-3xl font-black text-stone-950">Roll your craving</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[18px] bg-[#fafaf8] p-4">
            <p className="text-[11px] font-bold uppercase text-stone-400">Rolls</p>
            <p className="mt-2 text-2xl font-medium text-stone-950">{rollsLeft}</p>
          </div>
          <div className="rounded-[18px] bg-[#fafaf8] p-4">
            <p className="text-[11px] font-bold uppercase text-stone-400">Score</p>
            <p className="mt-2 text-2xl font-medium text-stone-950">{total}</p>
          </div>
        </div>
        <div className="mt-4 rounded-[18px] border border-orange-100 bg-orange-50 p-4">
          <p className="text-[11px] font-bold uppercase text-orange-700">Favorite match</p>
          <p className="mt-2 text-sm font-bold text-orange-900">
            {favoriteCuisine || "Use your restaurant category"}
          </p>
        </div>
        {lastFace ? (
          <div className="mt-4 rounded-[18px] border border-[#efe8dc] bg-[#fafaf8] p-4">
            <p className="text-[11px] font-bold uppercase text-stone-400">Last face</p>
            <p className="mt-2 text-lg font-black text-stone-950">{lastFace.label}</p>
          </div>
        ) : null}
        <button
          ref={buttonRef}
          type="button"
          onClick={roll}
          disabled={rollsLeft <= 0}
          className="mt-5 min-h-11 w-full rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rollsLeft > 0 ? "Roll!" : "Session complete"}
        </button>
      </aside>

      {pop ? (
        <ScorePop
          key={pop.id}
          points={pop.points}
          x={pop.x}
          y={pop.y}
          onDone={() => setPop(null)}
        />
      ) : null}
    </div>
  );
};

export default FoodDice;
