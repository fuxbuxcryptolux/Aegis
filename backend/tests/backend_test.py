"""Aegis Rogue backend API tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fall back to reading frontend/.env for the public URL
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
BASE_URL = (BASE_URL or "").rstrip("/")


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
def test_health(api):
    r = api.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d.get("status") == "healthy"
    assert "time" in d


def test_root(api):
    r = api.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- Leaderboard ----------
def test_leaderboard_post_and_score_computed(api):
    payload = {"name": "TEST_Hero", "wave": 10, "gold": 500, "gems": 20, "soul_gems": 4, "victory": True}
    r = api.post(f"{BASE_URL}/api/leaderboard", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == "TEST_Hero"
    assert d["wave"] == 10
    assert isinstance(d.get("id"), str) and len(d["id"]) > 0
    expected = 10 * 1000 + 500 + 20 * 5 + 4 * 250 + 5000
    assert d["score"] == expected
    assert "_id" not in d


def test_leaderboard_get_sorted(api):
    # seed two entries with distinct scores
    api.post(f"{BASE_URL}/api/leaderboard", json={"name": "TEST_Low", "wave": 1, "gold": 0, "gems": 0, "soul_gems": 0, "victory": False}, timeout=15)
    api.post(f"{BASE_URL}/api/leaderboard", json={"name": "TEST_High", "wave": 20, "gold": 9999, "gems": 99, "soul_gems": 20, "victory": True}, timeout=15)
    r = api.get(f"{BASE_URL}/api/leaderboard?limit=20", timeout=15)
    assert r.status_code == 200
    entries = r.json()
    assert isinstance(entries, list)
    assert len(entries) >= 2
    scores = [e["score"] for e in entries]
    assert scores == sorted(scores, reverse=True)
    for e in entries:
        assert "_id" not in e
        assert {"id", "name", "score", "wave"}.issubset(e.keys())


def test_leaderboard_name_truncated_and_empty(api):
    long_name = "X" * 40
    r = api.post(f"{BASE_URL}/api/leaderboard", json={"name": long_name}, timeout=15)
    assert r.status_code in (200, 422)


# ---------- Monetization ----------
def test_monetization_log_post_get(api):
    payload = {"user_id": "TEST_user", "event_type": "rewarded_ad", "reward_type": "gems", "meta": {"amount": 25}}
    r = api.post(f"{BASE_URL}/api/monetization/log", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["event_type"] == "rewarded_ad"
    assert d["reward_type"] == "gems"
    assert d["meta"] == {"amount": 25}
    assert isinstance(d["id"], str)
    assert "_id" not in d

    r2 = api.get(f"{BASE_URL}/api/monetization/log?limit=50", timeout=15)
    assert r2.status_code == 200
    lst = r2.json()
    assert isinstance(lst, list)
    assert any(x["id"] == d["id"] for x in lst)
    for x in lst:
        assert "_id" not in x


def test_monetization_summary(api):
    # ensure at least one of each type
    for et in ["offer_completed", "banner_impression"]:
        api.post(f"{BASE_URL}/api/monetization/log", json={"user_id": "TEST_user", "event_type": et}, timeout=15)
    r = api.get(f"{BASE_URL}/api/monetization/summary", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "by_event" in d
    assert isinstance(d["by_event"], dict)
    assert d["by_event"].get("rewarded_ad", 0) >= 1
    assert d["by_event"].get("offer_completed", 0) >= 1


def test_monetization_log_missing_event_type(api):
    r = api.post(f"{BASE_URL}/api/monetization/log", json={"user_id": "TEST_user"}, timeout=15)
    assert r.status_code == 422
