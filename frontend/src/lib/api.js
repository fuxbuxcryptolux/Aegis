import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 8000, withCredentials: true });

export async function getCurrentUser() {
  const { data } = await http.get("/auth/me");
  return data;
}

export async function logout() {
  try {
    await http.post("/auth/logout");
  } catch (e) {
    // Clear the local session view even if the server is unavailable.
  }
}

export async function getCloudSave() {
  try {
    const { data } = await http.get("/account/save");
    return data;
  } catch (e) {
    return null;
  }
}

export async function saveCloudState(state) {
  try {
    const { data } = await http.put("/account/save", { state });
    return data;
  } catch (e) {
    return null;
  }
}

export async function submitScore(payload) {
  try {
    const { data } = await http.post("/leaderboard", payload);
    return data;
  } catch (e) {
    return null;
  }
}

export async function fetchLeaderboard(limit = 20) {
  try {
    const { data } = await http.get(`/leaderboard?limit=${limit}`);
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function logMonetization(payload) {
  try {
    const { data } = await http.post("/monetization/log", payload);
    return data;
  } catch (e) {
    return null; // never block gameplay on logging
  }
}

export async function createStripeCheckout(payload) {
  try {
    const { data } = await http.post("/monetization/stripe-checkout", payload);
    return data;
  } catch (e) {
    return null;
  }
}
