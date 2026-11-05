(function () {
  let audioContext;

  function getSfxVolume() {
    const storedVolume = Number.parseFloat(
      localStorage.getItem("sfxVol") || "0.8",
    );
    return Number.isFinite(storedVolume)
      ? Math.min(Math.max(storedVolume, 0), 1)
      : 0.8;
  }

  function playClick() {
    const volume = getSfxVolume();
    if (volume <= 0) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn("Game click sound is unavailable in this browser.");
      return;
    }

    try {
      audioContext ||= new AudioContext();
      if (audioContext.state === "suspended") {
        audioContext.resume().catch((error) => {
          console.warn("Game click sound audio could not resume.", error);
        });
      }

      const now = audioContext.currentTime;
      const master = audioContext.createGain();
      master.gain.value = volume * 0.42;
      master.connect(audioContext.destination);

      const thump = audioContext.createOscillator();
      const thumpGain = audioContext.createGain();
      thump.type = "sine";
      thump.frequency.setValueAtTime(155, now);
      thump.frequency.exponentialRampToValueAtTime(72, now + 0.07);
      thumpGain.gain.setValueAtTime(0.38, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      thump.connect(thumpGain);
      thumpGain.connect(master);
      thump.start(now);
      thump.stop(now + 0.1);

      const brass = audioContext.createOscillator();
      const brassGain = audioContext.createGain();
      brass.type = "triangle";
      brass.frequency.setValueAtTime(660, now);
      brass.frequency.exponentialRampToValueAtTime(660 * 1.18, now + 0.045);
      brassGain.gain.setValueAtTime(0, now);
      brassGain.gain.linearRampToValueAtTime(0.18, now + 0.008);
      brassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      brass.connect(brassGain);
      brassGain.connect(master);
      brass.start(now);
      brass.stop(now + 0.24);

      const chime = audioContext.createOscillator();
      const chimeGain = audioContext.createGain();
      chime.type = "sine";
      chime.frequency.setValueAtTime(988, now + 0.02);
      chimeGain.gain.setValueAtTime(0, now + 0.02);
      chimeGain.gain.linearRampToValueAtTime(0.1, now + 0.03);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      chime.connect(chimeGain);
      chimeGain.connect(master);
      chime.start(now + 0.02);
      chime.stop(now + 0.38);
    } catch (error) {
      console.error("Game click sound could not be played.", error);
    }
  }

  window.MatiGameAudio = Object.freeze({ playClick });

  const interactiveSelector =
    "button, a, [role='button'], .memory-card, .puzzle-tile, .letter-card";

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(interactiveSelector)) playClick();
  });

  const backgroundMusic = document.getElementById("bg-music");
  if (backgroundMusic) {
    let resumeAfterVisibilityChange = false;

    function pauseBackgroundMusic() {
      if (backgroundMusic.paused) return;
      resumeAfterVisibilityChange = true;
      backgroundMusic.pause();
    }

    function resumeWhenVisible() {
      if (document.visibilityState !== "visible") return;
      const shouldResume = resumeAfterVisibilityChange;
      resumeAfterVisibilityChange = false;
      if (!shouldResume || backgroundMusic.muted || backgroundMusic.volume <= 0)
        return;

      backgroundMusic.play().catch((error) => {
        console.warn("Background music could not resume.", error);
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") pauseBackgroundMusic();
      else resumeWhenVisible();
    });
    window.addEventListener("pagehide", pauseBackgroundMusic);
    window.addEventListener("pageshow", resumeWhenVisible);
  }
})();
