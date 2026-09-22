import hashlib
import hmac
import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
import bcrypt
import jwt
from fastapi import APIRouter, Cookie, Depends, FastAPI, HTTPException, Query, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field, field_validator
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
SESSION_TTL_DAYS = int(os.environ.get('SESSION_TTL_DAYS', '30'))
SESSION_COOKIE = 'aegis_session'
APP_ENV = os.environ.get('APP_ENV', 'development').lower()
COOKIE_SECURE = os.environ.get('COOKIE_SECURE', 'true' if APP_ENV == 'production' else 'false').lower() == 'true'
ALLOWED_ORIGINS = [origin.strip().rstrip('/') for origin in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',') if origin.strip()]
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_JWKS_URL = os.environ.get('SUPABASE_JWKS_URL', '')
SUPABASE_ISSUER = os.environ.get('SUPABASE_ISSUER', f'{SUPABASE_URL}/auth/v1' if SUPABASE_URL else '')

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


class RegisterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=24)
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    marketing_opt_in: bool = False


class LoginCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


class CloudSave(BaseModel):
    state: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("state")
    @classmethod
    def limit_state_size(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        if len(json.dumps(value, separators=(",", ":"))) > 100_000:
            raise ValueError("save payload is too large")
        return value


def sanitize_cloud_state(state: Dict[str, Any]) -> Dict[str, Any]:
    raw_gs = state.get("gs") if isinstance(state.get("gs"), dict) else {}
    raw_towers = state.get("towers") if isinstance(state.get("towers"), list) else []
    raw_hero = state.get("hero") if isinstance(state.get("hero"), dict) else {}
    towers = []
    for tower in raw_towers[:20]:
        if not isinstance(tower, dict) or tower.get("id") not in {"archer", "frost", "inferno", "tesla"}:
            continue
        towers.append({
            "id": tower["id"],
            "spotKey": str(tower.get("spotKey", ""))[:32],
            "x": max(0, min(960, float(tower.get("x", 0)))),
            "y": max(0, min(560, float(tower.get("y", 0)))),
            "level": max(1, min(20, int(tower.get("level", 1)))),
            "invested": max(0, min(1_000_000, int(tower.get("invested", 0)))),
        })
    return {
        "gs": {
            "wave": max(0, min(20, int(raw_gs.get("wave", 0)))),
            "waveStatus": "cleared",
            "perks": [str(perk)[:40] for perk in raw_gs.get("perks", [])[:20]] if isinstance(raw_gs.get("perks"), list) else [],
        },
        "towers": towers,
        "hero": {
            "x": max(20, min(940, float(raw_hero.get("x", 0)))),
            "y": max(20, min(540, float(raw_hero.get("y", 0)))),
        },
    }


def normalize_email(email: str) -> str:
    return email.strip().lower()


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("_id")),
        "name": user.get("name", "Commander"),
        "email": user.get("email", ""),
        "marketing_opt_in": bool(user.get("marketing_opt_in", False)),
    }


def hash_session(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify_supabase_token(token: str) -> Dict[str, Any]:
    if not SUPABASE_JWKS_URL or not SUPABASE_ISSUER:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid authentication credentials")
    try:
        jwks_client = jwt.PyJWKClient(SUPABASE_JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(token, signing_key.key, algorithms=["ES256", "RS256"], audience="authenticated", issuer=SUPABASE_ISSUER)
    except (jwt.PyJWKClientError, jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid authentication credentials")


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    await db.sessions.insert_one({
        "_id": hash_session(token),
        "user_id": user_id,
        "created_at": now_iso(),
        "expires_at": now + timedelta(days=SESSION_TTL_DAYS),
    })
    return token


async def current_user(request: Request, aegis_session: Optional[str] = Cookie(default=None)) -> Dict[str, Any]:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid authentication credentials")
    try:
        if db is None:
            raise credentials_error
        user_id = ""
        claims: Dict[str, Any] = {}
        if aegis_session:
            session = await db.sessions.find_one({"_id": hash_session(aegis_session)})
            raw_expiry = session.get("expires_at") if session else None
            expires_at = datetime.fromisoformat(raw_expiry) if isinstance(raw_expiry, str) else raw_expiry or datetime.min.replace(tzinfo=timezone.utc)
            user_id = str(session.get("user_id", "")).strip() if session and expires_at > datetime.now(timezone.utc) else ""
        else:
            authorization = request.headers.get("Authorization", "")
            if authorization.startswith("Bearer "):
                claims = verify_supabase_token(authorization[7:].strip())
                user_id = str(claims.get("sub", "")).strip()
        if not user_id or db is None:
            raise credentials_error
        user = await db.users.find_one({"_id": user_id})
        if not user and claims:
            user = {
                "_id": user_id,
                "name": str(claims.get("user_metadata", {}).get("name") or claims.get("email", "Commander"))[:24],
                "email": str(claims.get("email", ""))[:254],
                "marketing_opt_in": False,
                "auth_provider": "supabase",
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.users.update_one({"_id": user_id}, {"$setOnInsert": user}, upsert=True)
    except (ValueError, TypeError):
        raise credentials_error
    if not user:
        raise credentials_error
    return user


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


@api_router.post("/auth/register")
async def register(payload: RegisterCreate, response: Response):
    if db is None:
        raise HTTPException(status_code=503, detail="account storage is not configured")
    email = normalize_email(payload.email)
    if "@" not in email:
        raise HTTPException(status_code=422, detail="valid email is required")
    existing = await db.users.find_one({"email": email}, {"_id": 1})
    if existing:
        raise HTTPException(status_code=409, detail="an account with that email already exists")
    user_id = str(uuid.uuid4())
    user = {
        "_id": user_id,
        "name": payload.name.strip()[:24] or "Commander",
        "email": email,
        "password_hash": bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(),
        "marketing_opt_in": payload.marketing_opt_in,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(user)
    session_token = await create_session(user_id)
    response.set_cookie(SESSION_COOKIE, session_token, httponly=True, secure=COOKIE_SECURE, samesite="strict", max_age=SESSION_TTL_DAYS * 86400)
    return {"user": public_user(user)}


@api_router.post("/auth/login")
async def login(payload: LoginCreate, response: Response):
    if db is None:
        raise HTTPException(status_code=503, detail="account storage is not configured")
    user = await db.users.find_one({"email": normalize_email(payload.email)})
    if not user or not bcrypt.checkpw(payload.password.encode(), user.get("password_hash", "").encode()):
        raise HTTPException(status_code=401, detail="invalid email or password")
    session_token = await create_session(str(user["_id"]))
    response.set_cookie(SESSION_COOKIE, session_token, httponly=True, secure=COOKIE_SECURE, samesite="strict", max_age=SESSION_TTL_DAYS * 86400)
    return {"user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(response: Response, aegis_session: Optional[str] = Cookie(default=None)):
    if aegis_session and db is not None:
        await db.sessions.delete_one({"_id": hash_session(aegis_session)})
    response.delete_cookie(SESSION_COOKIE, secure=COOKIE_SECURE, httponly=True, samesite="strict")
    return {"status": "ok"}


@api_router.post("/auth/supabase/exchange")
async def exchange_supabase_session(response: Response, user: Dict[str, Any] = Depends(current_user)):
    session_token = await create_session(str(user["_id"]))
    response.set_cookie(SESSION_COOKIE, session_token, httponly=True, secure=COOKIE_SECURE, samesite="strict", max_age=SESSION_TTL_DAYS * 86400)
    return {"user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(current_user)):
    return public_user(user)


@api_router.get("/account/save")
async def get_cloud_save(user: Dict[str, Any] = Depends(current_user)):
    save = await db.saves.find_one({"user_id": str(user["_id"])}, {"_id": 0, "state": 1, "updated_at": 1})
    if not save:
        return {"state": {}, "updated_at": None}
    save["state"] = sanitize_cloud_state(save.get("state", {}))
    return save


@api_router.put("/account/save")
async def put_cloud_save(payload: CloudSave, user: Dict[str, Any] = Depends(current_user)):
    saved_at = now_iso()
    safe_state = sanitize_cloud_state(payload.state)
    await db.saves.update_one(
        {"user_id": str(user["_id"])},
        {"$set": {"user_id": str(user["_id"]), "state": safe_state, "updated_at": saved_at}},
        upsert=True,
    )
    return {"status": "ok", "updated_at": saved_at}


@api_router.post("/leaderboard", response_model=ScoreEntry)
async def submit_score(payload: ScoreCreate, user: Dict[str, Any] = Depends(current_user)):
    entry = ScoreEntry(
        name=str(user.get("name", "Commander"))[:24],
        wave=payload.wave,
        gold=payload.gold,
        gems=payload.gems,
        soul_gems=payload.soul_gems,
        victory=payload.victory,
        score=compute_score(payload.wave, payload.gold, payload.gems, payload.soul_gems, payload.victory),
    )
    record = entry.model_dump()
    record["user_id"] = str(user["_id"])
    await db.leaderboard.insert_one(record)
    return entry


@api_router.get("/leaderboard", response_model=List[ScoreEntry])
async def get_leaderboard(limit: int = Query(default=20, ge=1, le=100)):
    docs = await db.leaderboard.find({}, {"_id": 0}).sort("score", -1).to_list(limit)
    return docs


@api_router.post("/monetization/log", response_model=TxnEntry)
async def log_txn(payload: TxnCreate, user: Dict[str, Any] = Depends(current_user)):
    entry = TxnEntry(**{**payload.model_dump(), "user_id": str(user["_id"])})
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
async def create_stripe_checkout(payload: CheckoutCreate, user: Dict[str, Any] = Depends(current_user)):
    if stripe is None or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="stripe checkout is not configured")
    stripe.api_key = STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": payload.price_id, "quantity": 1}],
        success_url=payload.success_url,
        cancel_url=payload.cancel_url,
        metadata={"player_id": str(user["_id"])},
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
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()


@app.on_event("startup")
async def validate_security_configuration():
    if APP_ENV == 'production':
        required = {
            'MONGO_URL': mongo_url,
            'OFFERWALL_SECRET': os.environ.get('OFFERWALL_SECRET'),
            'REWARD_CLAIM_SECRET': os.environ.get('REWARD_CLAIM_SECRET'),
            'STRIPE_WEBHOOK_SECRET': os.environ.get('STRIPE_WEBHOOK_SECRET'),
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"missing required production security settings: {', '.join(missing)}")
        if not COOKIE_SECURE:
            raise RuntimeError('COOKIE_SECURE must be true in production')
        if not SUPABASE_JWKS_URL or not SUPABASE_ISSUER:
            raise RuntimeError('SUPABASE_JWKS_URL and SUPABASE_ISSUER are required in production')
    if db is not None:
        await db.sessions.create_index('expires_at', expireAfterSeconds=0)
        await db.users.create_index('email', unique=True)
        await db.saves.create_index('user_id', unique=True)
