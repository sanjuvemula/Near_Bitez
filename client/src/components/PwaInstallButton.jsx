import { useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";

const PwaInstallButton = () => {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  return (
    <AnimatePresence>
      {promptEvent && !installed ? (
        <Motion.button
          type="button"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          onClick={install}
          className="fixed bottom-[94px] right-4 z-50 rounded-[18px] border border-orange-200 bg-white px-4 py-3 text-sm font-black text-orange-700 shadow-[0_24px_70px_-42px_rgba(234,88,12,0.85)] lg:bottom-5"
        >
          Install NearBitez
        </Motion.button>
      ) : null}
    </AnimatePresence>
  );
};

export default PwaInstallButton;
