import hashlib
import hmac
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

try:
    import stripe  # type: ignore
except Exception:  # pragma: no cover
    stripe = None  # type: ignore


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', 'whsec_test')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
OFFERWALL_SECRET = os.environ.get('OFFERWALL_SECRET', 'offer-secret')
REWARD_CLAIM_SECRET = os.environ.get('REWARD_CLAIM_SECRET', 'reward-secret')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'aegis')]
else:
    client = None
    db = None

app = FastAPI(title="Aegis Rogue API")
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class ScoreCreate(BaseModel):
    name: str = Field(..., max_length=24)
    wave: int = 0
    gold: int = 0
    gems: int = 0
    soul_gems: int = 0
    victory: bool = False


class ScoreEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    wave: int = 0
    gold: int = 0
    gems: int = 0
    soul_gems: int = 0
    victory: bool = False
    score: int = 0
    created_at: str = Field(default_factory=now_iso)


class TxnCreate(BaseModel):
    user_id: str = "anon"
    event_type: str  # e.g. rewarded_ad, offer_completed, playtime_milestone, banner_impression
    reward_type: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class TxnEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "anon"
    event_type: str
    reward_type: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_iso)


class RewardClaim(BaseModel):
    user_id: str = "anon"
    reward_type: str
    tx_id: str
    amount: int = Field(..., ge=1, le=100000)
    verifier: str


class CheckoutCreate(BaseModel):
    player_id: str = "anon"
    price_id: str
    success_url: str
    cancel_url: str


def compute_score(wave: int, gold: int, gems: int, soul_gems: int, victory: bool) -> int:
    base = wave * 1000 + gold + gems * 5 + soul_gems * 250
    if victory:
        base += 5000
    return int(base)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Aegis Rogue online", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy", "time": now_iso()}


@api_router.post("/leaderboard", response_model=ScoreEntry)
async def submit_score(payload: ScoreCreate):
    entry = ScoreEntry(
        name=payload.name.strip()[:24] or "Anonymous",
        wave=payload.wave,
        gold=payload.gold,
        gems=payload.gems,
        soul_gems=payload.soul_gems,
        victory=payload.victory,
        score=compute_score(payload.wave, payload.gold, payload.gems, payload.soul_gems, payload.victory),
    )
    await db.leaderboard.insert_one(entry.model_dump())
    return entry


@api_router.get("/leaderboard", response_model=List[ScoreEntry])
async def get_leaderboard(limit: int = Query(default=20, ge=1, le=100)):
    docs = await db.leaderboard.find({}, {"_id": 0}).sort("score", -1).to_list(limit)
    return docs


@api_router.post("/monetization/log", response_model=TxnEntry)
async def log_txn(payload: TxnCreate):
    entry = TxnEntry(**payload.model_dump())
    await db.transactions.insert_one(entry.model_dump())
    return entry


@api_router.get("/monetization/log", response_model=List[TxnEntry])
async def list_txn(limit: int = Query(default=50, ge=1, le=200)):
    docs = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return docs


@api_router.get("/monetization/summary")
async def txn_summary():
    pipeline = [{"$group": {"_id": "$event_type", "count": {"$sum": 1}}}]
    rows = await db.transactions.aggregate(pipeline).to_list(100)
    return {"by_event": {r["_id"]: r["count"] for r in rows}}


def _offerwall_signature(payload: str) -> str:
    return hmac.new(OFFERWALL_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def _reward_claim_signature(payload: str) -> str:
    return hmac.new(REWARD_CLAIM_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


@api_router.post("/monetization/reward-claim")
async def claim_reward(payload: RewardClaim):
    if not payload.user_id.strip() or not payload.tx_id.strip():
        raise HTTPException(status_code=400, detail="missing reward claim fields")
    signed = f"{payload.user_id}:{payload.reward_type}:{payload.tx_id}:{payload.amount}"
    if not hmac.compare_digest(payload.verifier, _reward_claim_signature(signed)):
        raise HTTPException(status_code=401, detail="invalid reward signature")

    tx_key = f"reward:{payload.reward_type}:{payload.tx_id}"
    if db is not None:
        existing = await db.processed_transactions.update_one(
            {"_id": tx_key},
            {"$setOnInsert": {"provider": "reward", "tx_id": payload.tx_id, "user_id": payload.user_id, "reward_type": payload.reward_type, "amount": payload.amount, "created_at": now_iso()}},
            upsert=True,
        )
        if getattr(existing, "matched_count", 0) == 0:
            await db.users.find_one_and_update({"_id": payload.user_id}, {"$inc": {payload.reward_type: payload.amount}}, upsert=True)
    return {"status": "ok", "duplicate": bool(db is not None and getattr(existing, "matched_count", 0) > 0) if db is not None else False, "tx_id": payload.tx_id}


@api_router.post("/monetization/stripe-checkout")
async def create_stripe_checkout(payload: CheckoutCreate):
    if stripe is None or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="stripe checkout is not configured")
    stripe.api_key = STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": payload.price_id, "quantity": 1}],
        success_url=payload.success_url,
        cancel_url=payload.cancel_url,
        metadata={"player_id": payload.player_id},
    )
    return {"id": session.id, "url": session.url}


@api_router.post("/monetization/offerwall-postback")
async def offerwall_postback(payload: Dict[str, Any]):
    user_id = str(payload.get("user_id", "")).strip()
    currency = str(payload.get("currency", "")).strip()
    tx_id = str(payload.get("id", "")).strip()
    verifier = str(payload.get("verifier", "")).strip()
    if not user_id or not currency or not tx_id:
        raise HTTPException(status_code=400, detail="missing offerwall fields")

    expected = _offerwall_signature(f"{user_id}:{currency}:{tx_id}")
    if not hmac.compare_digest(verifier, expected):
        raise HTTPException(status_code=401, detail="invalid signature")

    tx_key = f"offerwall:{tx_id}"
    if db is not None:
        existing = await db.processed_transactions.update_one(
            {"_id": tx_key},
            {"$setOnInsert": {"provider": "offerwall", "tx_id": tx_id, "user_id": user_id, "currency": currency, "created_at": now_iso()}},
            upsert=True,
        )
        if getattr(existing, "matched_count", 0) == 0:
            await db.users.find_one_and_update(
                {"_id": user_id},
                {"$inc": {currency: 1}},
                upsert=True,
            )
    return {"status": "ok", "user_id": user_id, "currency": currency, "tx_id": tx_id}


@api_router.post("/monetization/stripe-webhook")
async def stripe_webhook(request: Request):
    if stripe is None:
        raise HTTPException(status_code=503, detail="stripe SDK not configured")

    payload = await request.body()
    signature = request.headers.get('Stripe-Signature', '')
    try:
        event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"invalid signature: {exc}") from exc

    if event.type != 'checkout.session.completed':
        return {"status": "ok", "event": event.type}

    session = event.data.object
    metadata = getattr(session, 'metadata', None) or {}
    player_id = str(metadata.get('player_id') or metadata.get('user_id') or 'anon')
    gems = int(metadata.get('gems') or 0)
    unlock_id = metadata.get('unlock_id') or 'unknown'
    session_id = getattr(session, 'id', 'session_test')
    tx_key = f"stripe:{event.type}:{session_id}"

    if db is not None:
        existing = await db.processed_transactions.update_one(
            {"_id": tx_key},
            {"$setOnInsert": {"provider": "stripe", "tx_id": session_id, "event_type": event.type, "player_id": player_id, "gems": gems, "unlock_id": unlock_id, "created_at": now_iso()}},
            upsert=True,
        )
        if getattr(existing, "matched_count", 0) == 0:
            await db.users.find_one_and_update(
                {"_id": player_id},
                {"$inc": {"gems": gems}},
                upsert=True,
            )

    return {"status": "ok", "player_id": player_id, "gems": gems, "unlock_id": unlock_id}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
