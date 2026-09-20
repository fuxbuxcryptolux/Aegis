import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 8000 });

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
