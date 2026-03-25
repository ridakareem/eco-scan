import { fetchHistory, deleteHistoryItem } from "./api.js";
import { isLoggedIn, getUser, clearSession } from "./auth.js";
import { showToast } from "./ui.js";

// ── Nav auth wiring ──────────────────────────────────────────────────────────
const navLoginBtn  = document.getElementById("nav-login-btn");
const navLogoutBtn = document.getElementById("nav-logout-btn");
const navUserLabel = document.getElementById("nav-user-label");

function updateNavAuth() {
  const user = getUser();
  if (isLoggedIn() && user) {
    navLoginBtn  && navLoginBtn.classList.add("hidden");
    navLogoutBtn && navLogoutBtn.classList.remove("hidden");
    navUserLabel && (navUserLabel.textContent = user.name || user.email);
    navUserLabel && navUserLabel.classList.remove("hidden");
  } else {
    navLoginBtn  && navLoginBtn.classList.remove("hidden");
    navLogoutBtn && navLogoutBtn.classList.add("hidden");
    navUserLabel && navUserLabel.classList.add("hidden");
  }
}
updateNavAuth();

navLoginBtn?.addEventListener("click",  () => { window.location.href = "index.html"; });
navLogoutBtn?.addEventListener("click", () => {
  clearSession();
  updateNavAuth();
  showToast("Logged out", "info");
  setTimeout(() => loadHistory(), 300);
});

const historyList    = document.getElementById("history-list");
const emptyState     = document.getElementById("history-empty");
const loginPrompt    = document.getElementById("history-login-prompt");

async function loadHistory() {
  if (!isLoggedIn()) {
    historyList && (historyList.innerHTML = "");
    loginPrompt && loginPrompt.classList.remove("hidden");
    emptyState  && emptyState.classList.add("hidden");
    return;
  }

  loginPrompt && loginPrompt.classList.add("hidden");

  try {
    const items = await fetchHistory();
    renderHistory(items);
  } catch (err) {
    showToast(err.message, "error");
    historyList.innerHTML = `<p class="error-msg">Failed to load history.</p>`;
  }
}

function renderHistory(items) {
  if (!items || items.length === 0) {
    historyList && (historyList.innerHTML = "");
    emptyState  && emptyState.classList.remove("hidden");
    return;
  }

  emptyState && emptyState.classList.add("hidden");

  const gradeColors = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", E: "#ef4444" };

  historyList.innerHTML = `
    <ul class="history-ul">
      ${items.map((item) => {
        const color = gradeColors[item.grade] || "#6b7280";
        const date  = item.scanned_at
          ? new Date(item.scanned_at).toLocaleString()
          : "";
        return `
          <li class="history-item" data-id="${item._id}">
            ${item.image_url
              ? `<img class="history-img" src="${item.image_url}" alt="${item.name}" loading="lazy"/>`
              : `<div class="history-img-placeholder">📦</div>`}
            <div class="history-info">
              <p class="history-name">${item.name || item.barcode || "—"}</p>
              <p class="history-barcode">${item.barcode || ""}</p>
              <p class="history-date">${date}</p>
            </div>
            <span class="history-grade" style="background:${color}">${item.grade || "?"}</span>
            <button class="history-delete-btn" data-id="${item._id}" title="Remove">✕</button>
          </li>
        `;
      }).join("")}
    </ul>
  `;

  historyList.querySelectorAll(".history-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      try {
        await deleteHistoryItem(id);
        btn.closest(".history-item").remove();
        const remaining = historyList.querySelectorAll(".history-item");
        if (remaining.length === 0) {
          emptyState && emptyState.classList.remove("hidden");
        }
        showToast("Removed from history", "info");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

loadHistory();
