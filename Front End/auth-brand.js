/**
 * Left brand panel — curated heritage showcase for auth pages
 */
(function () {
  const root = document.getElementById("auth-brand");
  if (!root) return;

  const slides = [
    {
      src: "data/Built Heritage/Pylon Monument/Photographs/Old/Pylon.jpg",
      tag: "Built Heritage",
      title: "Pylon Monument",
    },
    {
      src: "data/Natural Heritage/Pujada Island/Photographs/pujada island 1.jpg",
      tag: "Natural Heritage",
      title: "Pujada Island",
    },
    {
      src: "data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/1.jpg",
      tag: "Living Culture",
      title: "Sambuokan Festival",
    },
    {
      src: "data/Built Heritage/Gabaldon Structure of RRMCES-1/Photographs/Old/Central Gabaldon.jpg",
      tag: "Built Heritage",
      title: "Gabaldon Structure",
    },
  ];

  const thumbs = slides
    .map(
      (s, i) =>
        `<button type="button" class="auth-brand-thumb${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="Show ${s.title}">
          <img src="${s.src}" alt="" loading="lazy" decoding="async" />
        </button>`,
    )
    .join("");

  const layers = slides
    .map(
      (s, i) =>
        `<div class="auth-brand-slide${i === 0 ? " is-active" : ""}" data-index="${i}">
          <img src="${s.src}" alt="" loading="${i === 0 ? "eager" : "lazy"}" decoding="async" />
          <div class="auth-brand-slide-meta">
            <span class="auth-brand-slide-tag">${s.tag}</span>
            <span class="auth-brand-slide-title">${s.title}</span>
          </div>
        </div>`,
    )
    .join("");

  root.innerHTML = `
    <div class="auth-brand-visual" aria-hidden="true">
      ${layers}
      <div class="auth-brand-visual-overlay"></div>
      <div class="auth-brand-visual-grain"></div>
    </div>
    <div class="auth-brand-content">
      <a href="index.html" class="auth-brand-logo">
        <span class="auth-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/>
          </svg>
        </span>
        <span class="auth-brand-wordmark">
          <span class="auth-brand-wordmark-main">Mati Heritage</span>
          <span class="auth-brand-wordmark-sub">3D · Games Hub</span>
        </span>
      </a>
      <div class="auth-brand-copy">
        <p class="auth-brand-eyebrow">Davao Oriental</p>
        <h2 class="auth-brand-headline">Discover heritage.<br /><em>Play to learn.</em></h2>
        <p class="auth-brand-lede">Interactive games rooted in Mati&rsquo;s built, natural, and cultural treasures.</p>
      </div>
      <ul class="auth-brand-stats" aria-label="Heritage categories">
        <li><strong>Built</strong><span>Monuments &amp; landmarks</span></li>
        <li><strong>Natural</strong><span>Islands &amp; landscapes</span></li>
        <li><strong>Culture</strong><span>Festivals &amp; traditions</span></li>
      </ul>
      <div class="auth-brand-gallery">
        <p class="auth-brand-gallery-label">Featured sites</p>
        <div class="auth-brand-thumbs">${thumbs}</div>
      </div>
    </div>
  `;

  let index = 0;
  let timer = null;

  function show(i) {
    index = i;
    root.querySelectorAll(".auth-brand-slide").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.index) === i);
    });
    root.querySelectorAll(".auth-brand-thumb").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.index) === i);
    });
  }

  root.querySelectorAll(".auth-brand-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      show(Number(btn.dataset.index));
      resetTimer();
    });
  });

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => show((index + 1) % slides.length), 6000);
  }

  resetTimer();
})();
