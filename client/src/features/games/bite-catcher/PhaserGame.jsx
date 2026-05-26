import { memo, useEffect, useRef, useState } from "react";

const ENGINE_STATUS_LABELS = {
  booting: "Loading engine",
  assets: "Loading assets",
  ready: "Ready",
  error: "Game could not start",
};

const GameLoadingOverlay = ({ status, progress, error }) => (
  <div className="absolute inset-0 z-20 grid place-items-center bg-[#07111f] text-white">
    <div className="w-[min(360px,calc(100vw-48px))] text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[22px] border border-cyan-300/20 bg-cyan-300/10">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-200" />
      </div>
      <p className="mt-6 text-[11px] font-black uppercase text-cyan-100">
        {error || ENGINE_STATUS_LABELS[status] || "Preparing game"}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
        <div
          className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-bold text-white/60">
        {Math.round(progress * 100)}%
      </p>
    </div>
  </div>
);

const PhaserGame = memo(function PhaserGame({
  onComplete,
  onProgress,
  onReady,
  soundEnabled,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  const onReadyRef = useRef(onReady);
  const soundEnabledRef = useRef(soundEnabled);
  const [status, setStatus] = useState("booting");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    let mounted = true;

    const startGame = async () => {
      try {
        setStatus("booting");
        setProgress(0.08);

        const [
          phaserModule,
          bootModule,
          preloadModule,
          gameModule,
        ] = await Promise.all([
          import("phaser"),
          import("./scenes/BootScene.js"),
          import("./scenes/PreloadScene.js"),
          import("./scenes/GameScene.js"),
        ]);

        if (!mounted || !containerRef.current) return;

        const Phaser = phaserModule.default || phaserModule;
        const bounds = containerRef.current.getBoundingClientRect();
        const width = Math.max(320, Math.round(bounds.width || window.innerWidth));
        const height = Math.max(420, Math.round(bounds.height || window.innerHeight));

        setStatus("assets");

        const handleProgress = (value) => {
          if (!mounted) return;
          const normalized = Math.min(1, Math.max(0, value));
          setProgress(normalized);
          onProgressRef.current?.(normalized);
        };

        const handleReady = () => {
          if (!mounted) return;
          setStatus("ready");
          setProgress(1);
          onReadyRef.current?.();
        };

        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          parent: containerRef.current,
          width,
          height,
          backgroundColor: "#07111f",
          physics: {
            default: "arcade",
            arcade: {
              debug: false,
              gravity: { y: 0 },
            },
          },
          fps: {
            target: 60,
            smoothStep: true,
          },
          render: {
            antialias: true,
            powerPreference: "high-performance",
          },
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          scene: [
            bootModule.createBootScene(Phaser),
            preloadModule.createPreloadScene(Phaser, { onProgress: handleProgress }),
            gameModule.createGameScene(Phaser, {
              getSoundEnabled: () => soundEnabledRef.current,
              onComplete: (payload) => onCompleteRef.current?.(payload),
              onReady: handleReady,
            }),
          ],
        });
      } catch {
        if (!mounted) return;
        setStatus("error");
        setError("Game engine failed to load");
      }
    };

    const handleVisibilityChange = () => {
      const game = gameRef.current;
      if (!game) return;

      if (document.hidden) {
        game.scene.pause("GameScene");
      } else {
        game.scene.resume("GameScene");
      }
    };

    startGame();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full min-h-screen w-full overflow-hidden bg-[#07111f]">
      {status !== "ready" || error ? (
        <GameLoadingOverlay status={status} progress={progress} error={error} />
      ) : null}
      <div ref={containerRef} className="h-full min-h-screen w-full" />
    </div>
  );
});

export default PhaserGame;
