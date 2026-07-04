/** Shared auth form helpers */
window.MatiAuthUI = {
  bindPasswordToggle(inputId, btnId, openId, closedId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      document.getElementById(openId)?.classList.toggle("hidden", show);
      document.getElementById(closedId)?.classList.toggle("hidden", !show);
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  },

  bindStrengthMeter(inputId, meterId) {
    const input = document.getElementById(inputId);
    const meter = document.getElementById(meterId);
    if (!input || !meter) return;
    const bars = meter.querySelectorAll("[data-bar]");
    input.addEventListener("input", () => {
      const v = input.value;
      let score = 0;
      if (v.length >= 6) score++;
      if (v.length >= 10) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      if (/\d/.test(v)) score++;
      bars.forEach((bar, i) => bar.classList.toggle("is-on", i < score));
      meter.dataset.level = String(score);
    });
  },
};
