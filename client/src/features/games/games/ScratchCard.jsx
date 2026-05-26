import { useCallback, useEffect, useRef, useState } from "react";
import ScorePop from "../../../components/ScorePop.jsx";
import { api } from "../../../services/api.js";

const ScratchCard = ({ order, onScore }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const completedRef = useRef(false);
  const [reward, setReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [pop, setPop] = useState(null);

  const orderId = order?._id;

  const paintOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#c7c7c7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "900 28px Plus Jakarta Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCRATCH", canvas.width / 2, canvas.height / 2 - 6);
    ctx.font = "700 14px Plus Jakarta Sans, sans-serif";
    ctx.fillText("Reveal your reward", canvas.width / 2, canvas.height / 2 + 24);
  }, []);

  const loadReward = useCallback(async () => {
    setLoading(true);
    setError("");
    setRevealed(false);
    completedRef.current = false;
    try {
      if (!orderId) throw new Error("Scratch card unlocks after an order.");
      const response = await api.get(`/games/scratch-rewards?orderId=${orderId}`);
      setReward(response.data?.reward || null);
      window.requestAnimationFrame(paintOverlay);
    } catch (apiError) {
      setError(apiError.message || "Could not load scratch reward.");
    } finally {
      setLoading(false);
    }
  }, [orderId, paintOverlay]);

  useEffect(() => {
    loadReward();
  }, [loadReward]);

  useEffect(() => {
    if (!loading) paintOverlay();
  }, [loading, paintOverlay]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * canvas.width,
      y: ((source.clientY - rect.top) / rect.height) * canvas.height,
      clientX: source.clientX,
      clientY: source.clientY,
    };
  };

  const revealRemaining = async (clientX, clientY) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setRevealed(true);

    const points = 30 + (reward?.type === "discount" ? 50 : 0) + (reward?.type === "xp" ? 20 : 0);
    setPop({ id: Date.now(), points, x: clientX || window.innerWidth / 2, y: clientY || window.innerHeight / 2 });
    try {
      await api.post("/games/scratch/use", { orderId });
      await onScore?.("ScratchCard", points);
    } catch (apiError) {
      setError(apiError.message || "Could not save scratch reward.");
    }
  };

  const scratchedPercent = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let index = 3; index < image.data.length; index += 4) {
      if (image.data[index] === 0) transparent += 1;
    }
    return transparent / (image.data.length / 4);
  };

  const scratch = (event) => {
    if (!drawingRef.current || completedRef.current) return;
    event.preventDefault();
    const point = getPoint(event);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 40;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 20, 0, Math.PI * 2);
    ctx.fill();

    if (scratchedPercent() > 0.6) {
      revealRemaining(point.clientX, point.clientY);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
        <div className="h-80 w-full max-w-xl animate-pulse rounded-[24px] bg-stone-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
        <div className="max-w-md rounded-[24px] bg-white p-6 text-center shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <p className="text-base font-black text-stone-950">{error}</p>
          <button onClick={loadReward} className="mt-4 min-h-11 rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <section className="relative min-h-[420px] overflow-hidden rounded-[24px] bg-white p-6 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <div className="absolute inset-6 grid place-items-center rounded-[22px] border border-orange-100 bg-orange-50 text-center">
            <div>
              <p className="text-[11px] font-black uppercase text-orange-600">Reward</p>
              <h2 className="mt-2 text-4xl font-black text-stone-950">{reward?.label || "Mystery reward"}</h2>
              <p className="mt-3 text-sm font-bold text-stone-500">
                {reward?.code ? `Code: ${reward.code}` : reward?.restaurant || "NearBites"}
              </p>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={720}
            height={420}
            className="relative z-10 h-full min-h-[420px] w-full touch-none rounded-[22px]"
            onMouseDown={() => {
              drawingRef.current = true;
            }}
            onMouseMove={scratch}
            onMouseUp={() => {
              drawingRef.current = false;
            }}
            onMouseLeave={() => {
              drawingRef.current = false;
            }}
            onTouchStart={(event) => {
              drawingRef.current = true;
              scratch(event);
            }}
            onTouchMove={scratch}
            onTouchEnd={() => {
              drawingRef.current = false;
            }}
          />
        </section>

        <aside className="rounded-[24px] bg-white p-5 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <p className="text-[11px] font-black uppercase text-orange-600">Scratch Card</p>
          <h2 className="mt-2 text-3xl font-black text-stone-950">One reward per order</h2>
          <div className="mt-5 rounded-[18px] bg-[#fafaf8] p-4">
            <p className="text-[11px] font-bold uppercase text-stone-400">Order</p>
            <p className="mt-2 text-2xl font-medium text-stone-950">#{String(orderId).slice(-6)}</p>
          </div>
          <button
            type="button"
            onClick={() => revealRemaining(window.innerWidth / 2, window.innerHeight / 2)}
            disabled={revealed}
            className="mt-5 min-h-11 w-full rounded-full border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-black text-orange-700 disabled:opacity-50"
          >
            Reveal all
          </button>
        </aside>
      </div>

      {pop ? (
        <ScorePop key={pop.id} points={pop.points} x={pop.x} y={pop.y} onDone={() => setPop(null)} />
      ) : null}
    </div>
  );
};

export default ScratchCard;
