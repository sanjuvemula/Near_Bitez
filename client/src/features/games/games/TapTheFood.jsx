import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScorePop from "../../../components/ScorePop.jsx";

const foods = ["Dosa", "Pizza", "Biryani", "Noodles", "Burger", "Lassi"];

const FoodIcon = ({ label }) => (
  <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
    <circle cx="24" cy="24" r="18" fill="#ffedd5" stroke="#ea580c" strokeWidth="2.2" />
    <path
      d={label.length % 2 ? "M15 26c6-10 18-10 18 0M17 31h14" : "M15 19h18l-3 16H18l-3-16Z"}
      fill="none"
      stroke="#9a3412"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />
  </svg>
);

const nextTarget = () => foods[Math.floor(Math.random() * foods.length)];

const TapTheFood = ({ onScore }) => {
  const [target, setTarget] = useState(() => nextTarget());
  const [items, setItems] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [pops, setPops] = useState([]);
  const itemRefs = useRef(new Map());
  const timeoutRefs = useRef(new Map());
  const scoreRef = useRef(0);

  const addPop = (points, x, y) => {
    setPops((current) => [...current, { id: `${Date.now()}-${Math.random()}`, points, x, y }]);
  };

  const changeScore = useCallback((points, x, y) => {
    scoreRef.current += points;
    setScore(scoreRef.current);
    addPop(points, x, y);
  }, []);

  const removeItem = useCallback((id, penalty = false) => {
    const node = itemRefs.current.get(id);
    const label = node?.dataset?.label;
    const finish = () => {
      setItems((current) => current.filter((entry) => entry.id !== id));
      if (penalty && label === target) {
        const rect = node?.getBoundingClientRect();
        changeScore(-5, rect ? rect.left + rect.width / 2 : window.innerWidth / 2, rect ? rect.top : window.innerHeight / 2);
      }
      itemRefs.current.delete(id);
      window.clearTimeout(timeoutRefs.current.get(id));
      timeoutRefs.current.delete(id);
    };

    if (node) {
      gsap.to(node, { opacity: 0, scale: 0.5, duration: 0.18, ease: "power2.out", onComplete: finish });
    } else {
      finish();
    }
  }, [changeScore, target]);

  const spawnItem = useCallback(() => {
    if (complete) return;
    const elapsed = 30 - secondsLeft;
    const speed = elapsed >= 20 ? 950 : elapsed >= 10 ? 1250 : 1600;
    const label = Math.random() < 0.45 ? target : nextTarget();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const x = 8 + Math.random() * 76;
    const y = 16 + Math.random() * 66;

    setItems((current) => [...current.slice(-10), { id, label, x, y }]);
    timeoutRefs.current.set(id, window.setTimeout(() => removeItem(id, true), speed));
  }, [complete, removeItem, secondsLeft, target]);

  useEffect(() => {
    if (complete) return undefined;
    const timerId = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setComplete(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [complete]);

  useEffect(() => {
    if (complete) return undefined;
    const interval = secondsLeft <= 10 ? 430 : secondsLeft <= 20 ? 650 : 900;
    const id = window.setInterval(spawnItem, interval);
    return () => window.clearInterval(id);
  }, [complete, secondsLeft, spawnItem]);

  useEffect(() => {
    if (!complete) return;
    for (const id of timeoutRefs.current.values()) window.clearTimeout(id);
    timeoutRefs.current.clear();
    onScore?.("TapTheFood", Math.max(0, scoreRef.current));
  }, [complete, onScore]);

  const registerItem = (id) => (node) => {
    if (!node) return;
    itemRefs.current.set(id, node);
    gsap.fromTo(node, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "elastic.out(1, 0.55)" });
  };

  const tapItem = (item, event) => {
    const correct = item.label === target;
    changeScore(correct ? 15 : -10, event.clientX, event.clientY);
    if (correct) setTarget(nextTarget());
    removeItem(item.id, false);
  };

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#fafaf8] p-4">
      <div className="mx-auto max-w-6xl">
        <div className="sticky top-0 z-20 rounded-[24px] bg-white p-4 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase text-orange-600">Tap The Food</p>
              <h2 className="text-2xl font-black text-stone-950">Tap: {target}</h2>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase text-stone-400">Time</p>
                <p className="text-2xl font-medium text-stone-950">{secondsLeft}s</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-stone-400">Score</p>
                <p className="text-2xl font-medium text-stone-950">{score}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-[#ea580c] transition-all" style={{ width: `${(secondsLeft / 30) * 100}%` }} />
          </div>
        </div>

        <div className="relative mt-5 h-[620px] overflow-hidden rounded-[24px] bg-white shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          {items.map((item) => (
            <button
              key={item.id}
              ref={registerItem(item.id)}
              data-label={item.label}
              type="button"
              onClick={(event) => tapItem(item, event)}
              className="absolute grid min-h-11 min-w-11 place-items-center rounded-[20px] border border-orange-100 bg-orange-50 p-3 text-center shadow-lg"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <FoodIcon label={item.label} />
              <span className="mt-1 block text-[11px] font-black uppercase text-stone-700">{item.label}</span>
            </button>
          ))}

          {complete ? (
            <div className="absolute inset-0 grid place-items-center bg-white/88 p-6 text-center backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-black uppercase text-orange-600">Game over</p>
                <h3 className="mt-2 text-4xl font-black text-stone-950">{Math.max(0, score)} pts</h3>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {pops.map((pop) => (
        <ScorePop
          key={pop.id}
          points={pop.points}
          x={pop.x}
          y={pop.y}
          onDone={() => setPops((current) => current.filter((item) => item.id !== pop.id))}
        />
      ))}
    </div>
  );
};

export default TapTheFood;
