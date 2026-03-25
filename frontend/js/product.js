import { buildScoreRing, buildBreakdownBars, buildConfidenceBadge } from "./ui.js";
import { fetchAlternatives } from "./api.js";

const GRADE_COLORS = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", E: "#ef4444" };
const GRADE_ORDER  = { A: 5, B: 4, C: 3, D: 2, E: 1 };

// ── Main product card ─────────────────────────────────────────────────────────
export function renderProductCard(product, container) {
  const s     = product.sustainability || {};
  const score = s.score ?? 0;
  const grade = s.grade ?? "?";

  container.innerHTML = `
    <div class="product-card" data-barcode="${product.barcode || ""}">

      <div class="product-hero">
        ${product.image_url
          ? `<img class="product-img" src="${product.image_url}" alt="${product.name}" loading="lazy"/>`
          : `<div class="product-img-placeholder"><span>📦</span></div>`}
        <div class="product-meta">
          <h2 class="product-name">${product.name || "Unknown product"}</h2>
          ${product.brands  ? `<p class="product-brand">${product.brands}</p>`  : ""}
          ${product.quantity ? `<p class="product-qty">${product.quantity}</p>` : ""}
          ${buildConfidenceBadge(product)}
          <p class="product-source">Source: ${product.source || "unknown"}</p>
        </div>
      </div>

      <div class="score-section">
        <div class="score-ring-wrap">${buildScoreRing(score, grade)}</div>
        <div class="breakdown-wrap">
          <h3 class="breakdown-title">Score Breakdown</h3>
          ${buildBreakdownBars(s.factors || {})}
        </div>
      </div>

      <!-- Recommendations panel -->
      <div class="reco-panel" id="reco-panel">
        <div class="reco-header">
          <div class="reco-header-left">
            <span class="reco-icon">🌿</span>
            <div>
              <h3 class="reco-title">Greener Alternatives</h3>
              <p class="reco-subtitle">Products with a better sustainability score</p>
            </div>
          </div>
          <button class="reco-refresh-btn" id="reco-refresh" title="Refresh recommendations">
            ↻ Refresh
          </button>
        </div>
        <div class="reco-body" id="reco-body">
          ${recoLoadingHTML()}
        </div>
      </div>

    </div>`;

  // Animate bars
  requestAnimationFrame(() => {
    container.querySelectorAll(".factor-bar-fill").forEach((bar) => {
      bar.style.transition = "width 0.6s cubic-bezier(.4,0,.2,1)";
    });
  });

  // Load recommendations
  if (product.barcode) {
    loadRecommendations(product, container);

    document.getElementById("reco-refresh")?.addEventListener("click", () => {
      document.getElementById("reco-body").innerHTML = recoLoadingHTML();
      loadRecommendations(product, container, true);
    });
  } else {
    document.getElementById("reco-panel").style.display = "none";
  }
}

// ── Load & render recommendations ─────────────────────────────────────────────
async function loadRecommendations(product, container, forceRefresh = false) {
  const body = document.getElementById("reco-body");
  if (!body) return;

  try {
    const alts = await fetchAlternatives(product.barcode);

    if (!Array.isArray(alts) || alts.length === 0) {
      body.innerHTML = recoEmptyHTML(product);
      return;
    }

    body.innerHTML = `
      <div class="reco-current-bar">
        <span class="reco-current-label">Current product</span>
        <span class="reco-current-score">
          Score <strong>${Math.round(product.sustainability?.score ?? 0)}</strong>
          <span class="reco-grade-chip" style="background:${GRADE_COLORS[product.sustainability?.grade] || "#6b7280"}">
            ${product.sustainability?.grade || "?"}
          </span>
        </span>
      </div>
      <div class="reco-list">
        ${alts.map((alt) => renderRecoCard(alt, product.sustainability?.score ?? 0)).join("")}
      </div>
      <p class="reco-hint">Click any alternative to view its full score breakdown</p>
    `;

    // Wire up clicks
    body.querySelectorAll(".reco-card").forEach((card) => {
      card.addEventListener("click", () => {
        const altProduct = JSON.parse(card.dataset.product);
        const resultSection = document.getElementById("result-section");
        if (resultSection) renderProductCard(altProduct, resultSection);
        resultSection?.scrollIntoView({ behavior: "smooth" });
      });
    });

  } catch (err) {
    body.innerHTML = recoErrorHTML();
  }
}

// ── Recommendation card ───────────────────────────────────────────────────────
function renderRecoCard(alt, currentScore) {
  const s          = alt.sustainability || {};
  const altScore   = s.score ?? 0;
  const altGrade   = s.grade ?? "?";
  const color      = GRADE_COLORS[altGrade] || "#6b7280";
  const scoreDiff  = Math.round(altScore - currentScore);
  const gradeUp    = (GRADE_ORDER[altGrade] ?? 0) > (GRADE_ORDER[s.grade] ?? 0);
  const diffLabel  = scoreDiff > 0 ? `+${scoreDiff} pts` : `${scoreDiff} pts`;
  const diffColor  = scoreDiff > 0 ? "#22c55e" : "#f97316";

  // Serialize safely for data attr
  const safeProduct = JSON.stringify(alt).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

  return `
    <div class="reco-card" role="button" tabindex="0" data-product="${safeProduct}">
      <div class="reco-card-img-wrap">
        ${alt.image_url
          ? `<img class="reco-card-img" src="${alt.image_url}" alt="${alt.name}" loading="lazy"/>`
          : `<div class="reco-card-img-placeholder">📦</div>`}
      </div>
      <div class="reco-card-info">
        <p class="reco-card-name">${alt.name || "—"}</p>
        <p class="reco-card-brand">${alt.brands || ""}</p>
        <div class="reco-card-factors">
          ${renderMiniFactors(s.factors || {})}
        </div>
      </div>
      <div class="reco-card-score-col">
        <span class="reco-card-grade" style="background:${color}">${altGrade}</span>
        <span class="reco-card-score">${Math.round(altScore)}</span>
        <span class="reco-card-diff" style="color:${diffColor}">${diffLabel}</span>
      </div>
    </div>`;
}

// Mini factor dots for the reco card
function renderMiniFactors(factors) {
  const keys = ["carbon", "packaging", "recyclability", "certifications", "origin"];
  const labels = { carbon: "CO₂", packaging: "Pack", recyclability: "♻", certifications: "Cert", origin: "Origin" };
  return keys.map((k) => {
    const val = (factors[k]?.score ?? 50);
    const c   = val >= 70 ? "#22c55e" : val >= 45 ? "#eab308" : "#ef4444";
    return `<span class="mini-factor" title="${labels[k]}: ${Math.round(val)}">
      <span class="mini-factor-dot" style="background:${c}"></span>
      <span class="mini-factor-label">${labels[k]}</span>
    </span>`;
  }).join("");
}

// ── State HTML helpers ────────────────────────────────────────────────────────
function recoLoadingHTML() {
  return `
    <div class="reco-loading">
      <div class="reco-spinner"></div>
      <p>Finding greener alternatives…</p>
    </div>`;
}

function recoEmptyHTML(product) {
  return `
    <div class="reco-empty">
      <div class="reco-empty-icon">✅</div>
      <p class="reco-empty-title">Already one of the better options</p>
      <p class="reco-empty-sub">No products with a higher sustainability score were found in this category.</p>
    </div>`;
}

function recoErrorHTML() {
  return `
    <div class="reco-empty">
      <div class="reco-empty-icon">⚠️</div>
      <p class="reco-empty-title">Could not load alternatives</p>
      <p class="reco-empty-sub">Check your connection and try refreshing.</p>
    </div>`;
}

// ── Search results list ───────────────────────────────────────────────────────
export function renderSearchResults(products, container, onSelect) {
  if (!products || products.length === 0) {
    container.innerHTML = `<p class="no-results">No products found.</p>`;
    return;
  }
  container.innerHTML = `
    <p class="search-results-header">${products.length} result${products.length !== 1 ? "s" : ""} — click one to see its full sustainability score</p>
    <ul class="search-results-list">
      ${products.map((p, i) => {
        const s     = p.sustainability || {};
        const color = GRADE_COLORS[s.grade] || "#6b7280";
        const score = Math.round(s.score ?? 0);
        return `
          <li class="search-result-item" data-index="${i}" role="button" tabindex="0">
            ${p.image_url
              ? `<img class="sr-img" src="${p.image_url}" alt="${p.name}" loading="lazy"/>`
              : `<span class="sr-img-placeholder">📦</span>`}
            <div class="sr-info">
              <p class="sr-name">${p.name || "—"}</p>
              <p class="sr-brand">${p.brands || ""}</p>
            </div>
            <div class="sr-score-col">
              <span class="sr-grade" style="background:${color}">${s.grade || "?"}</span>
              <span class="sr-score">${score}</span>
            </div>
          </li>`;
      }).join("")}
    </ul>`;

  container.querySelectorAll(".search-result-item").forEach((item) => {
    const handler = () => onSelect(products[parseInt(item.dataset.index, 10)]);
    item.addEventListener("click", handler);
    item.addEventListener("keydown", (e) => e.key === "Enter" && handler());
  });
}
