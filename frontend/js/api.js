const TOKEN_KEY = "ss_token";
const USER_KEY  = "ss_user";

const BASE_URL = "http://192.168.56.1:5000/api";

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
}

export function isLoggedIn() {
  return !!getToken();
}

function authHeaders() {
  const token = getToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchByBarcode(barcode) {
  const res = await fetch(`${BASE_URL}/products/barcode/${barcode}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function searchProducts(query) {
  const res = await fetch(`${BASE_URL}/products/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchAlternatives(barcode) {
  const res = await fetch(`${BASE_URL}/products/${barcode}/alternatives`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function register(email, password, name) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password, name }),
  });
  return handleResponse(res);
}

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function fetchProfile() {
  const res = await fetch(`${BASE_URL}/auth/profile`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchHistory() {
  const res = await fetch(`${BASE_URL}/history/`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function deleteHistoryItem(id) {
  const res = await fetch(`${BASE_URL}/history/${id}`, { method: "DELETE", headers: authHeaders() });
  return handleResponse(res);
}