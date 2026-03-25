export function buildScoreRing(score, grade) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = circ * pct;
  const gradeColors = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", E: "#ef4444" };
  const color = gradeColors[grade] || "#6b7280";
  return `
    <svg class="score-ring" viewBox="0 0 120 120" aria-label="Score ${score}">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none"
        stroke="${color}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${dash} ${circ}"
        stroke-dashoffset="${circ * 0.25}"
        style="transition:stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1);"/>
      <text x="60" y="54" text-anchor="middle" class="ring-score">${Math.round(score)}</text>
      <text x="60" y="70" text-anchor="middle" class="ring-label">/ 100</text>
    </svg>
    <span class="grade-badge" style="background:${color};" aria-label="Grade ${grade}">${grade}</span>
  `;
}

const FACTOR_LABELS = {
  carbon: "Carbon Impact", packaging: "Packaging", recyclability: "Recyclability",
  certifications: "Certifications", origin: "Origin",
};

export function buildBreakdownBars(factors) {
  if (!factors) return "";
  return Object.entries(factors).map(([key, { score, note, weight }]) => {
    const pct = Math.round(score);
    const color = pct >= 70 ? "#22c55e" : pct >= 45 ? "#eab308" : "#ef4444";
    return `
      <div class="factor-row">
        <div class="factor-header">
          <span class="factor-name">${FACTOR_LABELS[key] || key}</span>
          <span class="factor-note">${note}</span>
          <span class="factor-score" style="color:${color}">${pct}</span>
        </div>
        <div class="factor-bar-track">
          <div class="factor-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <div class="factor-weight">weight ${Math.round(weight * 100)}%</div>
      </div>`;
  }).join("");
}

export function buildConfidenceBadge(product) {
  const hasNova    = !!product.nova_group;
  const hasNutri   = !!product.nutriscore_grade;
  const hasEco     = !!product.ecoscore_grade;
  const hasLabels  = (product.labels_tags || []).length > 0;
  const hasPackage = (product.packaging_tags || []).length > 0;
  const filled = [hasNova, hasNutri || hasEco, hasLabels, hasPackage].filter(Boolean).length;
  const level = filled >= 3 ? "high" : filled >= 2 ? "medium" : "low";
  const label = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }[level];
  return `<span class="confidence-badge confidence-${level}">${label}</span>`;
}

export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container") || (() => {
    const el = document.createElement("div");
    el.id = "toast-container";
    document.body.appendChild(el);
    return el;
  })();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3500);
}

export function showSpinner(container) {
  container.innerHTML = `
    <div class="spinner-wrap">
      <div class="spinner"></div>
      <p class="spinner-label">Scanning…</p>
    </div>`;
}

export function clearSpinner(container) {
  container.innerHTML = "";
}
