import { Suspense, lazy } from "react";
import { Navigate, useParams } from "react-router-dom";
import { appRoutes } from "../../app/routes.jsx";
import { getGameKeyFromSlug } from "./gameCatalog.js";

const BiteCatcherPage = lazy(() => import("./bite-catcher/BiteCatcherPage.jsx"));
const ReactGamePlayPage = lazy(() => import("./ReactGamePlayPage.jsx"));

const PHASER_GAME_COMPONENTS = {
  "bite-catcher": BiteCatcherPage,
};

const FullscreenGameFallback = ({ title = "NearBites Game" }) => (
  <div className="grid min-h-screen place-items-center bg-[#07111f] px-4 text-white">
    <div className="w-[min(360px,calc(100vw-48px))] text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[22px] border border-cyan-300/20 bg-cyan-300/10">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-200" />
      </div>
      <p className="mt-6 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
        Loading game
      </p>
      <p className="mt-2 text-2xl font-black">{title}</p>
    </div>
  </div>
);

const GamePlayPage = () => {
  const { gameSlug } = useParams();
  const routeGameKey = getGameKeyFromSlug(gameSlug);

  if (!routeGameKey) {
    return <Navigate to={appRoutes.customerGames} replace />;
  }

  const PhaserGameComponent = PHASER_GAME_COMPONENTS[routeGameKey];

  if (PhaserGameComponent) {
    return (
      <Suspense fallback={<FullscreenGameFallback title="Bite Catcher" />}>
        <PhaserGameComponent />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<FullscreenGameFallback />}>
      <ReactGamePlayPage routeGameKey={routeGameKey} />
    </Suspense>
  );
};

export default GamePlayPage;
