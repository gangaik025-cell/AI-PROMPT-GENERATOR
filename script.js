/* ============================================================
   AI Prompt Generator — vanilla JavaScript (upgraded)
   Features: multi-variation, style mixing, detail levels,
   negative prompts, favorites, history, download-as-image, share
   ============================================================ */

/* ---------- Element references ---------- */
const promptInput  = document.getElementById("promptInput");
const styleSelect  = document.getElementById("styleSelect");
const mixSelect    = document.getElementById("mixSelect");
const detailSeg    = document.getElementById("detailSeg");
const negToggle    = document.getElementById("negToggle");
const charCount    = document.getElementById("charCount");
const generateBtn  = document.getElementById("generateBtn");
const randomBtn    = document.getElementById("randomBtn");
const clearBtn     = document.getElementById("clearBtn");
const outputArea   = document.getElementById("outputArea");
const variations   = document.getElementById("variations");
const loader       = document.getElementById("loader");
const placeholder  = outputArea.querySelector(".placeholder");
const favList      = document.getElementById("favList");
const favEmpty     = document.getElementById("favEmpty");
const favCount     = document.getElementById("favCount");
const histList     = document.getElementById("histList");
const histEmpty    = document.getElementById("histEmpty");
const clearHistBtn = document.getElementById("clearHistBtn");
const toast        = document.getElementById("toast");
const cardCanvas   = document.getElementById("cardCanvas");

const FAV_KEY  = "apg_favorites";
const HIST_KEY = "apg_history";

let currentDetail = "detailed";

/* ============================================================
   Style data — prefix + tag pools
   ============================================================ */
const STYLES = {
  "Realistic": {
    prefix: "Ultra detailed realistic",
    tags: ["natural lighting", "lifelike textures", "sharp focus", "photorealistic",
           "high dynamic range", "true-to-life colours", "fine surface detail"]
  },
  "Anime": {
    prefix: "Vibrant anime style",
    tags: ["clean line art", "cel shading", "expressive eyes", "soft colour gradients",
           "studio-quality illustration", "dynamic pose", "crisp detail"]
  },
  "Cinematic": {
    prefix: "Cinematic shot of",
    tags: ["cinematic lighting", "dramatic atmosphere", "realistic shadows",
           "depth of field", "moody colour grade", "film grain", "wide-angle composition"]
  },
  "Fantasy": {
    prefix: "Epic fantasy",
    tags: ["magical atmosphere", "mystical lighting", "ethereal glow",
           "intricate detail", "enchanted environment", "painterly artwork", "rich colours"]
  },
  "3D Render": {
    prefix: "High quality 3D render of",
    tags: ["octane render", "soft global illumination", "subsurface scattering",
           "smooth materials", "studio lighting", "4k textures", "ambient occlusion"]
  },
  "Cyberpunk": {
    prefix: "Cyberpunk",
    tags: ["neon lighting", "futuristic city backdrop", "glowing holograms",
           "rain-soaked streets", "moody atmosphere", "high contrast", "tech-noir vibe"]
  },
  "Minimalist": {
    prefix: "Minimalist",
    tags: ["clean composition", "simple shapes", "muted colour palette",
           "negative space", "elegant", "modern design", "balanced layout"]
  }
};

/* Detail level controls how many tags get used */
const DETAIL_TAGS = { simple: 3, detailed: 5, extreme: 7 };

/* Quality boosters added at the end, scaled by detail level */
const QUALITY = {
  simple:  ["high quality"],
  detailed: ["highly detailed", "8k quality"],
  extreme: ["highly detailed", "8k quality", "masterpiece", "award-winning", "ultra sharp"]
};

/* Negative prompt pool */
const NEGATIVES = [
  "blurry", "low quality", "distorted", "deformed", "extra limbs",
  "bad anatomy", "watermark", "text", "oversaturated", "grainy", "cropped"
];

/* Random idea seeds */
const RANDOM_IDEAS = [
  "a cat sitting on a windowsill", "an ancient dragon over a mountain",
  "a lonely astronaut on a red planet", "a cozy coffee shop in the rain",
  "a samurai standing in a bamboo forest", "a floating island in the sky",
  "a robot tending a flower garden", "a lighthouse during a storm",
  "a fox running through autumn leaves", "a city street glowing at midnight",
  "a wizard reading an old book", "a whale swimming through clouds",
  "a treehouse deep in the jungle", "a vintage car on a desert road",
  "a phoenix rising from embers", "a knight facing a giant in the fog"
];

/* ============================================================
   Helpers
   ============================================================ */
/* Fisher-Yates shuffle — returns a new shuffled copy */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

/* ============================================================
   Core prompt builder — produces ONE variation
   ============================================================ */
function buildVariation(idea, styleName, mixName, detail) {
  const clean = idea.trim().replace(/\s+/g, " ");
  const style = STYLES[styleName];
  const tagCount = DETAIL_TAGS[detail];

  // collect tags from main style, plus a few from the mix style if chosen
  let tagPool = style.tags.slice();
  let prefix = style.prefix;

  if (mixName && STYLES[mixName] && mixName !== styleName) {
    tagPool = tagPool.concat(STYLES[mixName].tags);
    prefix = `${style.prefix} ${mixName.toLowerCase()}-inspired`;
  }

  const chosenTags = pick(tagPool, tagCount);
  const quality = QUALITY[detail];

  const promptText = `${prefix} ${clean}, ${chosenTags.join(", ")}, ${quality.join(", ")}`;

  return promptText;
}

/* Build the negative prompt string */
function buildNegative(detail) {
  const count = DETAIL_TAGS[detail];
  return pick(NEGATIVES, count).join(", ");
}

/* ============================================================
   Generate — produces 3 variations
   ============================================================ */
function handleGenerate() {
  const idea = promptInput.value.trim();
  if (!idea) {
    showToast("Please enter an idea first");
    promptInput.focus();
    return;
  }

  // loading state
  outputArea.classList.remove("done");
  variations.innerHTML = "";
  placeholder.style.display = "none";
  loader.hidden = false;
  generateBtn.disabled = true;

  setTimeout(() => {
    loader.hidden = true;
    outputArea.classList.add("done");
    generateBtn.disabled = false;

    const styleName = styleSelect.value;
    const mixName   = mixSelect.value;
    const useNeg    = negToggle.checked;

    // generate 3 unique-ish variations
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(buildVariation(idea, styleName, mixName, currentDetail));
    }

    results.forEach((text, i) => {
      const neg = useNeg ? buildNegative(currentDetail) : "";
      variations.appendChild(createVariationCard(i + 1, text, neg, styleName));
    });

    // save to history (just the first variation as representative)
    addHistory(results[0], styleName);
    showToast("3 prompts generated");
  }, 700);
}

/* ============================================================
   Build a variation card element
   ============================================================ */
function createVariationCard(index, text, neg, styleName) {
  const card = document.createElement("div");
  card.className = "variation";

  const label = document.createElement("div");
  label.className = "var-label";
  label.textContent = "Variation " + index;

  const body = document.createElement("div");
  body.className = "var-text";
  body.textContent = text;

  card.appendChild(label);
  card.appendChild(body);

  if (neg) {
    const negEl = document.createElement("div");
    negEl.className = "var-neg";
    negEl.innerHTML = "<b>Negative:</b> ";
    negEl.appendChild(document.createTextNode(neg));
    card.appendChild(negEl);
  }

  // full text for copy / save (prompt + negative line)
  const fullText = neg ? `${text}\n\nNegative prompt: ${neg}` : text;

  const actions = document.createElement("div");
  actions.className = "var-actions";

  actions.appendChild(makeChip("copy", "Copy", iconCopy(), () => {
    copyText(fullText, "Prompt copied");
  }));
  actions.appendChild(makeChip("save", "Save", iconStar(), () => {
    saveFavorite(fullText, styleName);
  }));
  actions.appendChild(makeChip("img", "Image", iconImage(), () => {
    downloadCard(text, neg, styleName);
  }));
  if (navigator.share) {
    actions.appendChild(makeChip("copy", "Share", iconShare(), () => {
      sharePrompt(fullText);
    }));
  }

  card.appendChild(actions);
  return card;
}

function makeChip(cls, label, svg, handler) {
  const btn = document.createElement("button");
  btn.className = "chip " + cls;
  btn.innerHTML = svg + "<span>" + label + "</span>";
  btn.addEventListener("click", handler);
  return btn;
}

/* ---------- inline SVG icons ---------- */
function iconCopy() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
}
function iconStar() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
}
function iconImage() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>';
}
function iconShare() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
}
function iconTrash() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
}

/* ============================================================
   Other actions
   ============================================================ */
function handleRandom() {
  promptInput.value = RANDOM_IDEAS[Math.floor(Math.random() * RANDOM_IDEAS.length)];
  updateCounter();
  promptInput.focus();
  showToast("Random idea added");
}

function handleClear() {
  promptInput.value = "";
  updateCounter();
  variations.innerHTML = "";
  outputArea.classList.remove("done");
  placeholder.style.display = "";
  promptInput.focus();
}

function updateCounter() {
  charCount.textContent = promptInput.value.length;
}

/* ============================================================
   Clipboard
   ============================================================ */
function copyText(text, message) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(message))
      .catch(() => fallbackCopy(text, message));
  } else {
    fallbackCopy(text, message);
  }
}
function fallbackCopy(text, message) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); showToast(message); }
  catch { showToast("Copy failed — please copy manually"); }
  document.body.removeChild(ta);
}

/* ============================================================
   Share (native)
   ============================================================ */
function sharePrompt(text) {
  if (navigator.share) {
    navigator.share({ title: "AI Prompt", text: text })
      .catch(() => {/* user cancelled — ignore */});
  } else {
    copyText(text, "Prompt copied (share not supported)");
  }
}

/* ============================================================
   Download as image — uses Canvas, no library
   ============================================================ */
function downloadCard(text, neg, styleName) {
  const ctx = cardCanvas.getContext("2d");
  const W = cardCanvas.width, H = cardCanvas.height;

  // background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#151926");
  grad.addColorStop(1, "#0c0e16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // accent bar
  ctx.fillStyle = "#7c5cff";
  ctx.fillRect(0, 0, W, 14);

  // header
  ctx.fillStyle = "#29d3c2";
  ctx.font = "bold 40px Sora, sans-serif";
  ctx.fillText("AI PROMPT", 70, 110);
  ctx.fillStyle = "#8b91a8";
  ctx.font = "500 26px Sora, sans-serif";
  ctx.fillText(styleName.toUpperCase() + " STYLE", 70, 155);

  // prompt text — word wrapped
  ctx.fillStyle = "#e8eaf2";
  ctx.font = "500 34px Sora, sans-serif";
  let y = 250;
  y = wrapText(ctx, text, 70, y, W - 140, 48);

  // negative prompt
  if (neg) {
    y += 30;
    ctx.fillStyle = "#ff5d6c";
    ctx.font = "500 26px Sora, sans-serif";
    y = wrapText(ctx, "Negative: " + neg, 70, y, W - 140, 38);
  }

  // footer
  ctx.fillStyle = "#565d75";
  ctx.font = "500 24px Sora, sans-serif";
  ctx.fillText("Made with AI Prompt Generator", 70, H - 70);

  // export
  cardCanvas.toBlob(blob => {
    if (!blob) { showToast("Image export failed"); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-prompt.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Image downloaded");
  }, "image/png");
}

/* word-wrap helper for canvas — returns the new y position */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return y + lineHeight;
}

/* ============================================================
   Favorites — localStorage
   ============================================================ */
function getList(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function setList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function saveFavorite(text, styleName) {
  const favorites = getList(FAV_KEY);
  if (favorites.some(f => f.text === text)) {
    showToast("Already in favorites");
    return;
  }
  favorites.unshift({ id: Date.now(), text: text, style: styleName });
  setList(FAV_KEY, favorites);
  renderFavorites();
  showToast("Saved to favorites");
}

function deleteFavorite(id) {
  setList(FAV_KEY, getList(FAV_KEY).filter(f => f.id !== id));
  renderFavorites();
  showToast("Removed from favorites");
}

function renderFavorites() {
  const favorites = getList(FAV_KEY);
  favList.innerHTML = "";
  favCount.textContent = favorites.length;
  favEmpty.style.display = favorites.length ? "none" : "";

  favorites.forEach(fav => {
    const li = document.createElement("li");
    li.className = "fav-item";

    const content = document.createElement("div");
    content.className = "fav-text";

    const styleTag = document.createElement("span");
    styleTag.className = "fav-style";
    styleTag.textContent = fav.style;

    const textNode = document.createElement("div");
    textNode.textContent = fav.text;

    content.appendChild(styleTag);
    content.appendChild(textNode);

    const actions = document.createElement("div");
    actions.className = "fav-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "icon-btn copy";
    copyBtn.title = "Copy";
    copyBtn.innerHTML = iconCopy();
    copyBtn.addEventListener("click", () => copyText(fav.text, "Prompt copied"));

    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn del";
    delBtn.title = "Delete";
    delBtn.innerHTML = iconTrash();
    delBtn.addEventListener("click", () => deleteFavorite(fav.id));

    actions.appendChild(copyBtn);
    actions.appendChild(delBtn);

    li.appendChild(content);
    li.appendChild(actions);
    favList.appendChild(li);
  });
}

/* ============================================================
   History — last 10 prompts
   ============================================================ */
function addHistory(text, styleName) {
  let hist = getList(HIST_KEY);
  hist.unshift({ text: text, style: styleName });
  hist = hist.slice(0, 10);          // keep only the latest 10
  setList(HIST_KEY, hist);
  renderHistory();
}

function renderHistory() {
  const hist = getList(HIST_KEY);
  histList.innerHTML = "";
  histEmpty.style.display = hist.length ? "none" : "";

  hist.forEach(item => {
    const li = document.createElement("li");
    li.className = "hist-item";

    const tag = document.createElement("b");
    tag.textContent = item.style;

    li.appendChild(tag);
    li.appendChild(document.createTextNode(item.text));
    li.title = "Click to copy";
    li.addEventListener("click", () => copyText(item.text, "Copied from history"));
    histList.appendChild(li);
  });
}

function clearHistory() {
  setList(HIST_KEY, []);
  renderHistory();
  showToast("History cleared");
}

/* ============================================================
   Detail level segmented control
   ============================================================ */
detailSeg.addEventListener("click", e => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  detailSeg.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentDetail = btn.dataset.level;
});

/* ============================================================
   Toast
   ============================================================ */
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ============================================================
   Event listeners
   ============================================================ */
generateBtn.addEventListener("click", handleGenerate);
randomBtn.addEventListener("click", handleRandom);
clearBtn.addEventListener("click", handleClear);
clearHistBtn.addEventListener("click", clearHistory);
promptInput.addEventListener("input", updateCounter);
promptInput.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
});

/* ============================================================
   Init
   ============================================================ */
updateCounter();
renderFavorites();
renderHistory();
