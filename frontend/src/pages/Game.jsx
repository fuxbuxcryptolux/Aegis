import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import GameEngine from "@/game/engine";
import SpawnTapAdapter from "@/game/spawntap_adapter";
import audio from "@/game/audio";
import { drawPerks } from "@/game/config";
import { loadSave, writeSave, clearSave, loadMeta, writeMeta } from "@/game/storage";
import { submitScore, logMonetization } from "@/lib/api";

import { AdBanner } from "@/components/game/AdBanner";
import HUD from "@/components/game/HUD";
import TowerDrawer from "@/components/game/TowerDrawer";
import DraftModal from "@/components/game/DraftModal";
import DefeatModal from "@/components/game/DefeatModal";
import VictoryModal from "@/components/game/VictoryModal";
import VaultModal from "@/components/game/VaultModal";
import LeaderboardModal from "@/components/game/LeaderboardModal";
import AdInterstitial from "@/components/game/AdInterstitial";
import StartScreen from "@/components/game/StartScreen";

const INITIAL = {
  nexusHP: 100, maxNexusHP: 100, gold: 300, gems: 0, soulGems: 0, prestigeLevel: 0,
  wave: 0, maxWave: 20, waveStatus: "idle", isBoss: false, nextBoss: 5, gameSpeed: 1,
  paused: false, selectedTower: null, enemiesRemaining: 0, towersPlaced: 0, maxTowers: 6,
  perks: [], heroCooldowns: { nuke: 0, freeze: 0, heal: 0 }, lastWaveLoot: { gold: 0, gems: 0 }, selectedPlaced: null,
};

export default function Game() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const engineRef = useRef(null);
  const spawntapRef = useRef(null);
  const adResolveRef = useRef(null);

  const meta = useRef(loadMeta()).current;

  const [state, setState] = useState(INITIAL);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState(meta.playerName || "");
  const [soundOn, setSoundOn] = useState(true);

  const [draft, setDraft] = useState(null); // {cards, rerolls}
  const [showDefeat, setShowDefeat] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [adModal, setAdModal] = useState(null); // rewardType string

  const [reviveUsed, setReviveUsed] = useState(false);
  const [claimedDouble, setClaimedDouble] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const [spawntapStatus, setSpawntapStatus] = useState("connecting");
  const [playtimeSeconds, setPlaytimeSeconds] = useState(0);

  const hasSaveRef = useRef(!!loadSave());

  // ----- engine hooks -----
  const onWaveCleared = useCallback(() => {
    setDraft({ cards: drawPerks(3), rerolls: 0 });
  }, []);

  const onDefeat = useCallback(() => {
    setShowDefeat(true);
  }, []);

  const onVictory = useCallback(() => {
    setShowVictory(true);
  }, []);

  // ----- init engine once -----
  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, {
      onState: (s) => setState(s),
      onWaveCleared,
      onDefeat,
      onVictory,
      onToast: (m) => toast(m),
    });
    engineRef.current = engine;
    engine.reset({ soulGems: meta.soulGems || 0, prestigeLevel: meta.prestigeLevel || 0 });
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
      toast("New tactical protocols drafted!");
    }
  };

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
    const res = await playRewardedAd("REVIVE_BASE");
    if (res.success) {
      setReviveUsed(true);
      setShowDefeat(false);
      engineRef.current?.reviveBase();
    } else {
      toast("Ad not completed — revive cancelled.");
    }
  };
  const forfeitRun = async () => {
    const eng = engineRef.current;
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
    eng.reset({ soulGems: newSoul, prestigeLevel: meta.prestigeLevel || 0 });
    eng._emitState(true);
    toast(`Run ended. Banked ${earned} Soul Gems (total ${newSoul}).`);
  };

  // ----- victory -----
  const claimVictory = async () => {
    await submitRunScore(true);
    const eng = engineRef.current;
    clearSave();
    setShowVictory(false);
    setClaimedDouble(false);
    setScoreSubmitted(false);
    setReviveUsed(false);
    eng.reset({ soulGems: eng.gs.soulGems, prestigeLevel: (meta.prestigeLevel || 0) + 1 });
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

  const soulGemsEarned = Math.max(1, state.wave) + Math.floor(state.gems / 100);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#090d16] select-none flex flex-col" style={{ height: "100dvh" }}>
      <AdBanner position="top" onImpression={(p) => logMonetization({ user_id: spawntapRef.current?.userId, event_type: "banner_impression", reward_type: p, meta: {} })} />

      <HUD
        state={state}
        onSpeed={setSpeed}
        onPause={togglePause}
        onToggleSound={toggleSound}
        soundOn={soundOn}
        onVault={() => setShowVault(true)}
        onLeaderboard={() => setShowLeaderboard(true)}
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
      />

      <AdBanner position="bottom" onImpression={(p) => logMonetization({ user_id: spawntapRef.current?.userId, event_type: "banner_impression", reward_type: p, meta: {} })} />

      {draft && <DraftModal cards={draft.cards} rerollsUsed={draft.rerolls} onPick={pickCard} onReroll={rerollDraft} />}
      {showDefeat && (
        <DefeatModal state={state} onRevive={reviveBase} onForfeit={forfeitRun} canRevive={!reviveUsed} soulGemsEarned={soulGemsEarned} />
      )}
      {showVictory && <VictoryModal state={state} onClaim={claimVictory} onClaimDouble={claimVictoryDouble} claimedDouble={claimedDouble} />}
      {showVault && (
        <VaultModal
          status={spawntapStatus}
          playtimeSeconds={playtimeSeconds}
          onClose={() => setShowVault(false)}
          onClaimOffer={claimOffer}
          onPrestige={doPrestige}
          state={state}
        />
      )}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      {adModal && <AdInterstitial rewardType={adModal} onComplete={() => closeAd(true)} onSkip={() => closeAd(false)} />}
    </div>
  );
}
