import { useEffect } from "react";

let scorePopStylesMounted = false;

const mountScorePopStyles = () => {
  if (scorePopStylesMounted || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes nb-score-pop-float {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) translateY(0) scale(1.2);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) translateY(-60px) scale(1);
      }
    }
    .nb-score-pop {
      animation: nb-score-pop-float 1s ease-out forwards;
      color: #ea580c;
      font-size: 22px;
      font-weight: 900;
      left: var(--score-pop-x);
      pointer-events: none;
      position: fixed;
      text-shadow: 0 8px 20px rgba(234, 88, 12, 0.22);
      top: var(--score-pop-y);
      z-index: 80;
    }
  `;
  document.head.appendChild(style);
  scorePopStylesMounted = true;
};

const ScorePop = ({ points, x, y, onDone }) => {
  useEffect(() => {
    mountScorePopStyles();
  }, []);

  const sign = Number(points) >= 0 ? "+" : "";

  return (
    <span
      className="nb-score-pop"
      style={{
        "--score-pop-x": `${Math.round(Number(x) || window.innerWidth / 2)}px`,
        "--score-pop-y": `${Math.round(Number(y) || window.innerHeight / 2)}px`,
      }}
      onAnimationEnd={onDone}
    >
      {sign}
      {points} pts
    </span>
  );
};

export default ScorePop;
