const SOUND_PATTERNS = {
  click: [220],
  score: [523, 659],
  win: [523, 659, 784, 1046],
  lose: [220, 164],
};

export const createTonePlayer = () => {
  let context;

  return (type = "click") => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      context ||= new AudioContext();
      if (context.state === "suspended") {
        context.resume();
      }

      const notes = SOUND_PATTERNS[type] || SOUND_PATTERNS.click;
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.06;
        const duration = type === "click" ? 0.045 : 0.12;

        oscillator.type = type === "lose" ? "sawtooth" : "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.06, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
      });
    } catch {
      // Game audio is enhancement-only and may be blocked by browser policy.
    }
  };
};
