from fastapi import FastAPI, APIRouter, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
