import { fetchByBarcode, searchProducts, login, register } from "./api.js";
import { saveSession, clearSession, getUser, isLoggedIn } from "./auth.js";
import { showToast, showSpinner, clearSpinner } from "./ui.js";
import { startScanner, stopScanner } from "./scanner.js";
import { renderProductCard, renderSearchResults } from "./product.js";

const searchInput    = document.getElementById("search-input");
const searchBtn      = document.getElementById("search-btn");
const scanBtn        = document.getElementById("scan-btn");
const scannerSection = document.getElementById("scanner-section");
const resultSection  = document.getElementById("result-section");
const authModal      = document.getElementById("auth-modal");
const authOverlay    = document.getElementById("auth-overlay");
const loginBtn       = document.getElementById("nav-login-btn");
const logoutBtn      = document.getElementById("nav-logout-btn");
const userLabel      = document.getElementById("nav-user-label");
const authTabs       = document.querySelectorAll(".auth-tab");
const authForms      = document.querySelectorAll(".auth-form");
const loginForm      = document.getElementById("login-form");
const registerForm   = document.getElementById("register-form");
const authClose      = document.getElementById("auth-close");
const torchBtn       = document.getElementById("torch-btn");

let scannerOpen = false;
let torchOn = false;
let currentScanner = null;

updateNavAuth();

// ── Search ────────────────────────────────────────────────────────────────────
searchBtn.addEventListener("click", handleSearch);
searchInput.addEventListener("keydown", (e) => e.key === "Enter" && handleSearch());

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  showSpinner(resultSection);

  if (/^\d{6,14}$/.test(query)) {
    try {
      const product = await fetchByBarcode(query);
      renderProductCard(product, resultSection);
      return;
    } catch { /* fall through to name search */ }
  }

  try {
    const products = await searchProducts(query);
    const list = Array.isArray(products) ? products : [];
    renderSearchResults(list, resultSection, (p) => renderProductCard(p, resultSection));
  } catch (err) {
    clearSpinner(resultSection);
    resultSection.innerHTML = `<p class="error-msg">❌ ${err.message}</p>`;
    showToast(err.message, "error");
  }
}

// ── Scanner ───────────────────────────────────────────────────────────────────
scanBtn.addEventListener("click", toggleScanner);

function toggleScanner() {
  if (scannerOpen) {
    stopScanner();
    scannerSection.classList.add("hidden");
    scanBtn.textContent = "📷 Scan Barcode";
    torchBtn.style.display = "none";
    torchOn = false;
    scannerOpen = false;
    currentScanner = null;
  } else {
    scannerSection.classList.remove("hidden");
    scanBtn.textContent = "✖ Close Scanner";
    scannerOpen = true;

    currentScanner = startScanner("qr-reader", async (barcode) => {
      scannerSection.classList.add("hidden");
      scanBtn.textContent = "📷 Scan Barcode";
      torchBtn.style.display = "none";
      torchOn = false;
      scannerOpen = false;
      currentScanner = null;
      searchInput.value = barcode;
      showSpinner(resultSection);
      try {
        const product = await fetchByBarcode(barcode);
        renderProductCard(product, resultSection);
        showToast(`Found: ${product.name || barcode}`, "success");
      } catch (err) {
        clearSpinner(resultSection);
        resultSection.innerHTML = `<p class="error-msg">❌ ${err.message}</p>`;
        showToast(err.message, "error");
      }
    }, () => {
      // onReady callback — show torch button if supported
      torchBtn.style.display = "inline-flex";
    });
  }
}

// ── Torch ─────────────────────────────────────────────────────────────────────
torchBtn?.addEventListener("click", async () => {
  if (!currentScanner) return;
  try {
    torchOn = !torchOn;
    await currentScanner.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
    torchBtn.textContent = torchOn ? "🔦 Flash On" : "🔦 Toggle Flash";
  } catch {
    showToast("Flash not supported on this device", "info");
  }
});

// ── Alt card clicks ───────────────────────────────────────────────────────────
document.addEventListener("click", async (e) => {
  const alt = e.target.closest(".alt-card");
  if (!alt) return;
  const barcode = alt.dataset.barcode;
  if (!barcode) return;
  showSpinner(resultSection);
  try {
    const product = await fetchByBarcode(barcode);
    renderProductCard(product, resultSection);
    resultSection.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    clearSpinner(resultSection);
    showToast(err.message, "error");
  }
});

// ── Auth modal ────────────────────────────────────────────────────────────────
loginBtn?.addEventListener("click", () => openAuthModal("login"));
logoutBtn?.addEventListener("click", () => { clearSession(); updateNavAuth(); showToast("Logged out", "info"); });
authOverlay?.addEventListener("click", closeAuthModal);
authClose?.addEventListener("click", closeAuthModal);

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const t = tab.dataset.tab;
    authTabs.forEach((x) => x.classList.toggle("active", x.dataset.tab === t));
    authForms.forEach((f) => f.classList.toggle("hidden", f.id !== `${t}-form`));
  });
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const { token, user } = await login(
      loginForm.querySelector("[name=email]").value.trim(),
      loginForm.querySelector("[name=password]").value
    );
    saveSession(token, user);
    updateNavAuth();
    closeAuthModal();
    showToast(`Welcome back, ${user.name || user.email}!`, "success");
  } catch (err) { showToast(err.message, "error"); }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const { token, user } = await register(
      registerForm.querySelector("[name=email]").value.trim(),
      registerForm.querySelector("[name=password]").value,
      registerForm.querySelector("[name=name]").value.trim()
    );
    saveSession(token, user);
    updateNavAuth();
    closeAuthModal();
    showToast(`Welcome, ${user.name || user.email}!`, "success");
  } catch (err) { showToast(err.message, "error"); }
});

function openAuthModal(tab = "login") {
  authModal.classList.remove("hidden");
  authTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  authForms.forEach((f) => f.classList.toggle("hidden", f.id !== `${tab}-form`));
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function updateNavAuth() {
  const user = getUser();
  if (isLoggedIn() && user) {
    loginBtn  && loginBtn.classList.add("hidden");
    logoutBtn && logoutBtn.classList.remove("hidden");
    userLabel && (userLabel.textContent = user.name || user.email);
    userLabel && userLabel.classList.remove("hidden");
  } else {
    loginBtn  && loginBtn.classList.remove("hidden");
    logoutBtn && logoutBtn.classList.add("hidden");
    userLabel && userLabel.classList.add("hidden");
  }
}
