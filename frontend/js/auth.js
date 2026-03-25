const TOKEN_KEY = "ss_token";
const USER_KEY  = "ss_user";

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
