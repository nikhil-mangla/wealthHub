from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DATABASE_URL = os.environ.get('DATABASE_URL')  # Neon Postgres URL
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALG = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 7 * 24 * 60

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

app = FastAPI()
api_router = APIRouter(prefix="/api")

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: str = ""
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class InvestmentCalculation(BaseModel):
    age: int
    monthly_investment: float
    goal_amount: float
    risk_profile: str

class InvestmentResult(BaseModel):
    projection: List[dict]
    total_invested: float
    projected_value: float
    years_to_goal: int

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    goal_type: str
    target_amount: float
    current_amount: float
    monthly_investment: float
    risk_profile: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    goal_type: str
    target_amount: float
    current_amount: float
    monthly_investment: float
    risk_profile: str

class ContactForm(BaseModel):
    name: str
    email: str
    message: str

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[UserPublic]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except Exception:
        return None
    async with app.state.pg_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, email, name, picture, created_at FROM users WHERE id = $1", user_id)
    if not row:
        return None
    return UserPublic(
        id=row["id"], email=row["email"], name=row["name"], picture=row["picture"], created_at=row["created_at"]
    )

@api_router.post("/auth/register", response_model=UserPublic)
async def register(payload: RegisterRequest):
    password_hash = pwd_context.hash(payload.password)
    user = User(email=payload.email, name=payload.name, password_hash=password_hash)
    async with app.state.pg_pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", user.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        await conn.execute(
            """
            INSERT INTO users (id, email, name, picture, password_hash, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            user.id, user.email, user.name, user.picture, user.password_hash, user.created_at
        )
    return UserPublic(id=user.id, email=user.email, name=user.name, picture=user.picture, created_at=user.created_at)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    async with app.state.pg_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, password_hash FROM users WHERE email = $1", payload.email)
    if not row or not pwd_context.verify(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode({"sub": row["id"], "exp": expires}, JWT_SECRET, algorithm=JWT_ALG)
    return TokenResponse(access_token=token)

@api_router.get("/auth/me", response_model=UserPublic)
async def me(current_user: Optional[UserPublic] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@api_router.post("/calculate", response_model=InvestmentResult)
async def calculate_investment(data: InvestmentCalculation):
    risk_returns = {
        "conservative": 0.07,
        "moderate": 0.10,
        "aggressive": 0.13
    }
    
    annual_return = risk_returns.get(data.risk_profile.lower(), 0.10)
    monthly_return = annual_return / 12
    
    projection = []
    current_value = 0
    months = 0
    max_years = 65 - data.age
    
    for year in range(max_years):
        for month in range(12):
            current_value = (current_value + data.monthly_investment) * (1 + monthly_return)
            months += 1
            
            if month == 11:
                projection.append({
                    "year": year + 1,
                    "age": data.age + year + 1,
                    "value": round(current_value, 2),
                    "invested": round((months * data.monthly_investment), 2)
                })
            
            if current_value >= data.goal_amount:
                return InvestmentResult(
                    projection=projection,
                    total_invested=round(months * data.monthly_investment, 2),
                    projected_value=round(current_value, 2),
                    years_to_goal=year + 1
                )
    
    return InvestmentResult(
        projection=projection,
        total_invested=round(months * data.monthly_investment, 2),
        projected_value=round(current_value, 2),
        years_to_goal=max_years
    )

@api_router.post("/goals", response_model=Goal)
async def create_goal(goal_data: GoalCreate, current_user: UserPublic = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    goal = Goal(user_id=current_user.id, **goal_data.dict())
    async with app.state.pg_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO goals (id, user_id, goal_type, target_amount, current_amount, monthly_investment, risk_profile, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            goal.id, goal.user_id, goal.goal_type, goal.target_amount, goal.current_amount, goal.monthly_investment, goal.risk_profile, goal.created_at
        )
    return goal

@api_router.get("/goals", response_model=List[Goal])
async def get_goals(current_user: UserPublic = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    async with app.state.pg_pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, user_id, goal_type, target_amount, current_amount, monthly_investment, risk_profile, created_at FROM goals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000", current_user.id)
    return [
        Goal(
            id=r["id"],
            user_id=r["user_id"],
            goal_type=r["goal_type"],
            target_amount=float(r["target_amount"]),
            current_amount=float(r["current_amount"]),
            monthly_investment=float(r["monthly_investment"]),
            risk_profile=r["risk_profile"],
            created_at=r["created_at"],
        ) for r in rows
    ]

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, update_data: dict, current_user: UserPublic = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    set_clauses = []
    values = []
    for idx, (k, v) in enumerate(update_data.items(), start=1):
        set_clauses.append(f"{k} = ${idx}")
        values.append(v)
    if not set_clauses:
        raise HTTPException(status_code=400, detail="No fields to update")
    values.extend([current_user.id, goal_id])
    async with app.state.pg_pool.acquire() as conn:
        result = await conn.execute(f"UPDATE goals SET {', '.join(set_clauses)} WHERE user_id = ${len(values)-1} AND id = ${len(values)}")
    if result.endswith("UPDATE 0"):
        raise HTTPException(status_code=404, detail="Goal not found")
    async with app.state.pg_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, user_id, goal_type, target_amount, current_amount, monthly_investment, risk_profile, created_at FROM goals WHERE id = $1 AND user_id = $2", goal_id, current_user.id)
    return Goal(
        id=row["id"],
        user_id=row["user_id"],
        goal_type=row["goal_type"],
        target_amount=float(row["target_amount"]),
        current_amount=float(row["current_amount"]),
        monthly_investment=float(row["monthly_investment"]),
        risk_profile=row["risk_profile"],
        created_at=row["created_at"],
    )

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, current_user: UserPublic = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    async with app.state.pg_pool.acquire() as conn:
        result = await conn.execute("DELETE FROM goals WHERE id = $1 AND user_id = $2", goal_id, current_user.id)
    if result.endswith("DELETE 0"):
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}

@api_router.post("/contact")
async def contact(form_data: ContactForm):
    async with app.state.pg_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO contact_messages (id, name, email, message, created_at)
            VALUES ($1, $2, $3, $4, $5)
            """,
            str(uuid.uuid4()), form_data.name, form_data.email, form_data.message, datetime.now(timezone.utc)
        )
    return {"message": "Message sent successfully"}

app.include_router(api_router)

origins_env = os.environ.get('CORS_ORIGINS', '')
origins = [o.strip() for o in origins_env.split(',') if o.strip()]
if not origins:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_pool():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is required for Postgres (Neon)")
    app.state.pg_pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=1, max_size=5)
    async with app.state.pg_pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                picture TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            );
            CREATE TABLE IF NOT EXISTS goals (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                goal_type TEXT NOT NULL,
                target_amount DOUBLE PRECISION NOT NULL,
                current_amount DOUBLE PRECISION NOT NULL,
                monthly_investment DOUBLE PRECISION NOT NULL,
                risk_profile TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
            CREATE TABLE IF NOT EXISTS contact_messages (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            );
            """
        )

@app.on_event("shutdown")
async def shutdown_db_client():
    pg_pool = getattr(app.state, 'pg_pool', None)
    if pg_pool:
        await pg_pool.close()