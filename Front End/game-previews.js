(function () {
  const GAMES = [
    {
      title2: "Mati Heritage Trivia Challenge",
      title: "Mati Heritage Trivia Challenge",
      genre: "Quiz Game",
      cardGenre: "Quiz",
      cardTitle: "Heritage Trivia",
      desc: "Discover Mati City's heritage through fun and interactive trivia.",
      players: "12.4K playing",
      pts: "5 PTS",
      url: "trivia.html",
      preview: "trivia",
      expandTransition: true,
      showTitle: "MATI HERITAGE",
      showSubtitle: "TRIVIA SHOWDOWN",
      gameplayImg:
        "data/Intangible Cultural Heritage/Sambuokan Festival/Photographs/0M8A2760.jpg",
    },
    {
      title2: "Memory Matching Pairs",
      title: "Memory Matching Pairs",
      genre: "Memory Game",
      cardGenre: "Memory",
      cardTitle: "Matching Pairs",
      desc: "Test your memory by matching iconic landmarks and symbols of Mati City.",
      players: "8.2K playing",
      pts: "350 PTS",
      url: "memorypairs.html",
      preview: "memory",
      expandTransition: true,
      showTitle: "MEMORY",
      showSubtitle: "MATCHING PAIRS",
      gameplayImg:
        "data/Built Heritage/Pylon Monument/Photographs/New/J6000x4000-00255.jpg",
    },
    {
      title2: "Spot the Difference",
      title: "Spot the Difference",
      genre: "Observation Game",
      cardGenre: "Observation",
      cardTitle: "Spot the Difference",
      desc: "Sharpen your eyes and find subtle differences between images of Mati's scenic spots.",
      players: "5.1K playing",
      pts: "400 PTS",
      url: "spotthedifference.html",
      preview: "spot",
      expandTransition: true,
      showTitle: "SPOT THE",
      showSubtitle: "DIFFERENCE",
      gameplayImg:
        "data/Natural Heritage/Pujada Island/Photographs/pujada1.jpg",
    },
    {
      title2: "Slide Puzzle",
      title: "Slide Puzzle",
      genre: "Puzzle Game",
      cardGenre: "Puzzle",
      cardTitle: "Slide Puzzle",
      desc: "Reassemble photos showcasing Mati City's rich heritage.",
      players: "3.4K playing",
      pts: "600 PTS",
      url: "slidepuzzle.html",
      preview: "slide",
      expandTransition: true,
      showTitle: "HERITAGE",
      showSubtitle: "SLIDE PUZZLE",
      gameplayImg:
        "data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/Sleeping.jpg",
    },
    {
      title2: "True or False Sprint",
      title: "True or False Sprint",
      genre: "Fast-Paced Game",
      cardGenre: "Sprint",
      cardTitle: "True or False",
      desc: "Think fast — decide if facts about Mati's culture and history are true or false.",
      players: "15.2K playing",
      pts: "450 PTS",
      url: "truefalsesprint.html",
      preview: "truefalse",
      expandTransition: true,
      showTitle: "TRUE OR FALSE",
      showSubtitle: "SPRINT",
      gameplayImg:
        "data/Built Heritage/Gabaldon Structure of RRMCES-1/Photographs/Old/Central Gabaldon.jpg",
    },
  ];

  const PREVIEW_BACKGROUNDS = {
    trivia: "#08080c",
    memory: "#2a1808",
    spot: "#12081f",
    slide: "#0d2818",
    truefalse: "#0f0a08",
    tv: "#08080c",
  };

  const MEMORY_KEEPER_SVG = `<svg class="game-keeper-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="60" cy="110" rx="30" ry="7" fill="rgba(0,0,0,0.22)"/><rect x="78" y="58" width="18" height="28" rx="5" fill="#92400e" stroke="#2a1808" stroke-width="2"/><rect x="81" y="62" width="12" height="8" rx="2" fill="#b45309" stroke="#2a1808" stroke-width="1.2"/><path d="M38 95 Q60 78 82 95 L78 108 L42 108 Z" fill="#0f766e" stroke="#2a1808" stroke-width="2.5"/><path d="M44 82 L76 82 L74 95 L46 95 Z" fill="#14532d" stroke="#2a1808" stroke-width="1.5"/><circle cx="60" cy="88" r="3" fill="#fde68a" stroke="#2a1808" stroke-width="1"/><circle cx="60" cy="50" r="23" fill="#fcd9b6" stroke="#2a1808" stroke-width="2.5"/><ellipse cx="60" cy="36" rx="28" ry="8" fill="#c4a574" stroke="#2a1808" stroke-width="2"/><path d="M44 36 Q60 18 76 36 L74 44 Q60 30 46 44 Z" fill="#d4a843" stroke="#2a1808" stroke-width="2"/><rect x="54" y="28" width="12" height="10" rx="2" fill="#b8956a" stroke="#2a1808" stroke-width="1.5"/><circle cx="52" cy="50" r="3.5" fill="#2a1808"/><circle cx="68" cy="50" r="3.5" fill="#2a1808"/><circle cx="53" cy="49" r="1" fill="#fff"/><circle cx="69" cy="49" r="1" fill="#fff"/><path d="M52 60 Q60 67 68 60" fill="none" stroke="#2a1808" stroke-width="2" stroke-linecap="round"/><rect x="22" y="68" width="24" height="18" rx="2" fill="#f3e4c4" stroke="#2a1808" stroke-width="2" transform="rotate(-8 34 77)"/><path d="M26 73 L42 71 M26 78 L40 77 M26 83 L38 82" stroke="#b8956a" stroke-width="1" transform="rotate(-8 34 77)"/><circle cx="60" cy="86" r="5" fill="#fde68a" stroke="#2a1808" stroke-width="1.2"/><path d="M60 83 L61 87 L60 89 L59 87 Z" fill="#b45309"/></svg>`;

  const TF_SEAL_TRUE_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7l3.5 3.5L12 3" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const TF_SEAL_FALSE_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2l8 8M10 2L2 10" stroke="white" stroke-width="2.2" stroke-linecap="round"/></svg>`;

  function buildTriviaIntroContent() {
    return `
      <div class="intro-card">
        <span class="intro-card__badge">● ON AIR — LIVE TV BROADCAST</span>
        <h1>Mati Heritage<br /><span class="intro-card__title-sub">TRIVIA CHALLENGE</span></h1>
        <p class="intro-card__desc">Answer heritage questions before time runs out. Score points for every correct answer!</p>
        <span class="start-btn preview-start-btn">▶ START SHOW</span>
      </div>`;
  }

  function buildMemoryIntroContent() {
    return `
      <span class="game-adv-corner game-adv-corner--tl" aria-hidden="true"></span>
      <span class="game-adv-corner game-adv-corner--tr" aria-hidden="true"></span>
      <span class="game-adv-corner game-adv-corner--bl" aria-hidden="true"></span>
      <span class="game-adv-corner game-adv-corner--br" aria-hidden="true"></span>
      <div class="game-scroll-curl" aria-hidden="true"></div>
      <div class="game-keeper-wrap" aria-hidden="true">${MEMORY_KEEPER_SVG}</div>
      <div class="game-keeper-bubble">Flip two cards at a time — can you remember where each relic hides?</div>
      <h1 class="game-chronicle-title game-chronicle-title--divider">Memory Matching Pairs</h1>
      <p class="game-intro-desc">Your expedition begins here! Flip the wax-sealed cards and pair the treasures of Mati — monuments, islands, and living traditions — before time runs out.</p>
      <span class="game-btn-chronicle">PLAY</span>`;
  }

  function buildSpotIntroContent() {
    return `
      <span class="game-fest-banner__sun" aria-hidden="true"></span>
      <h1 class="game-fest-banner__title">
        <span class="game-fest-banner__title-line">SPOT THE</span>
        <span class="game-fest-banner__title-diff">DIFFERENCE</span>
      </h1>
      <p class="game-fest-banner__subtitle">Train your eye on Mati heritage</p>
      <p class="game-fest-banner__desc">Two photos sit side by side — one has been subtly changed. Spot every difference before the clock runs out.</p>
      <div class="game-fest-frames" aria-hidden="true">
        <div class="game-fest-frames__item game-fest-frames__item--a">
          <div class="game-fest-frames__panel"></div>
          <span class="game-fest-frames__tag">PHOTO A</span>
        </div>
        <span class="game-fest-frames__vs">VS</span>
        <div class="game-fest-frames__item game-fest-frames__item--b">
          <div class="game-fest-frames__panel game-fest-frames__panel--alt"></div>
          <span class="game-fest-frames__tag">PHOTO B</span>
        </div>
      </div>
      <span class="game-fest-banner__leaf game-fest-banner__leaf--left" aria-hidden="true">🌿</span>
      <span class="game-fest-banner__leaf game-fest-banner__leaf--right" aria-hidden="true">🌿</span>
      <span class="game-fest-banner__feather game-fest-banner__feather--left" aria-hidden="true">🪶</span>
      <span class="game-fest-banner__feather game-fest-banner__feather--right" aria-hidden="true">🪶</span>
      <span class="game-btn-fest game-btn-fest--start">ENTER</span>`;
  }

  function buildSlideIntroContent() {
    return `
      <span class="game-parchment-card__vine game-parchment-card__vine--tl" aria-hidden="true">🌿</span>
      <span class="game-parchment-card__vine game-parchment-card__vine--tr" aria-hidden="true">🌿</span>
      <span class="game-parchment-card__vine game-parchment-card__vine--bl" aria-hidden="true">🌿</span>
      <span class="game-parchment-card__vine game-parchment-card__vine--br" aria-hidden="true">🌿</span>
      <h1 class="game-parchment-card__title">
        <span class="game-parchment-card__leaf" aria-hidden="true">🍃</span>
        SLIDE <span class="game-parchment-card__title-accent">PUZZLE</span>
        <span class="game-parchment-card__leaf" aria-hidden="true">🍃</span>
      </h1>
      <div class="game-parchment-card__ribbon">Piece together Mati's landscapes and landmarks</div>
      <p class="game-parchment-card__desc">From the Sleeping Dinosaur to festival grounds — restore scrambled photographs of Mati City's natural and cultural treasures.</p>
      <div class="game-polaroid-row" aria-hidden="true">
        <div class="game-polaroid game-polaroid--tilt-l">
          <span class="game-polaroid__tape"></span>
          <img class="game-polaroid__photo" src="data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/Sleeping.jpg" alt="" />
        </div>
        <div class="game-polaroid game-polaroid--tilt-r">
          <span class="game-polaroid__tape"></span>
          <div class="game-polaroid__puzzle">
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
            <div class="game-polaroid__tile"></div>
          </div>
        </div>
      </div>
      <span class="game-btn-slide">Start Puzzle</span>`;
  }

  function buildTruefalseIntroContent() {
    return `
      <div class="game-scroll-flourish" aria-hidden="true"><span class="game-scroll-flourish__gem"></span></div>
      <h1 class="game-tf-title-main">True and False</h1>
      <p class="game-tf-title-sprint">Sprint</p>
      <div class="game-scroll-flourish game-scroll-flourish--divider" aria-hidden="true"><span class="game-scroll-flourish__gem"></span></div>
      <p class="game-tf-desc">Unroll each parchment entry and judge whether the heritage fact is true or false — before the sands run out.</p>
      <div class="game-tf-verdicts">
        <div class="game-tf-verdict">
          <span class="game-tf-verdict__seal game-tf-verdict__seal--true">${TF_SEAL_TRUE_SVG}</span>
          <span class="game-tf-verdict__label game-tf-verdict__label--true">TRUE</span>
        </div>
        <div class="game-tf-verdict">
          <span class="game-tf-verdict__seal game-tf-verdict__seal--false">${TF_SEAL_FALSE_SVG}</span>
          <span class="game-tf-verdict__label game-tf-verdict__label--false">FALSE</span>
        </div>
      </div>
      <span class="game-btn-tf-enter">ENTER</span>`;
  }

  function buildGenericPreviewContent(game) {
    return `<div class="preview-screen"><p class="preview-desc">${game.title2}</p></div>`;
  }

  const MEMORY_CATEGORY_LABELS = {
    built: "Built Heritage",
    natural: "Natural Heritage",
    intangible: "Intangible Cultural Heritage",
  };

  const MEMORY_PORTAL_DECK = [
    {
      id: "pylon",
      name: "Pylon Monument",
      category: "built",
      emoji: "🏛",
      img: "data/Built Heritage/Pylon Monument/Photographs/Old/Pylon.jpg",
    },
    {
      id: "sleeping-dino",
      name: "Taytay Daga (Sleeping Dinosaur)",
      category: "natural",
      emoji: "🦕",
      img: "data/Natural Heritage/Taytay Daga (Sleeping Dinosaur)/Photographs/Sleeping.jpg",
    },
    {
      id: "pujada-island",
      name: "Pujada Island",
      category: "natural",
      emoji: "🏝",
      img: "data/Natural Heritage/Pujada Island/Photographs/pujada island 1.jpg",
    },
    {
      id: "gabaldon",
      name: "Gabaldon Structure (RRMCES-1)",
      category: "built",
      emoji: "🏫",
      img: "data/Built Heritage/Gabaldon Structure of RRMCES-1/Photographs/Old/Central Gabaldon.jpg",
    },
  ];

  function buildTriviaGameplayContent() {
    const answers = [
      { letter: "A", text: "Mount Hamiguitan" },
      { letter: "B", text: "Waniban Island" },
      { letter: "C", text: "Dahican Beach" },
      { letter: "D", text: "Sleeping Dinosaur" },
    ];

    const answerHtml = answers
      .map(
        (opt, index) =>
          `<div class="answer-btn promo-answer-btn" style="--promo-i:${index}"><span class="answer-btn__letter">${opt.letter}</span><span>${opt.text}</span></div>`,
      )
      .join("");

    return `
      <div class="game-show__main">
        <div class="show-topbar">
          <div class="hud-stat hud-stat--score">
            <span class="hud-stat__label">SCORE</span>
            <span class="hud-stat__value">0</span>
          </div>
          <div class="timer-ring promo-timer-ring" aria-hidden="true">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="timer-ring__track" cx="50" cy="50" r="45"></circle>
              <circle class="timer-ring__progress promo-timer-progress" data-portal-timer-ring cx="50" cy="50" r="45"></circle>
            </svg>
            <span class="timer-ring__value" data-portal-timer>10</span>
          </div>
          <div class="hud-stat">
            <span class="hud-stat__label">QUESTION</span>
            <span class="hud-stat__value">1/5</span>
          </div>
        </div>
        <div class="question-panel">
          <p class="question-panel__text">Which Mati landmark is known for its shape resembling a prehistoric creature?</p>
        </div>
        <div class="answers-grid">${answerHtml}</div>
      </div>`;
  }

  function buildPortalScrollPreview(type, previewClass, panelClass, innerHtml, options) {
    options = options || {};
    const miniClass = options.mini ? ` ${previewClass}--mini` : "";

    return `
      <div class="game-memory-scroll ${previewClass}${miniClass}" data-game-launch data-preview-type="${type}">
        <section class="game-scroll-panel ${panelClass}">${innerHtml}</section>
      </div>`;
  }

  function buildMemoryCardPreview(item, state, index) {
    const promoClass = ` promo-memory-card promo-memory--${state.role || "idle"}`;

    return `
      <button type="button" class="memory-card${promoClass}" data-promo-index="${index}" style="--promo-i:${index}" aria-hidden="true" tabindex="-1">
        <div class="card-inner">
          <div class="card-face card-back">
            <div class="wax-seal">M</div>
          </div>
          <div class="card-face card-front">
            <div class="card-front__frame">
              <img src="${item.img}" alt="" loading="lazy" />
            </div>
            <div class="card-front__caption">
              <div class="card-front__name">${item.emoji} ${item.name}</div>
              <div class="card-front__tag card-front__tag--${item.category}">${MEMORY_CATEGORY_LABELS[item.category]}</div>
            </div>
          </div>
        </div>
      </button>`;
  }

  function buildMemoryGameplayContent() {
    const layout = [
      { deckIndex: 0, role: "pair-a" },
      { deckIndex: 1, role: "pair-b" },
      { deckIndex: 2, role: "wrong-a" },
      { deckIndex: 3, role: "wrong-b" },
      { deckIndex: 0, role: "pair-a" },
      { deckIndex: 2, role: "idle" },
      { deckIndex: 1, role: "pair-b" },
      { deckIndex: 3, role: "idle" },
    ];

    const grid = layout
      .map((state, index) =>
        buildMemoryCardPreview(MEMORY_PORTAL_DECK[state.deckIndex], state, index),
      )
      .join("");

    return `
      <div class="portal-memory-game" data-portal-demo="memory">
        <div class="portal-memory-top portal-game-top">
          <h2 class="game-screen__title">Pair the Treasures of Mati</h2>
          <div class="portal-memory-hud">
            <div class="hud-ribbon">
              <div class="hud-ribbon__label">Time</div>
              <div class="hud-ribbon__value portal-memory-hud-time" data-portal-timer>60s</div>
            </div>
            <div class="hud-ribbon">
              <div class="hud-ribbon__label">Score</div>
              <div class="hud-ribbon__value portal-memory-hud-score">0</div>
            </div>
            <div class="hud-ribbon">
              <div class="hud-ribbon__label">Turns</div>
              <div class="hud-ribbon__value portal-memory-hud-turns">0</div>
            </div>
            <div class="hud-ribbon">
              <div class="hud-ribbon__label">Pairs</div>
              <div class="hud-ribbon__value portal-memory-hud-pairs">0/4</div>
            </div>
          </div>
        </div>
        <div class="portal-memory-bars">
          <div class="hourglass-track">
            <div class="hourglass-fill portal-memory-hourglass" data-portal-timer-bar></div>
          </div>
          <div class="pairs-progress" aria-hidden="true">
            <div class="pairs-progress__fill portal-memory-pairs-fill"></div>
          </div>
        </div>
        <div class="game-table portal-memory-table">
          <div class="portal-memory-grid">${grid}</div>
        </div>
      </div>`;
  }

  function buildSpotGameplayContent(game) {
    const img = game.gameplayImg || "";
    const markers = [
      { top: "24%", left: "42%", i: 0 },
      { top: "38%", left: "58%", i: 1 },
      { top: "62%", left: "28%", i: 2 },
      { top: "48%", left: "74%", i: 3 },
      { top: "78%", left: "50%", i: 4 },
    ];
    const markerHtml = markers
      .map(
        (m) =>
          `<span class="spot-found promo-spot-marker" data-spot-marker="${m.i}" style="top:${m.top};left:${m.left};--promo-i:${m.i}"><span class="spot-found__ring"></span><span class="spot-found__dot"></span></span>`,
      )
      .join("");
    const stars = Array.from({ length: 5 })
      .map(
        (_, i) =>
          `<span class="fest-star" data-spot-star="${i}" aria-hidden="true">★</span>`,
      )
      .join("");

    return `
      <div class="portal-spot-game" data-portal-demo="spot">
        <div class="console-hud">
          <div class="gauge">
            <span class="gauge__label">Differences</span>
            <div class="gauge__value"><span data-spot-found>0</span><span style="font-size:0.45em;opacity:0.4">/</span><span style="font-size:0.65em">5</span></div>
          </div>
          <div class="gauge gauge--timer">
            <span class="gauge__ring" aria-hidden="true"></span>
            <span class="gauge__label">Time</span>
            <span class="gauge__value" data-spot-timer data-portal-timer>60s</span>
          </div>
          <div class="gauge gauge--score">
            <span class="gauge__label">Score</span>
            <span class="gauge__value" data-spot-score>0</span>
          </div>
        </div>
        <div class="fest-progress">
          <div class="fest-progress__label">
            <span>Spotting progress</span>
            <span data-spot-progress-text>0 of 5 found</span>
          </div>
          <div class="fest-progress__track">
            <div class="fest-progress__fill portal-spot-progress" data-spot-progress-bar></div>
          </div>
          <div class="fest-stars" aria-hidden="true">${stars}</div>
        </div>
        <div class="exhibit-stage fest-pattern-frame">
          <span class="exhibit-stage__garland" aria-hidden="true"></span>
          <div class="slide-pair">
            <span class="slide-pair__vs">VS</span>
            <div class="slide-frame">
              <div class="slide-frame__plate">
                <span class="slide-label">Photo A</span>
                <img src="${img}" alt="" draggable="false" />
              </div>
            </div>
            <div class="slide-frame">
              <div class="slide-frame__plate">
                <span class="slide-label">Photo B</span>
                <img src="${img}" alt="" draggable="false" />
                ${markerHtml}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function buildSlideBoardTiles(img, state) {
    const safeImg = img.replace(/'/g, "%27");
    return state
      .map((piece, index) => {
        if (piece === null) {
          return `<div class="puzzle-tile empty-tile portal-puzzle-empty" data-puzzle-cell="${index}"></div>`;
        }
        return `<div class="puzzle-tile portal-puzzle-tile" data-puzzle-cell="${index}" data-piece="${piece}" style="background-image:url('${safeImg}');background-size:300% 300%;background-position:${piece}"></div>`;
      })
      .join("");
  }

  const SLIDE_DEMO_SCRAMBLE = [
    null,
    "0% 0%",
    "100% 0%",
    "0% 50%",
    "50% 0%",
    "100% 50%",
    "0% 100%",
    "50% 50%",
    "50% 100%",
  ];

  const SLIDE_DEMO_MOVES = [
    { from: 1, to: 0 },
    { from: 4, to: 1 },
    { from: 7, to: 4 },
    { from: 8, to: 7 },
  ];

  function buildSlideGameplayContent(game) {
    const img = game.gameplayImg || "";
    const grid = buildSlideBoardTiles(img, SLIDE_DEMO_SCRAMBLE);

    return `
      <div class="portal-slide-game" data-portal-demo="slide">
        <div class="portal-slide-top portal-game-top">
          <h2 class="game-screen__title">Heritage Slide Puzzle</h2>
          <div class="portal-slide-hud">
            <div class="hud-ribbon">
              <div class="hud-ribbon__label">Time</div>
              <div class="hud-ribbon__value portal-slide-hud-time" data-slide-timer data-portal-timer>07:52</div>
            </div>
            <div class="hud-ribbon">
              <div class="hud-ribbon__label">Points</div>
              <div class="hud-ribbon__value portal-slide-hud-score" data-slide-score>420</div>
            </div>
            <div class="hud-ribbon">
              <div class="hud-ribbon__label">Moves</div>
              <div class="hud-ribbon__value portal-slide-hud-moves" data-slide-moves>14</div>
            </div>
          </div>
        </div>
        <div class="portal-slide-bars">
          <div class="hourglass-track">
            <div class="hourglass-fill portal-slide-timer-bar" data-slide-timer-bar data-portal-timer-bar style="width:84%"></div>
          </div>
          <div class="slide-status-meta">
            <span class="difficulty-badge">Medium</span>
            <span class="portal-slide-complete-badge" data-slide-badge>Solve the puzzle</span>
          </div>
        </div>
        <div class="portal-slide-stage">
          <div class="puzzle-frame portal-puzzle-frame-solved">
            <div class="puzzle-board portal-puzzle-board" data-slide-board data-slide-img="${img}">${grid}</div>
          </div>
          <p class="portal-slide-caption">Taytay Daga (Sleeping Dinosaur) · Natural Heritage</p>
        </div>
      </div>`;
  }

  function buildTruefalseGameplayContent() {
    return `
      <div class="portal-tf-game">
        <div class="game-scroll__header">
          <span>Medium Sprint</span>
        </div>
        <div class="portal-tf-stats">
          <div class="stat-chip">
            <span class="stat-chip__label">Score</span>
            <span class="stat-chip__value">320</span>
          </div>
          <div class="stat-chip">
            <span class="stat-chip__label">Entry</span>
            <span class="stat-chip__value stat-chip__value--sm">2 / 5</span>
          </div>
          <div class="stat-chip">
            <span class="stat-chip__label">Best</span>
            <span class="stat-chip__value">480</span>
          </div>
        </div>
        <div class="portal-tf-timer">
          <div class="timer-medallion" aria-hidden="true"></div>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(107,68,35,0.12)" stroke-width="4"></circle>
            <circle class="portal-tf-timer-ring promo-tf-timer-ring" data-portal-timer-ring cx="50" cy="50" r="42" fill="none" stroke="#6b4423" stroke-width="4" stroke-linecap="round"></circle>
          </svg>
          <span class="portal-tf-timer-value" data-portal-timer>12</span>
        </div>
        <div class="scroll-roll portal-tf-plaque promo-tf-plaque">
          <div class="scroll-roll__body">
            <span class="portal-tf-entry">Entry II</span>
            <p class="portal-tf-fact">The Sambuokan Festival celebrates Mati City&rsquo;s founding anniversary every August.</p>
          </div>
        </div>
        <div class="portal-tf-verdicts">
          <div class="verdict-btn promo-verdict-btn promo-verdict-btn--true">
            <span class="verdict-btn__seal verdict-btn__seal--true">${TF_SEAL_TRUE_SVG}</span>
            <span class="verdict-btn__text verdict-btn__text--true">TRUE</span>
          </div>
          <div class="verdict-btn promo-verdict-btn promo-verdict-btn--false">
            <span class="verdict-btn__seal verdict-btn__seal--false">${TF_SEAL_FALSE_SVG}</span>
            <span class="verdict-btn__text verdict-btn__text--false">FALSE</span>
          </div>
        </div>
      </div>`;
  }

  function buildTriviaTvShell(innerHtml, options) {
    options = options || {};
    const shellClass = [
      "game-tv-set",
      "game-tv-set--trivia",
      options.portalClass || "",
    ]
      .filter(Boolean)
      .join(" ");
    const logoHidden = options.mini ? ' aria-hidden="true"' : "";
    const titleBlock = options.showGameplayTitle
      ? `<div class="game-tv-show-title">${options.showTitle || "MATI HERITAGE"}<span>${options.showSubtitle || "TRIVIA SHOWDOWN"}</span></div>`
      : "";

    return `
      <div id="game-tv-set" class="${shellClass}" data-game-launch data-preview-type="trivia">
        <div class="game-tv-logo-bar"${logoHidden}>
          <span class="game-tv-live"><span class="game-tv-live-dot"></span> LIVE</span>
          ${titleBlock}
          <span class="game-tv-logo-spacer" aria-hidden="true"></span>
        </div>
        <div class="game-tv-bezel">
          <span class="game-tv-power-led" aria-hidden="true"></span>
          <div class="game-tv-vignette" aria-hidden="true"></div>
          <div class="game-tv-scanlines" aria-hidden="true"></div>
          <div class="game-tv-noise" aria-hidden="true"></div>
          <div class="game-tv-flicker-overlay" aria-hidden="true"></div>
          <div class="game-tv-glitch" aria-hidden="true"></div>
          <div class="game-tv-distort-bar" aria-hidden="true"></div>
          <div class="game-tv-screen">
            <div class="game-tv-screen__inner">${innerHtml}</div>
          </div>
        </div>
        <div class="game-tv-stand" aria-hidden="true"></div>
        <div class="game-tv-floor-glow" aria-hidden="true"></div>
      </div>`;
  }

  function buildTriviaPortalPreview(game, options) {
    options = options || {};
    const miniClass = options.mini ? " portal-trivia-preview--mini" : "";

    return buildTriviaTvShell(buildTriviaGameplayContent(), {
      portalClass: `portal-trivia-preview${miniClass}`,
      showGameplayTitle: !options.mini,
      showTitle: game.showTitle,
      showSubtitle: game.showSubtitle,
      mini: options.mini,
    });
  }

  function buildMemoryPortalPreview(game, options) {
    return buildPortalScrollPreview(
      "memory",
      "portal-memory-preview",
      "portal-memory-panel",
      buildMemoryGameplayContent(),
      options,
    );
  }

  function buildSpotPortalPreview(game, options) {
    options = options || {};
    const miniClass = options.mini ? " portal-spot-preview--mini" : "";

    return `
      <div class="game-spot-intro portal-spot-preview${miniClass}" data-game-launch data-preview-type="spot">
        <section class="game-console portal-spot-console">${buildSpotGameplayContent(game)}</section>
      </div>`;
  }

  function buildSlidePortalPreview(game, options) {
    return buildPortalScrollPreview(
      "slide",
      "portal-slide-preview",
      "portal-slide-panel",
      buildSlideGameplayContent(game),
      options,
    );
  }

  function buildTruefalsePortalPreview(game, options) {
    options = options || {};
    const miniClass = options.mini ? " portal-tf-preview--mini" : "";

    return `
      <div class="game-tf-intro portal-tf-preview${miniClass}" data-game-launch data-preview-type="truefalse">
        <div class="game-hero-scroll portal-tf-scroll">
          <div class="game-hero-scroll__roller" aria-hidden="true"></div>
          <div class="game-hero-scroll__paper portal-tf-paper">${buildTruefalseGameplayContent()}</div>
          <div class="game-hero-scroll__roller" aria-hidden="true"></div>
        </div>
      </div>`;
  }

  function buildPortalPromoShell(game, innerHtml, options) {
    options = options || {};
    const miniClass = options.mini ? " portal-promo-device--mini" : "";
    const barHidden = options.mini ? ' aria-hidden="true"' : "";

    return `
      <div class="portal-promo-device portal-promo-device--${game.preview}${miniClass}" data-game-launch data-preview-type="${game.preview}">
        <div class="portal-promo-device__bar arcade-game-font"${barHidden}>
          <span class="portal-promo-live">
            <span class="portal-promo-live-dot"></span>
            NOW PLAYING
          </span>
          <span class="portal-promo-genre">${game.genre}</span>
        </div>
        <div class="portal-promo-device__bezel">
          <div class="portal-promo-device__scanlines" aria-hidden="true"></div>
          <div class="portal-promo-device__shine" aria-hidden="true"></div>
          <div class="portal-promo-device__screen promo-animate promo-animate--${game.preview}">
            ${innerHtml}
          </div>
        </div>
      </div>`;
  }

  function buildPortalGameplayContent(game) {
    if (game.preview === "trivia") return buildTriviaGameplayContent();
    if (game.preview === "memory") return buildMemoryGameplayContent();
    if (game.preview === "spot") return buildSpotGameplayContent(game);
    if (game.preview === "slide") return buildSlideGameplayContent(game);
    if (game.preview === "truefalse") return buildTruefalseGameplayContent();
    return buildGenericPreviewContent(game);
  }

  function buildTriviaFeaturedPreview() {
    return buildTriviaTvShell(buildTriviaIntroContent());
  }

  function buildMemoryFeaturedPreview() {
    return `
      <div class="game-memory-scroll" data-game-launch data-preview-type="memory">
        <section class="game-scroll-panel">${buildMemoryIntroContent()}</section>
      </div>`;
  }

  function buildSpotFeaturedPreview() {
    return `
      <div class="game-spot-intro" data-game-launch data-preview-type="spot">
        <div class="game-fest-banner game-fest-pattern-frame">${buildSpotIntroContent()}</div>
      </div>`;
  }

  function buildSlideFeaturedPreview() {
    return `
      <div class="game-slide-intro" data-game-launch data-preview-type="slide">
        <div class="game-parchment-card">
          <div class="game-parchment-card__inner">${buildSlideIntroContent()}</div>
        </div>
      </div>`;
  }

  function buildTruefalseFeaturedPreview() {
    return `
      <div class="game-tf-intro" data-game-launch data-preview-type="truefalse">
        <div class="game-hero-scroll">
          <div class="game-hero-scroll__roller" aria-hidden="true"></div>
          <div class="game-hero-scroll__paper">${buildTruefalseIntroContent()}</div>
          <div class="game-hero-scroll__roller" aria-hidden="true"></div>
        </div>
      </div>`;
  }

  function buildGenericTvFeaturedPreview(game) {
    return `
      <div class="game-tv-set" data-game-launch data-preview-type="tv">
        <div class="game-tv-logo-bar">
          <span class="game-tv-live"><span class="game-tv-live-dot"></span> LIVE</span>
          <div class="game-tv-show-title">${game.showTitle}<span>${game.showSubtitle}</span></div>
          <span class="game-tv-logo-spacer" aria-hidden="true"></span>
        </div>
        <div class="game-tv-bezel">
          <div class="game-tv-scanlines" aria-hidden="true"></div>
          <div class="game-tv-screen">
            <div class="game-tv-screen__inner">${buildGenericPreviewContent(game)}</div>
          </div>
        </div>
        <div class="game-tv-stand" aria-hidden="true"></div>
      </div>`;
  }

  function buildFeaturedPreview(game) {
    if (game.preview === "trivia") return buildTriviaFeaturedPreview();
    if (game.preview === "memory") return buildMemoryFeaturedPreview();
    if (game.preview === "spot") return buildSpotFeaturedPreview();
    if (game.preview === "slide") return buildSlideFeaturedPreview();
    if (game.preview === "truefalse") return buildTruefalseFeaturedPreview();
    return buildGenericTvFeaturedPreview(game);
  }

  function buildPortalFeaturedPreview(game) {
    if (game.preview === "trivia") return buildTriviaPortalPreview(game);
    if (game.preview === "memory") return buildMemoryPortalPreview(game);
    if (game.preview === "spot") return buildSpotPortalPreview(game);
    if (game.preview === "slide") return buildSlidePortalPreview(game);
    if (game.preview === "truefalse") return buildTruefalsePortalPreview(game);
    return buildPortalPromoShell(game, buildPortalGameplayContent(game));
  }

  function buildPortalSidePreview(game) {
    if (game.preview === "trivia") {
      return buildTriviaPortalPreview(game, { mini: true });
    }
    if (game.preview === "memory") {
      return buildMemoryPortalPreview(game, { mini: true });
    }
    if (game.preview === "spot") {
      return buildSpotPortalPreview(game, { mini: true });
    }
    if (game.preview === "slide") {
      return buildSlidePortalPreview(game, { mini: true });
    }
    if (game.preview === "truefalse") {
      return buildTruefalsePortalPreview(game, { mini: true });
    }
    return buildPortalPromoShell(game, buildPortalGameplayContent(game), {
      mini: true,
    });
  }

  function buildSidePreview(game) {
    if (game.preview === "memory") {
      return `
        <div class="game-memory-scroll game-memory-scroll--side">
          <section class="game-scroll-panel game-scroll-panel--side">
            <h2 class="game-chronicle-title game-chronicle-title--side">Memory Matching Pairs</h2>
            <span class="game-btn-chronicle game-btn-chronicle--side">PLAY</span>
          </section>
        </div>`;
    }

    if (game.preview === "spot") {
      return `
        <div class="game-spot-intro game-spot-intro--side">
          <div class="game-fest-banner game-fest-pattern-frame game-fest-banner--side">
            <h2 class="game-fest-banner__title game-fest-banner__title--side">
              <span class="game-fest-banner__title-line">SPOT THE</span>
              <span class="game-fest-banner__title-diff">DIFFERENCE</span>
            </h2>
            <span class="game-btn-fest game-btn-fest--side">ENTER</span>
          </div>
        </div>`;
    }

    if (game.preview === "slide") {
      return `
        <div class="game-slide-intro game-slide-intro--side">
          <div class="game-parchment-card game-parchment-card--side">
            <div class="game-parchment-card__inner game-parchment-card__inner--side">
              <h2 class="game-parchment-card__title game-parchment-card__title--side">
                SLIDE <span class="game-parchment-card__title-accent">PUZZLE</span>
              </h2>
              <span class="game-btn-slide game-btn-slide--side">Start Puzzle</span>
            </div>
          </div>
        </div>`;
    }

    if (game.preview === "truefalse") {
      return `
        <div class="game-tf-intro game-tf-intro--side">
          <div class="game-hero-scroll game-hero-scroll--side">
            <div class="game-hero-scroll__roller" aria-hidden="true"></div>
            <div class="game-hero-scroll__paper game-hero-scroll__paper--side">
              <h2 class="game-tf-title-main game-tf-title-main--side">True and False</h2>
              <p class="game-tf-title-sprint game-tf-title-sprint--side">Sprint</p>
              <span class="game-btn-tf-enter game-btn-tf-enter--side">ENTER</span>
            </div>
            <div class="game-hero-scroll__roller" aria-hidden="true"></div>
          </div>
        </div>`;
    }

    const inner =
      game.preview === "trivia"
        ? buildTriviaIntroContent()
        : buildGenericPreviewContent(game);
    const tvClass =
      game.preview === "trivia" ? "game-tv-set game-tv-set--trivia" : "game-tv-set";

    return `
      <div class="${tvClass}">
        <div class="game-tv-bezel">
          <div class="game-tv-scanlines" aria-hidden="true"></div>
          <div class="game-tv-screen">
            <div class="game-tv-screen__inner">${inner}</div>
          </div>
        </div>
        <div class="game-tv-stand" aria-hidden="true"></div>
      </div>`;
  }

  function getPreviewBackground(previewType) {
    return PREVIEW_BACKGROUNDS[previewType] || PREVIEW_BACKGROUNDS.default;
  }

  function getPreviewLayoutClass(previewType) {
    return `game-card--${previewType === "truefalse" ? "truefalse" : previewType || "tv"}`;
  }

  function applyPreviewLayoutClass(container, game) {
    if (!container || !game) return;
    container.classList.remove(
      "game-card--trivia",
      "game-card--memory",
      "game-card--spot",
      "game-card--slide",
      "game-card--truefalse",
      "game-card--tv",
      "portal-game-screen--trivia",
      "portal-game-screen--memory",
      "portal-game-screen--spot",
      "portal-game-screen--slide",
      "portal-game-screen--truefalse",
      "portal-game-screen--tv",
    );
    const layoutClass = getPreviewLayoutClass(game.preview);
    container.classList.add(layoutClass);
    if (container.classList.contains("portal-game-screen")) {
      container.classList.add(`portal-game-screen--${game.preview || "tv"}`);
    }
  }

  function fitPreviewToFrame(previewRoot) {
    if (!previewRoot) return;
    const launchEl = previewRoot.querySelector("[data-game-launch]");
    if (!launchEl) return;

    launchEl.style.transform = "none";

    if (previewRoot.classList.contains("portal-game-preview-root")) {
      return;
    }

    const frameRect = previewRoot.getBoundingClientRect();
    const previewRect = launchEl.getBoundingClientRect();
    if (
      !frameRect.width ||
      !frameRect.height ||
      !previewRect.width ||
      !previewRect.height
    ) {
      return;
    }

    const scale = Math.min(
      frameRect.width / previewRect.width,
      frameRect.height / previewRect.height,
    );

    launchEl.style.transform =
      Math.abs(scale - 1) > 0.004 ? `scale(${scale})` : "none";

    previewRoot.querySelectorAll("img").forEach((img) => {
      if (!img.complete) {
        img.addEventListener(
          "load",
          () => {
            requestAnimationFrame(() => fitPreviewToFrame(previewRoot));
          },
          { once: true },
        );
      }
    });
  }

  function schedulePreviewFit(previewRoot) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => fitPreviewToFrame(previewRoot));
    });
  }

  let portalDemoCancel = null;
  let portalCountdownInterval = null;

  const PORTAL_TIMER_CONFIG = {
    trivia: {
      start: 10,
      format: "plain",
      ring: { circumference: 283, offsetFull: 56 },
    },
    memory: {
      start: 60,
      format: "suffix",
      bar: { startWidth: 70 },
    },
    spot: { start: 60, format: "suffix" },
    slide: {
      start: 472,
      format: "mmss",
      bar: { startWidth: 84 },
    },
    truefalse: {
      start: 12,
      format: "plain",
      ring: { circumference: 264, offsetFull: 66 },
    },
  };

  function formatPortalTimer(seconds, format) {
    if (format === "suffix") return `${seconds}s`;
    if (format === "mmss") {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return String(seconds);
  }

  function updatePortalTimerRing(ringEl, remaining, start, ringConfig) {
    if (!ringEl || !ringConfig) return;
    const { circumference, offsetFull } = ringConfig;
    const ratio = Math.max(0, Math.min(1, remaining / start));
    const offset = circumference - ratio * (circumference - offsetFull);
    ringEl.style.strokeDashoffset = String(offset);
  }

  function updatePortalTimerBar(barEl, remaining, start, barConfig) {
    if (!barEl || !barConfig) return;
    const ratio = Math.max(0, Math.min(1, remaining / start));
    barEl.style.width = `${ratio * barConfig.startWidth}%`;
  }

  function startPortalCountdown(previewRoot, previewType) {
    const config = PORTAL_TIMER_CONFIG[previewType];
    if (!config || !previewRoot) return;

    const displayEl = previewRoot.querySelector("[data-portal-timer]");
    if (!displayEl) return;

    const ringEl = previewRoot.querySelector("[data-portal-timer-ring]");
    const barEl = previewRoot.querySelector("[data-portal-timer-bar]");
    const shell = previewRoot.querySelector("[data-game-launch]");
    if (shell) shell.classList.add("portal-timer--live");

    let remaining = config.start;

    function tick() {
      displayEl.textContent = formatPortalTimer(remaining, config.format);
      updatePortalTimerRing(ringEl, remaining, config.start, config.ring);
      updatePortalTimerBar(barEl, remaining, config.start, config.bar);

      remaining -= 1;
      if (remaining < 0) remaining = config.start;
    }

    tick();
    portalCountdownInterval = window.setInterval(tick, 1000);
  }

  function stopPortalPreviewDemo() {
    if (typeof portalDemoCancel === "function") {
      portalDemoCancel();
      portalDemoCancel = null;
    }
    if (portalCountdownInterval) {
      window.clearInterval(portalCountdownInterval);
      portalCountdownInterval = null;
    }
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function runTimedDemo(steps, loopDelay) {
    let cancelled = false;
    let timerId = null;

    portalDemoCancel = () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };

    async function cycle() {
      while (!cancelled) {
        for (const step of steps) {
          if (cancelled) return;
          await wait(step.at);
          if (cancelled) return;
          step.run();
        }
        await wait(loopDelay);
      }
    }

    cycle();
  }

  function startMemoryPortalDemo(root) {
    const cards = () =>
      Array.from(root.querySelectorAll(".memory-card[data-promo-index]"));
    const card = (idx) =>
      root.querySelector(`.memory-card[data-promo-index="${idx}"]`);
    const hud = {
      score: root.querySelector(".portal-memory-hud-score"),
      turns: root.querySelector(".portal-memory-hud-turns"),
      pairs: root.querySelector(".portal-memory-hud-pairs"),
      progress: root.querySelector(".portal-memory-pairs-fill"),
    };

    function reset() {
      cards().forEach((el) => {
        el.classList.remove("is-flipped", "is-matched", "is-shake");
      });
      if (hud.score) hud.score.textContent = "0";
      if (hud.turns) hud.turns.textContent = "0";
      if (hud.pairs) hud.pairs.textContent = "0/4";
      if (hud.progress) hud.progress.style.width = "0%";
    }

    function flip(idx, on) {
      const el = card(idx);
      if (el) el.classList.toggle("is-flipped", on);
    }

    function matchPair(first, second, pairNum) {
      [first, second].forEach((idx) => {
        const el = card(idx);
        if (!el) return;
        el.classList.add("is-flipped", "is-matched");
      });
      if (hud.pairs) hud.pairs.textContent = `${pairNum}/4`;
      if (hud.score) hud.score.textContent = String(pairNum * 120);
      if (hud.progress) hud.progress.style.width = `${(pairNum / 4) * 100}%`;
    }

    reset();

    runTimedDemo(
      [
        { at: 900, run: () => flip(2, true) },
        { at: 500, run: () => flip(3, true) },
        {
          at: 700,
          run: () => {
            card(2)?.classList.add("is-shake");
            card(3)?.classList.add("is-shake");
            if (hud.turns) hud.turns.textContent = "1";
          },
        },
        {
          at: 650,
          run: () => {
            flip(2, false);
            flip(3, false);
            card(2)?.classList.remove("is-shake");
            card(3)?.classList.remove("is-shake");
          },
        },
        { at: 900, run: () => flip(0, true) },
        {
          at: 650,
          run: () => {
            flip(4, true);
            matchPair(0, 4, 1);
            if (hud.turns) hud.turns.textContent = "2";
          },
        },
        { at: 900, run: () => flip(1, true) },
        {
          at: 650,
          run: () => {
            flip(6, true);
            matchPair(1, 6, 2);
            if (hud.turns) hud.turns.textContent = "3";
          },
        },
        { at: 2200, run: reset },
      ],
      400,
    );
  }

  function startSpotPortalDemo(root) {
    const foundEl = root.querySelector("[data-spot-found]");
    const scoreEl = root.querySelector("[data-spot-score]");
    const progressText = root.querySelector("[data-spot-progress-text]");
    const progressBar = root.querySelector("[data-spot-progress-bar]");
    const markers = () =>
      Array.from(root.querySelectorAll("[data-spot-marker]"));
    const stars = () => Array.from(root.querySelectorAll("[data-spot-star]"));

    function reset() {
      markers().forEach((m) => m.classList.remove("is-visible"));
      stars().forEach((s) => s.classList.remove("is-found"));
      if (foundEl) foundEl.textContent = "0";
      if (scoreEl) scoreEl.textContent = "0";
      if (progressText) progressText.textContent = "0 of 5 found";
      if (progressBar) progressBar.style.width = "0%";
    }

    function reveal(count) {
      const pts = count * 36;
      if (foundEl) foundEl.textContent = String(count);
      if (scoreEl) scoreEl.textContent = String(pts);
      if (progressText) progressText.textContent = `${count} of 5 found`;
      if (progressBar) progressBar.style.width = `${(count / 5) * 100}%`;
      markers().forEach((m, i) => {
        m.classList.toggle("is-visible", i < count);
      });
      stars().forEach((s, i) => {
        s.classList.toggle("is-found", i < count);
      });
    }

    reset();

    runTimedDemo(
      [
        { at: 800, run: () => reveal(1) },
        { at: 1100, run: () => reveal(2) },
        { at: 1100, run: () => reveal(3) },
        { at: 1100, run: () => reveal(4) },
        { at: 1100, run: () => reveal(5) },
        { at: 1800, run: reset },
      ],
      500,
    );
  }

  function startSlidePortalDemo(root) {
    const board = root.querySelector("[data-slide-board]");
    const badge = root.querySelector("[data-slide-badge]");
    const scoreEl = root.querySelector("[data-slide-score]");
    const movesEl = root.querySelector("[data-slide-moves]");
    const frame = root.querySelector(".portal-puzzle-frame-solved");
    let imgUrl = "";
    let boardState = SLIDE_DEMO_SCRAMBLE.slice();
    let moveCount = 14;

    function getSlideDirection(fromIdx, toIdx) {
      const diff = toIdx - fromIdx;
      if (diff === -1) return "left";
      if (diff === 1) return "right";
      if (diff === -3) return "up";
      if (diff === 3) return "down";
      return "right";
    }

    function renderBoard(state) {
      if (!board) return;
      board.classList.remove("is-unified");
      board.innerHTML = buildSlideBoardTiles(imgUrl, state);
    }

    function renderComplete() {
      if (!board || !imgUrl) return;
      board.classList.add("is-unified");
      board.innerHTML =
        '<div class="portal-puzzle-unified"><img alt="" draggable="false" /></div>';
      const img = board.querySelector("img");
      if (img) img.src = imgUrl;
    }

    function updateHud(moveIndex) {
      moveCount = 14 + moveIndex;
      if (movesEl) movesEl.textContent = String(moveCount);
      if (scoreEl) scoreEl.textContent = String(420 + moveIndex * 15);
      if (badge) {
        badge.textContent =
          moveIndex >= SLIDE_DEMO_MOVES.length
            ? "Complete!"
            : `Move ${moveIndex + 1} of ${SLIDE_DEMO_MOVES.length}`;
        badge.classList.toggle("is-complete", moveIndex >= SLIDE_DEMO_MOVES.length);
      }
      if (frame) {
        frame.classList.toggle("is-complete", moveIndex >= SLIDE_DEMO_MOVES.length);
      }
    }

    function reset() {
      if (!board) return;
      if (!imgUrl) {
        imgUrl = board.dataset.slideImg || "";
      }
      boardState = SLIDE_DEMO_SCRAMBLE.slice();
      moveCount = 14;
      board.classList.remove("is-unified");
      renderBoard(boardState);
      if (frame) frame.classList.remove("is-complete");
      if (badge) {
        badge.textContent = "Solve the puzzle";
        badge.classList.remove("is-complete");
      }
      if (scoreEl) scoreEl.textContent = "420";
      if (movesEl) movesEl.textContent = "14";
    }

    function performMove(moveIndex) {
      const move = SLIDE_DEMO_MOVES[moveIndex];
      if (!board || !move) return;
      if (!imgUrl) imgUrl = board.dataset.slideImg || "";

      const tile = board.querySelector(
        `[data-puzzle-cell="${move.from}"]:not(.portal-puzzle-empty)`,
      );
      const empty = board.querySelector(`[data-puzzle-cell="${move.to}"]`);
      if (!tile || !empty) return;

      const direction = getSlideDirection(move.from, move.to);
      tile.classList.add("portal-puzzle-slide-tile", "is-sliding", `is-sliding-${direction}`);

      window.setTimeout(() => {
        boardState[move.to] = boardState[move.from];
        boardState[move.from] = null;
        const isFinalMove = moveIndex === SLIDE_DEMO_MOVES.length - 1;
        if (isFinalMove) {
          renderComplete();
        } else {
          renderBoard(boardState);
        }
        updateHud(moveIndex + 1);
      }, 420);
    }

    reset();

    runTimedDemo(
      [
        { at: 1100, run: () => performMove(0) },
        { at: 950, run: () => performMove(1) },
        { at: 950, run: () => performMove(2) },
        { at: 950, run: () => performMove(3) },
        { at: 2600, run: reset },
      ],
      700,
    );
  }

  function startPortalPreviewDemo(previewRoot) {
    stopPortalPreviewDemo();
    if (!previewRoot) return;

    const launchEl = previewRoot.querySelector("[data-game-launch]");
    const previewType = launchEl?.dataset?.previewType || "";
    startPortalCountdown(previewRoot, previewType);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const demoRoot = previewRoot.querySelector("[data-portal-demo]");
    if (!demoRoot) return;

    const type = demoRoot.dataset.portalDemo;
    if (type === "memory") startMemoryPortalDemo(demoRoot);
    if (type === "spot") startSpotPortalDemo(demoRoot);
    if (type === "slide") startSlidePortalDemo(demoRoot);
  }

  window.MatiGamePreviews = {
    GAMES,
    buildFeaturedPreview,
    buildPortalFeaturedPreview,
    buildSidePreview,
    buildPortalSidePreview,
    getPreviewBackground,
    applyPreviewLayoutClass,
    fitPreviewToFrame,
    schedulePreviewFit,
    startPortalPreviewDemo,
    stopPortalPreviewDemo,
  };
})();
