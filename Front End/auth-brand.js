/**
 * Left brand panel — curated heritage showcase for auth pages
 */
(function () {
  const root = document.getElementById("auth-brand");
  if (!root) return;

  const isMinimal = root.dataset.mode === "minimal";

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
      tag: "Intangible Cultural Heritage",
      title: "Sambuokan Festival",
    },
    {
      src: "data/Built Heritage/Gabaldon Structure of RRMCES-1/Photographs/Old/Central Gabaldon.jpg",
      tag: "Built Heritage",
      title: "Gabaldon Structure",
    },
  ];

  const dots = slides
    .map(
      (_, i) =>
        `<button type="button" class="auth-brand-dot${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`,
    )
    .join("");

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

  const minimalContent = `
    <div class="auth-brand-visual" aria-hidden="true">
      ${layers}
      <div class="auth-brand-visual-overlay auth-brand-visual-overlay--minimal"></div>
    </div>
    <div class="auth-brand-content auth-brand-content--minimal">
      <a href="index.html" class="auth-brand-logo">
        <span class="auth-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/>
          </svg>
        </span>
        <span class="auth-brand-wordmark">
          <span class="auth-brand-wordmark-main">Mati Heritage 3D</span>
          <span class="auth-brand-wordmark-sub">Visitor Portal</span>
        </span>
      </a>
      <div class="auth-brand-minimal-foot">
        <p class="auth-brand-minimal-quote">
          Preserving built, natural, and intangible heritage for every generation.
        </p>
        <div class="auth-brand-dots" role="tablist" aria-label="Heritage slideshow">${dots}</div>
      </div>
    </div>
  `;

  const fullContent = `
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

  root.innerHTML = isMinimal ? minimalContent : fullContent;

  let index = 0;
  let timer = null;

  function show(i) {
    index = i;
    root.querySelectorAll(".auth-brand-slide").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.index) === i);
    });
    root.querySelectorAll(".auth-brand-thumb, .auth-brand-dot").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.index) === i);
    });
  }

  root.querySelectorAll(".auth-brand-thumb, .auth-brand-dot").forEach((btn) => {
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
