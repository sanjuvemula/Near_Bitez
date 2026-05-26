import { useCallback, useEffect, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import ScorePop from "../../../components/ScorePop.jsx";
import { api } from "../../../services/api.js";

const FoodQuiz = ({ onScore, myRank }) => {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState({ correct: 0, speed: 0, wrong: 0 });
  const [feedback, setFeedback] = useState(null);
  const [finalRank, setFinalRank] = useState(myRank || null);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pop, setPop] = useState(null);
  const startedAtRef = useRef(Date.now());
  const lockedRef = useRef(false);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/games/quiz");
      setQuestions(response.data?.questions || []);
      setIndex(0);
      setSecondsLeft(10);
      setScore(0);
      setBreakdown({ correct: 0, speed: 0, wrong: 0 });
      setFeedback(null);
      setComplete(false);
      startedAtRef.current = Date.now();
    } catch (apiError) {
      setError(apiError.message || "Could not load quiz questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const finishQuiz = useCallback(async (nextScore) => {
    setComplete(true);
    const payload = await onScore?.("FoodQuiz", Math.max(0, nextScore));
    setFinalRank(payload?.myRank || payload?.currentUser?.rank || myRank || null);
  }, [myRank, onScore]);

  const answer = useCallback(async (selectedIndex, event = null) => {
    if (lockedRef.current || complete || !questions[index]) return;
    lockedRef.current = true;
    const elapsed = (Date.now() - startedAtRef.current) / 1000;
    try {
      const response = await api.post("/games/quiz/answer", {
        questionId: questions[index].id,
        selectedIndex,
      });
      const result = response.data || {};
      const speedBonus = result.correct && elapsed < 3 ? 10 : 0;
      const points = result.correct ? 25 + speedBonus : 0;
      const nextScore = score + points;

      setScore(nextScore);
      setBreakdown((current) => ({
        correct: current.correct + (result.correct ? 1 : 0),
        speed: current.speed + speedBonus,
        wrong: current.wrong + (result.correct ? 0 : 1),
      }));
      setFeedback({
        selectedIndex,
        correct: result.correct,
        correctIndex: result.correctIndex,
        explanation: result.explanation,
      });
      if (points > 0) {
        setPop({
          id: Date.now(),
          points,
          x: event?.clientX || window.innerWidth / 2,
          y: event?.clientY || window.innerHeight / 2,
        });
      }
    } catch (apiError) {
      setError(apiError.message || "Could not validate answer.");
    }
  }, [complete, index, questions, score]);

  useEffect(() => {
    if (loading || complete || feedback || !questions.length) return undefined;
    const id = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          answer(-1);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [answer, complete, feedback, loading, questions.length]);

  const nextQuestion = () => {
    lockedRef.current = false;
    if (index + 1 >= questions.length) {
      finishQuiz(score);
      return;
    }
    setIndex((value) => value + 1);
    setSecondsLeft(10);
    setFeedback(null);
    startedAtRef.current = Date.now();
  };

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
        <div className="h-80 w-full max-w-2xl animate-pulse rounded-[24px] bg-stone-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
        <div className="max-w-md rounded-[24px] bg-white p-6 text-center shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <p className="text-base font-black text-stone-950">{error}</p>
          <button onClick={loadQuiz} className="mt-4 min-h-11 rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="grid min-h-[calc(100vh-96px)] place-items-center bg-[#fafaf8] p-4">
        <div className="w-full max-w-xl rounded-[24px] bg-white p-6 text-center shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
          <p className="text-[11px] font-black uppercase text-orange-600">Final score</p>
          <h2 className="mt-2 text-5xl font-black text-stone-950">{Math.max(0, score)}</h2>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-[18px] bg-[#fafaf8] p-4">
              <p className="text-[11px] font-bold uppercase text-stone-400">Correct</p>
              <p className="mt-2 text-2xl font-medium text-stone-950">{breakdown.correct}</p>
            </div>
            <div className="rounded-[18px] bg-[#fafaf8] p-4">
              <p className="text-[11px] font-bold uppercase text-stone-400">Speed</p>
              <p className="mt-2 text-2xl font-medium text-stone-950">+{breakdown.speed}</p>
            </div>
            <div className="rounded-[18px] bg-[#fafaf8] p-4">
              <p className="text-[11px] font-bold uppercase text-stone-400">Rank</p>
              <p className="mt-2 text-2xl font-medium text-stone-950">{finalRank ? `#${finalRank}` : "-"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[index];

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#fafaf8] p-4">
      <style>{`
        @keyframes quiz-option-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-7px); }
          75% { transform: translateX(7px); }
        }
        .quiz-wrong-shake { animation: quiz-option-shake 0.35s ease-in-out; }
      `}</style>

      <div className="mx-auto max-w-3xl rounded-[24px] bg-white p-5 shadow-[6px_6px_14px_rgba(0,0,0,0.08),-4px_-4px_10px_rgba(255,255,255,0.8)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase text-orange-600">Food Quiz</p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Question {index + 1}/10</h2>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-stone-400">Score</p>
            <p className="text-2xl font-medium text-stone-950">{score}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
          <Motion.div
            className="h-full rounded-full bg-[#ea580c]"
            animate={{ width: `${(secondsLeft / 10) * 100}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>

        <h3 className="mt-8 text-2xl font-black leading-tight text-stone-950">{question.question}</h3>
        <div className="mt-6 grid gap-3">
          {question.options.map((option, optionIndex) => {
            const isCorrect = feedback && optionIndex === feedback.correctIndex;
            const selectedWrong = feedback && optionIndex === feedback.selectedIndex && !feedback.correct;
            return (
              <button
                key={option}
                type="button"
                onClick={(event) => answer(optionIndex, event)}
                disabled={Boolean(feedback)}
                className={`min-h-11 rounded-[18px] border px-4 py-4 text-left text-sm font-black transition ${
                  isCorrect
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : selectedWrong
                    ? "quiz-wrong-shake border-red-200 bg-red-50 text-red-700"
                    : "border-[#efe8dc] bg-[#fafaf8] text-stone-800 hover:border-orange-200"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {feedback ? (
          <div className="mt-6 rounded-[20px] border border-orange-100 bg-orange-50 p-4">
            <p className="text-sm font-black text-orange-900">
              {feedback.correct ? "Correct" : "Correct answer shown"}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-orange-800">{feedback.explanation}</p>
            <button
              type="button"
              onClick={nextQuestion}
              className="mt-4 min-h-11 rounded-full bg-[#ea580c] px-5 py-3 text-sm font-black text-white"
            >
              {index + 1 >= questions.length ? "Finish" : "Next question"}
            </button>
          </div>
        ) : null}
      </div>

      {pop ? (
        <ScorePop key={pop.id} points={pop.points} x={pop.x} y={pop.y} onDone={() => setPop(null)} />
      ) : null}
    </div>
  );
};

export default FoodQuiz;
