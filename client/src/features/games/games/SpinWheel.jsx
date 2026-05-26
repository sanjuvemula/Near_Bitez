import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import ScorePop from "../../../components/ScorePop.jsx";
import { getCustomerRestaurantRoute } from "../../../app/routes.jsx";
import { api } from "../../../services/api.js";

const colors = ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#ffedd5", "#fed7aa", "#f97316", "#c2410c"];

const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

const SpinWheel = ({ onScore }) => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const spinRef = useRef({ angle: 0, velocity: 0, spinning: false });
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [pop, setPop] = useState(null);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segments.length) return;

    const context = canvas.getContext("2d");
    const size = canvas.width;
    const radius = size / 2 - 12;
    const center = size / 2;
    const arc = (Math.PI * 2) / segments.length;

    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(center, center);
    context.rotate(spinRef.current.angle);

    segments.forEach((segment, index) => {
      const start = index * arc;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, radius, start, start + arc);
      context.closePath();
      context.fillStyle = colors[index % colors.length];
      context.fill();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 3;
      context.stroke();

      context.save();
      context.rotate(start + arc / 2);
      context.textAlign = "right";
      context.fillStyle = index === 4 ? "#9a3412" : "#ffffff";
      context.font = "700 13px Plus Jakarta Sans, sans-serif";
      context.fillText(segment.label.slice(0, 18), radius - 16, 4);
      context.restore();
    });

    context.beginPath();
    context.arc(0, 0, 52, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "#fed7aa";
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = "#ea580c";
    context.font = "900 18px Plus Jakarta Sans, sans-serif";
    context.textAlign = "center";
    context.fillText("SPIN", 0, 6);
    context.restore();
  }, [segments]);

  const loadSegments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/games/wheel-segments");
      const next = response.data?.segments || [];
      if (next.length < 8) {
        throw new Error("Need 8 live restaurants for today's wheel.");
      }
      setSegments(next.slice(0, 8));
    } catch (apiError) {
      setError(apiError.message || "Could not load today's wheel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const finishSpin = async () => {
    const normalized = ((Math.PI * 1.5 - spinRef.current.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const index = Math.floor(normalized / ((Math.PI * 2) / segments.length));
    const segment = segments[index % segments.length];
    const centerIndex = Math.floor(segments.length / 2);
    const distance = Math.abs(index - centerIndex);
    const points = distance === 0 ? 80 : distance === 1 || distance === segments.length - 1 ? 40 : 20;

    setResult({ ...segment, points });
    setPop({ id: Date.now(), points, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#ea580c", "#f97316", "#fbbf24", "#ffffff"],
    });
    await onScore?.("SpinWheel", points);
  };

  const spin = () => {
    if (spinRef.current.spinning || !segments.length) return;
    setResult(null);
    spinRef.current.spinning = true;
    spinRef.current.velocity = 0.34 + Math.random() * 0.18;
    const startedAt = performance.now();

    const tick = (now) => {
      const elapsed = Math.min(1, (now - startedAt) / 4200);
      const easing = easeOutCubic(elapsed);
      spinRef.current.angle += spinRef.current.velocity * (1 - easing * 0.35);
      spinRef.current.velocity *= 0.985;
      drawWheel();

      if (spinRef.current.velocity < 0.01) {
        spinRef.current.spinning = false;
        finishSpin();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
        <div className="h-72 w-full max-w-xl animate-pulse rounded-[24px] bg-orange-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
        <div className="max-w-md rounded-[24px] bg-white p-6 text-center shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <p className="text-base font-black text-stone-950">{error}</p>
          <button onClick={loadSegments} className="mt-4 min-h-11 rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-96px)] gap-6 bg-[#fafaf8] p-4 lg:grid-cols-[minmax(0,1fr),340px]">
      <section className="relative grid place-items-center rounded-[24px] bg-white p-4 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
        <div className="absolute left-1/2 top-8 z-10 h-0 w-0 -translate-x-1/2 border-x-[14px] border-t-[24px] border-x-transparent border-t-stone-950" />
        <canvas
          ref={canvasRef}
          width={620}
          height={620}
          className="aspect-square w-full max-w-[620px]"
        />
        <button
          type="button"
          onClick={spin}
          className="absolute left-1/2 top-1/2 min-h-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ea580c] px-8 py-4 text-sm font-black uppercase text-white shadow-lg transition hover:bg-orange-700"
        >
          Spin
        </button>
      </section>

      <aside className="rounded-[24px] bg-white p-5 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
        <p className="text-[11px] font-black uppercase text-orange-600">Spin Wheel</p>
        <h2 className="mt-2 text-3xl font-black text-stone-950">Today&apos;s restaurants</h2>
        <div className="mt-5 space-y-2">
          {segments.map((segment, index) => (
            <div key={segment.id} className="flex items-center justify-between rounded-[16px] bg-[#fafaf8] px-3 py-2">
              <span className="text-sm font-bold text-stone-700">{segment.label}</span>
              <span className="h-3 w-3 rounded-full" style={{ background: colors[index] }} />
            </div>
          ))}
        </div>
      </aside>

      {result ? (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-[24px] bg-white p-5 shadow-2xl">
          <p className="text-[11px] font-black uppercase text-orange-600">Wheel landed</p>
          <h3 className="mt-2 text-2xl font-black text-stone-950">{result.label}</h3>
          <p className="mt-2 text-sm font-bold text-stone-500">+{result.points} pts added</p>
          <button
            type="button"
            onClick={() => navigate(getCustomerRestaurantRoute(result.restaurantId))}
            className="mt-4 min-h-11 w-full rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white"
          >
            Order from here?
          </button>
        </div>
      ) : null}

      {pop ? (
        <ScorePop key={pop.id} points={pop.points} x={pop.x} y={pop.y} onDone={() => setPop(null)} />
      ) : null}
    </div>
  );
};

export default SpinWheel;
