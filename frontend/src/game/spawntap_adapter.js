/**
 * SpawnTap Playtime SDK & Rewarded Events Adapter
 * Bridge between the game and SpawnTap SDK monetization triggers.
 * Falls back to safe mock mode when the SDK is blocked / offline.
 */
class SpawnTapAdapter {
  constructor(config = {}) {
    this.appId = config.appId || "YOUR_SPAWNTAP_APP_ID";
    this.userId = config.userId || this._getOrCreateUserId();
    this.debug = config.debug !== undefined ? config.debug : true;

    this.isLoaded = false;
    this.playtimeTimer = null;
    this.secondsPlayed = 0;

    this.listeners = {
      onRewardGranted: [],
      onPlaytimeMilestone: [],
      onOfferCompleted: [],
      onStatusChange: [],
    };

    this.status = "connecting";
    this.init();
  }

  init() {
    this._log("Initializing SpawnTap Bridge...");
    if (window.SpawnTap) {
      this._onSdkReady();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://sdk.spawntap.com/v1/spawntap.js?appId=${encodeURIComponent(this.appId)}`;
    script.async = true;
    script.onload = () => {
      this._log("SpawnTap SDK script loaded.");
      this._onSdkReady();
    };
    script.onerror = () => {
      this._warn("SpawnTap SDK failed to load (adblock/offline). Fallback mock mode active.");
      this.isLoaded = false;
      this._setStatus("mock");
      this.startPlaytimeTracking();
    };
    document.head.appendChild(script);
    // Do not wait forever for a domain that likely won't resolve in dev.
    setTimeout(() => {
      if (!this.isLoaded && this.status === "connecting") {
        this._setStatus("mock");
        this.startPlaytimeTracking();
      }
    }, 2500);
  }

  _onSdkReady() {
    this.isLoaded = true;
    if (window.SpawnTap && typeof window.SpawnTap.init === "function") {
      window.SpawnTap.init({ appId: this.appId, userId: this.userId });
    }
    this._setStatus("live");
    this.startPlaytimeTracking();
  }

  _setStatus(s) {
    this.status = s;
    this._emit("onStatusChange", { status: s, userId: this.userId });
  }

  startPlaytimeTracking() {
    if (this.playtimeTimer) return;
    this._log("Starting playtime tracker...");
    this.playtimeTimer = setInterval(() => {
      this.secondsPlayed += 1;
      if (this.secondsPlayed % 60 === 0) {
        this._pingPlaytime(this.secondsPlayed / 60);
      }
    }, 1000);
  }

  stopPlaytimeTracking() {
    if (this.playtimeTimer) {
      clearInterval(this.playtimeTimer);
      this.playtimeTimer = null;
    }
  }

  _pingPlaytime(minutes) {
    this._log(`Playtime ping: ${minutes} minute(s).`);
    if (this.isLoaded && window.SpawnTap && typeof window.SpawnTap.trackEvent === "function") {
      window.SpawnTap.trackEvent("playtime_ping", { minutes, userId: this.userId });
    }
    this._emit("onPlaytimeMilestone", { minutes, totalSeconds: this.secondsPlayed });
  }

  showRewardedAd(rewardType) {
    return new Promise((resolve) => {
      this._log(`Requesting rewarded ad: ${rewardType}`);
      if (this.isLoaded && window.SpawnTap && typeof window.SpawnTap.showRewarded === "function") {
        window.SpawnTap.showRewarded({
          rewardType,
          userId: this.userId,
          onSuccess: () => {
            this._emit("onRewardGranted", { rewardType });
            resolve({ success: true, rewardType });
          },
          onClose: () => resolve({ success: false, rewardType, reason: "user_closed" }),
          onError: (err) => resolve({ success: false, rewardType, reason: "sdk_error", err }),
        });
      } else {
        this._simulateMockAd(rewardType, resolve);
      }
    });
  }

  _simulateMockAd(rewardType, resolve) {
    this._log(`[MOCK] Simulating rewarded ad: ${rewardType}`);
    setTimeout(() => {
      this._emit("onRewardGranted", { rewardType, isMock: true });
      resolve({ success: true, rewardType, isMock: true });
    }, 300);
  }

  openOfferwall(containerId = null) {
    this._log("Opening Offerwall...");
    if (this.isLoaded && window.SpawnTap && typeof window.SpawnTap.openOfferwall === "function") {
      window.SpawnTap.openOfferwall({
        containerId,
        userId: this.userId,
        onRewardCallback: (rewardData) => this._emit("onOfferCompleted", rewardData),
      });
      return true;
    }
    return false; // caller renders fallback UI
  }

  on(eventName, cb) {
    if (this.listeners[eventName]) this.listeners[eventName].push(cb);
  }

  _emit(eventName, data) {
    if (this.listeners[eventName]) this.listeners[eventName].forEach((cb) => cb(data));
  }

  _getOrCreateUserId() {
    let uid = localStorage.getItem("spawntap_user_id");
    if (!uid) {
      uid = "usr_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem("spawntap_user_id", uid);
    }
    return uid;
  }

  _log(...a) {
    if (this.debug) console.log("[SpawnTapAdapter]", ...a);
  }
  _warn(...a) {
    if (this.debug) console.warn("[SpawnTapAdapter]", ...a);
  }
}

export default SpawnTapAdapter;
