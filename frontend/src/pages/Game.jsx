import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import GameEngine from "@/game/engine";
import SpawnTapAdapter from "@/game/spawntap_adapter";
import audio from "@/game/audio";
import { drawPerks, gemUpgradeCost } from "@/game/config";
import { loadSave, writeSave, clearSave, loadMeta, writeMeta } from "@/game/storage";
import { ACHIEVEMENTS, getDailyEngagement, normalizeAchievementProgress, normalizeDailyProgress } from "@/game/engagement";
import { createStripeCheckout, submitScore, logMonetization } from "@/lib/api";

import { AdBanner } from "@/components/game/AdBanner";
import HUD from "@/components/game/HUD";
import TowerDrawer from "@/components/game/TowerDrawer";
import DraftModal from "@/components/game/DraftModal";
import DefeatModal from "@/components/game/DefeatModal";
import VictoryModal from "@/components/game/VictoryModal";
import VaultModal from "@/components/game/VaultModal";
import LeaderboardModal from "@/components/game/LeaderboardModal";
import DailyChallengeModal from "@/components/game/DailyChallengeModal";
import AdInterstitial from "@/components/game/AdInterstitial";
import StartScreen from "@/components/game/StartScreen";
import GemStoreModal from "@/components/game/GemStoreModal";

function getImpactCountdown() {
  const metaData = loadMeta();
  const deadline = Number(metaData.hordeImpactAt || 0);
  const safeDeadline = deadline > 0 ? deadline : Date.now() + 24 * 60 * 60 * 1000;
  if (!metaData.hordeImpactAt) {
    metaData.hordeImpactAt = safeDeadline;
    writeMeta(metaData);
  }
  const totalSeconds = Math.max(0, Math.floor((safeDeadline - Date.now()) / 1000));
  return { totalSeconds };
}

const INITIAL = {
  nexusHP: 100, maxNexusHP: 100, gold: 300, gems: 0, soulGems: 0, prestigeLevel: 0, activePath: [],
  wave: 0, maxWave: 20, waveStatus: "idle", isBoss: false, nextBoss: 5, gameSpeed: 1,
  paused: false, selectedTower: null, enemiesRemaining: 0, towersPlaced: 0, maxTowers: 6,
  perks: [], heroCooldowns: { nuke: 0, freeze: 0, heal: 0 }, lastWaveLoot: { gold: 0, gems: 0 }, selectedPlaced: null,
};

function getHordeImpactCountdown() {
  const stored = Number(loadMeta().hordeImpactAt || 0);
  const base = stored > 0 ? stored : Date.now() + 24 * 60 * 60 * 1000;
  if (!stored) {
    const metaData = loadMeta();
    metaData.hordeImpactAt = base;
    writeMeta(metaData);
  }
  return Math.max(0, Math.ceil((base - Date.now()) / 1000));
}

export default function Game() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const engineRef = useRef(null);
  const spawntapRef = useRef(null);
  const adResolveRef = useRef(null);

  const meta = useRef(loadMeta()).current;

  const [state, setState] = useState(INITIAL);
  const [daily, setDaily] = useState(getDailyEngagement());
  const [dailyProgress, setDailyProgress] = useState(meta.daily ? normalizeDailyProgress(meta.daily, daily) : normalizeDailyProgress(null, daily));
  const [started, setStarted] = useState(false);
  const [name, setName] = useState(meta.playerName || "");
  const [soundOn, setSoundOn] = useState(true);

  const [draft, setDraft] = useState(null); // {cards, rerolls}
  const [showDefeat, setShowDefeat] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showGemStore, setShowGemStore] = useState(false);
  const [showEmergencySlot, setShowEmergencySlot] = useState(false);
  const [adModal, setAdModal] = useState(null); // rewardType string

  const [reviveUsed, setReviveUsed] = useState(false);
  const [claimedDouble, setClaimedDouble] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const [spawntapStatus, setSpawntapStatus] = useState("connecting");
  const [playtimeSeconds, setPlaytimeSeconds] = useState(0);
  const [impactCountdown, setImpactCountdown] = useState(getImpactCountdown());

  const hasSaveRef = useRef(!!loadSave());

  // ----- engine hooks -----
  const onWaveCleared = useCallback(() => {
    setDraft({ cards: drawPerks(3), rerolls: 0 });
  }, []);

  const updateDailyProgress = useCallback((stat, delta = 1) => {
    const achievementProgress = normalizeAchievementProgress(meta.achievements);
    achievementProgress.stats[stat] = (achievementProgress.stats[stat] || 0) + delta;
    meta.achievements = achievementProgress;
    setDailyProgress((prev) => {
      const base = normalizeDailyProgress(prev || meta.daily || null, daily);
      const next = {
        ...base,
        key: daily.key,
        challengeId: daily.challenge.id,
        quests: { ...base.quests },
      };
      for (const quest of daily.quests) {
        const entry = next.quests[quest.id];
        if (!entry) continue;
        if (quest.stat === stat) {
          entry.progress = Math.min(quest.target, (entry.progress || 0) + delta);
        }
      }
      next.challengeProgress = stat === "wavesCleared"
        ? Math.min(3, (next.challengeProgress || 0) + delta)
        : (next.challengeProgress || 0);
      meta.daily = next;
      writeMeta(meta);
      return next;
    });
  }, [daily, meta]);

  const claimDailyQuestReward = useCallback((questId) => {
    setDailyProgress((prev) => {
      const base = normalizeDailyProgress(prev || meta.daily || null, daily);
      const q = daily.quests.find((entry) => entry.id === questId);
      const slot = base.quests[questId];
      if (!q || !slot || slot.claimed || (slot.progress || 0) < q.target) return base;

      const reward = q.reward || { gems: 25 };
      const eng = engineRef.current;
      if (eng) {
        eng.gs.gold += reward.gold || 0;
        eng.gs.gems += reward.gems || 0;
        eng._emitState(true);
      }

      const next = {
        ...base,
        quests: { ...base.quests, [questId]: { ...slot, claimed: true } },
      };
      meta.daily = next;
      writeMeta(meta);
      toast(`Daily quest complete: +${reward.gems || 0} gems${reward.gold ? `, +${reward.gold} gold` : ""}.`);
      return next;
    });
  }, [daily, meta]);

  const claimDailyChallengeReward = useCallback(() => {
    setDailyProgress((prev) => {
      const base = normalizeDailyProgress(prev || meta.daily || null, daily);
      if (base.challengeClaimed) return base;
      const challengeProgress = Math.min(3, Math.max(0, state.wave || 0));
      if (challengeProgress < 3) return base;

      const reward = { gems: 60, gold: 150 };
      const eng = engineRef.current;
      if (eng) {
        eng.gs.gold += reward.gold;
        eng.gs.gems += reward.gems;
        eng._emitState(true);
      }

      const next = { ...base, challengeClaimed: true };
      meta.daily = next;
      writeMeta(meta);
      toast(`Daily challenge complete: +${reward.gems} gems, +${reward.gold} gold.`);
      return next;
    });
  }, [daily, meta, state.wave]);

  const claimAchievementReward = useCallback((achievementId) => {
    const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId);
    const progress = normalizeAchievementProgress(meta.achievements);
    if (!achievement || progress.claimed[achievementId] || (progress.stats[achievement.stat] || 0) < achievement.target) return;

    const reward = achievement.reward || {};
    const eng = engineRef.current;
    if (eng) {
      eng.gs.gold += reward.gold || 0;
      eng.gs.gems += reward.gems || 0;
      eng.gs.soulGems += reward.soulGems || 0;
      eng._emitState(true);
    }
    progress.claimed[achievementId] = true;
    meta.achievements = progress;
    writeMeta(meta);
    toast(`Achievement unlocked: ${achievement.title}.`);
  }, [meta]);

  const recordRunVictory = useCallback(() => {
    const progress = normalizeAchievementProgress(meta.achievements);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    progress.streak = progress.lastRunDate === yesterday ? progress.streak + 1 : progress.lastRunDate === today ? progress.streak : 1;
    progress.lastRunDate = today;
    meta.achievements = progress;
    writeMeta(meta);
  }, [meta]);

  const onDefeat = useCallback(() => {
    setShowEmergencySlot(false);
    setShowDefeat(true);
  }, []);

  const onSlotBlocked = useCallback(() => {
    setShowEmergencySlot(true);
    toast("Emergency slot available: watch a rewarded ad to bypass the max-slot limit.");
  }, []);

  const onVictory = useCallback(() => {
    updateDailyProgress("victories", 1);
    recordRunVictory();
    setShowEmergencySlot(false);
    setShowVictory(true);
  }, [recordRunVictory, updateDailyProgress]);

  // ----- init engine once -----
  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, {
      onState: (s) => setState(s),
      onWaveCleared,
      onDefeat,
      onVictory,
      onSlotBlocked,
      onDailyProgress: updateDailyProgress,
      onToast: (m) => toast(m),
    });
    engineRef.current = engine;
    engine.reset({ soulGems: meta.soulGems || 0, prestigeLevel: meta.prestigeLevel || 0, gemUpgrades: meta.gemUpgrades || {} });
    engine.resize();

    const saved = loadSave();
    if (saved) engine.loadSaveState(saved);
    engine.start();

    // SpawnTap adapter
    const st = new SpawnTapAdapter({ appId: "YOUR_SPAWNTAP_APP_ID", debug: true });
    spawntapRef.current = st;
    window.SpawnTapBridge = st;
    st.on("onStatusChange", ({ status }) => setSpawntapStatus(status));
    st.on("onPlaytimeMilestone", ({ minutes }) => {
      if (minutes % 5 === 0) {
        engineRef.current?.grantGems(100);
        toast(`⏱️ Playtime Bonus! +100 Gems for ${minutes} min of play.`);
        logMonetization({ user_id: st.userId, event_type: "playtime_milestone", reward_type: "gems_100", meta: { minutes } });
      }
    });

    const ro = new ResizeObserver(() => engine.resize());
    if (wrapRef.current) ro.observe(wrapRef.current);

    const playInt = setInterval(() => setPlaytimeSeconds(st.secondsPlayed), 1000);
    const saveInt = setInterval(() => {
      const e = engineRef.current;
      if (e) writeSave(e.getSaveState());
    }, 3000);

    return () => {
      engine.stop();
      ro.disconnect();
      clearInterval(playInt);
      clearInterval(saveInt);
      st.stopPlaytimeTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- rewarded ad flow -----
  const playRewardedAd = useCallback((rewardType) => {
    logMonetization({ user_id: spawntapRef.current?.userId, event_type: "rewarded_ad_request", reward_type: rewardType, meta: {} });
    return new Promise((resolve) => {
      adResolveRef.current = resolve;
      setAdModal(rewardType);
    });
  }, []);

  const closeAd = (success) => {
    const rt = adModal;
    setAdModal(null);
    const resolve = adResolveRef.current;
    adResolveRef.current = null;
    // fire SDK + logging in background
    spawntapRef.current?.showRewardedAd(rt);
    logMonetization({ user_id: spawntapRef.current?.userId, event_type: success ? "rewarded_ad_complete" : "rewarded_ad_skip", reward_type: rt, meta: {} });
    if (resolve) resolve({ success, rewardType: rt });
  };

  // ----- pointer -----
  const onPointerDown = (e) => engineRef.current?.pointerDown(e.clientX, e.clientY);
  const onPointerMove = (e) => engineRef.current?.pointerHover(e.clientX, e.clientY);
  const onContextMenu = (e) => {
    e.preventDefault();
    const eng = engineRef.current;
    if (!eng) return;
    const p = eng.toWorld(e.clientX, e.clientY);
    eng.cancelSelect();
    eng.hero.moveTo = { x: p.x, y: p.y };
  };

  // ----- HUD actions -----
  const handleStart = () => {
    audio.resume();
    setStarted(true);
    if (name.trim()) {
      meta.playerName = name.trim();
      writeMeta(meta);
    }
  };
  const setSpeed = (s) => engineRef.current?.setSpeed(s);
  const togglePause = () => engineRef.current?.setPaused(!state.paused);
  const toggleSound = () => {
    const v = !soundOn;
    setSoundOn(v);
    audio.setEnabled(v);
    if (v) audio.resume();
  };
  const selectTower = (id) => engineRef.current?.selectTowerType(state.selectedTower === id ? null : id);
  const castAbility = (id) => engineRef.current?.castAbility(id);
  const startWave = () => engineRef.current?.startWave();
  const upgradeTower = () => engineRef.current?.upgradeSelected();
  const sellTower = () => engineRef.current?.sellSelected();
  const specializeTower = (specId) => engineRef.current?.applyTowerSpecialization(specId);
  const deselectTower = () => engineRef.current?.cancelSelect();

  // ----- draft -----
  const pickCard = (card) => {
    engineRef.current?.applyPerk(card);
    setDraft(null);
  };
  const rerollDraft = async () => {
    const res = await playRewardedAd("REROLL_CARDS");
    if (res.success) {
      setDraft((d) => ({ cards: drawPerks(3), rerolls: (d?.rerolls || 0) + 1 }));
      toast("New blessings drafted!");
    }
  };

  useEffect(() => {
    if (!daily) return;
    meta.daily = normalizeDailyProgress(meta.daily, daily);
    setDailyProgress(meta.daily);
    writeMeta(meta);
  }, [daily, meta]);

  useEffect(() => {
    const iv = setInterval(() => setImpactCountdown(getImpactCountdown()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (showEmergencySlot && state.towersPlaced < state.maxTowers) {
      setShowEmergencySlot(false);
    }
  }, [showEmergencySlot, state.towersPlaced, state.maxTowers]);

  // ----- score submit -----
  const submitRunScore = useCallback(async (victory) => {
    if (scoreSubmitted) return;
    setScoreSubmitted(true);
    const s = engineRef.current?.gs;
    if (!s) return;
    if (s.wave > (meta.bestWave || 0)) {
      meta.bestWave = s.wave;
      writeMeta(meta);
    }
    await submitScore({
      name: (name || meta.playerName || "Anonymous").trim(),
      wave: s.wave, gold: Math.floor(s.gold), gems: s.gems, soul_gems: s.soulGems, victory,
    });
  }, [name, scoreSubmitted, meta]);

  // ----- defeat -----
  const reviveBase = async () => {
    const eng = engineRef.current;
    if (!eng) return;
    const res = await playRewardedAd("REVIVE_BASE");
    if (res.success) {
      setReviveUsed(true);
      setShowDefeat(false);
      eng.reviveBase();
    } else {
      toast("Ad not completed — revive cancelled.");
    }
  };
  const forfeitRun = async () => {
    const eng = engineRef.current;
    if (!eng) return;
    setShowEmergencySlot(false);
    await submitRunScore(false);
    const earned = Math.max(1, eng.gs.wave) + Math.floor(eng.gs.gems / 100);
    const newSoul = (meta.soulGems || 0) + earned;
    meta.soulGems = newSoul;
    writeMeta(meta);
    clearSave();
    setShowDefeat(false);
    setReviveUsed(false);
    setClaimedDouble(false);
    setScoreSubmitted(false);
    eng.reset({ soulGems: newSoul, prestigeLevel: meta.prestigeLevel || 0, gemUpgrades: meta.gemUpgrades || {} });
    eng._emitState(true);
    toast(`Run ended. Banked ${earned} Soul Gems (total ${newSoul}).`);
  };

  // ----- victory -----
  const claimVictory = async () => {
    const eng = engineRef.current;
    if (!eng) return;
    await submitRunScore(true);
    setShowEmergencySlot(false);
    clearSave();
    setShowVictory(false);
    setClaimedDouble(false);
    setScoreSubmitted(false);
    setReviveUsed(false);
    eng.reset({ soulGems: eng.gs.soulGems, prestigeLevel: (meta.prestigeLevel || 0) + 1, gemUpgrades: meta.gemUpgrades || {} });
    meta.prestigeLevel = (meta.prestigeLevel || 0) + 1;
    meta.soulGems = eng.gs.soulGems;
    writeMeta(meta);
    eng._emitState(true);
    toast("New Game+ unlocked — enemies grow stronger, so does your reward!");
  };
  const claimVictoryDouble = async () => {
    const res = await playRewardedAd("VICTORY_2X");
    if (res.success) {
      engineRef.current?.doubleLastLoot();
      setClaimedDouble(true);
    }
  };

  // ----- vault -----
  const claimOffer = async (offer) => {
    logMonetization({ user_id: spawntapRef.current?.userId, event_type: "offer_started", reward_type: offer.id, meta: { title: offer.title } });
    const res = await playRewardedAd("OFFER");
    if (res.success) {
      const gems = engineRef.current?.grantOfferReward(offer);
      spawntapRef.current?._emit?.("onOfferCompleted", offer);
      logMonetization({ user_id: spawntapRef.current?.userId, event_type: "offer_completed", reward_type: offer.id, meta: { gems } });
      toast(`Offer complete! ${offer.reward} added.`);
    }
  };
  const startPremiumCheckout = async () => {
    const session = await createStripeCheckout({
      player_id: spawntapRef.current?.userId || "anon",
      price_id: process.env.REACT_APP_STRIPE_PRICE_ID || "price_configure_me",
      success_url: `${window.location.origin}/?purchase=success`,
      cancel_url: `${window.location.origin}/?purchase=cancelled`,
    });
    if (session?.url) {
      window.location.assign(session.url);
    } else {
      toast("Premium checkout is not configured yet.");
    }
  };
  const doPrestige = () => {
    const eng = engineRef.current;
    const info = eng.prestige();
    meta.soulGems = info.soulGems;
    meta.prestigeLevel = info.prestigeLevel;
    writeMeta(meta);
    clearSave();
    setShowVault(false);
    setReviveUsed(false);
    setClaimedDouble(false);
    setScoreSubmitted(false);
    toast(`Prestige ${info.prestigeLevel}! +${info.earned} Soul Gems. Starting gold boosted.`);
  };

  const buyGemUpgrade = (upgrade) => {
    const level = meta.gemUpgrades?.[upgrade.id] || 0;
    const cost = gemUpgradeCost(upgrade, level);
    const eng = engineRef.current;
    if (!eng || level >= upgrade.maxLevel || eng.gs.gems < cost) return;
    const nextGems = eng.gs.gems - cost;
    meta.gemUpgrades = { ...(meta.gemUpgrades || {}), [upgrade.id]: level + 1 };
    writeMeta(meta);
    eng.gs.gems = nextGems;
    eng.applyGemUpgrades(meta.gemUpgrades);
    eng._emitState(true);
    toast(`${upgrade.name} upgraded to level ${level + 1}.`);
  };

  const soulGemsEarned = Math.max(1, state.wave) + Math.floor(state.gems / 100);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#090d16] select-none flex flex-col" style={{ height: "100dvh" }}>
      <AdBanner position="top" onImpression={(p) => logMonetization({ user_id: spawntapRef.current?.userId, event_type: "banner_impression", reward_type: p, meta: {} })} />

      <HUD
        state={state}
        daily={daily}
        dailyProgress={dailyProgress}
        onClaimDailyQuest={claimDailyQuestReward}
        onClaimDailyChallenge={claimDailyChallengeReward}
        onSpeed={setSpeed}
        onPause={togglePause}
        onToggleSound={toggleSound}
        soundOn={soundOn}
        onVault={() => setShowVault(true)}
        onLeaderboard={() => setShowLeaderboard(true)}
        onDaily={() => setShowDaily(true)}
        impactCountdown={impactCountdown}
      />

      <div ref={wrapRef} className="relative flex-1 w-full overflow-hidden bg-[#090d16] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onContextMenu={onContextMenu}
          className="block w-full h-full cursor-crosshair touch-none"
        />
        {state.paused && !draft && !showDefeat && !showVictory && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm pointer-events-none">
            <span className="font-display font-black text-5xl uppercase tracking-tight text-cyan-400 text-glow-cyan">Paused</span>
          </div>
        )}
        {!started && (
          <StartScreen name={name} setName={setName} onStart={handleStart} hasSave={hasSaveRef.current} bestWave={meta.bestWave || 0} />
        )}
      </div>

      <TowerDrawer
        state={state}
        onSelectTower={selectTower}
        onCastAbility={castAbility}
        onStartWave={startWave}
        onUpgrade={upgradeTower}
        onSell={sellTower}
        onDeselect={deselectTower}
        onSpecialize={specializeTower}
      />

      <AdBanner position="bottom" onImpression={(p) => logMonetization({ user_id: spawntapRef.current?.userId, event_type: "banner_impression", reward_type: p, meta: {} })} />

      {draft && <DraftModal cards={draft.cards} rerollsUsed={draft.rerolls} onPick={pickCard} onReroll={rerollDraft} />}
      {showDefeat && (
        <DefeatModal state={state} onRevive={reviveBase} onForfeit={forfeitRun} canRevive={!reviveUsed} soulGemsEarned={soulGemsEarned} />
      )}
      {showVictory && <VictoryModal state={state} onClaim={claimVictory} onClaimDouble={claimVictoryDouble} claimedDouble={claimedDouble} />}
      {showEmergencySlot && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-[min(520px,calc(100%-1rem))] rounded-2xl border border-cyan-500/40 bg-slate-950/90 p-4 backdrop-blur-xl shadow-[0_0_24px_rgba(34,211,238,0.25)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-300">Emergency Slot</p>
              <p className="text-sm text-slate-200">Need one more defender slot for this wave?</p>
            </div>
            <button
              className="px-3 py-2 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs"
              onClick={async () => {
                const res = await playRewardedAd("EMERGENCY_SLOT");
                if (res.success) {
                  setShowEmergencySlot(false);
                  engineRef.current?.grantEmergencySlot();
                }
              }}
            >
              Watch Ad
            </button>
          </div>
        </div>
      )}
      {showVault && (
        <VaultModal
          status={spawntapStatus}
          playtimeSeconds={playtimeSeconds}
          onClose={() => setShowVault(false)}
          onClaimOffer={claimOffer}
          onOpenGemStore={() => setShowGemStore(true)}
          onPremiumPurchase={startPremiumCheckout}
          onPrestige={doPrestige}
          state={state}
        />
      )}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      {showDaily && (
        <DailyChallengeModal
          daily={daily}
          dailyProgress={dailyProgress}
          achievements={ACHIEVEMENTS}
          achievementProgress={meta.achievements}
          onClose={() => setShowDaily(false)}
          onClaimQuest={claimDailyQuestReward}
          onClaimChallenge={claimDailyChallengeReward}
          onClaimAchievement={claimAchievementReward}
        />
      )}
      {showGemStore && (
        <GemStoreModal
          gems={state.gems}
          upgrades={meta.gemUpgrades || {}}
          onBuy={buyGemUpgrade}
          onClose={() => setShowGemStore(false)}
        />
      )}
      {adModal && <AdInterstitial rewardType={adModal} onComplete={() => closeAd(true)} onSkip={() => closeAd(false)} />}
    </div>
  );
}
