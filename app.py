import os
import hmac
import sqlite3
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field

# ==========================================
# 0. LOGGING CONFIGURATION
# ==========================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ExecuTrade")

# ==========================================
# 1. CONFIGURATION & CONSTANTS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
DB_PATH = BASE_DIR / "tradebridge.db"

load_dotenv(dotenv_path=ENV_PATH, override=True)

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "").strip()
if not WEBHOOK_SECRET:
    raise RuntimeError(
        f"WEBHOOK_SECRET missing. Check your .env file at: {ENV_PATH}"
    )

MT5_API_KEY = os.getenv("MT5_API_KEY", "").strip()
if not MT5_API_KEY:
    raise RuntimeError("MT5_API_KEY is missing from .env")

# Timeout in seconds before an unconfirmed PROCESSING signal is reset
STALE_SIGNAL_TIMEOUT_SECONDS = 60
# Maximum attempts before a signal is marked permanently FAILED
MAX_EXECUTION_ATTEMPTS = 3

# ==========================================
# 2. DATABASE UTILITIES
# ==========================================

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        # Core signals queue table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS webhook_signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                signal_id TEXT UNIQUE NOT NULL,
                strategy TEXT NOT NULL,
                action TEXT NOT NULL,
                symbol TEXT NOT NULL,
                lot REAL NOT NULL,
                sl REAL NOT NULL,
                tp REAL NOT NULL,
                status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Separate execution history & audit trail table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS execution_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                signal_id TEXT NOT NULL,
                attempt_number INTEGER NOT NULL,
                status TEXT NOT NULL,
                order_ticket TEXT,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Check existing columns in webhook_signals
        existing_columns = {
            row["name"]
            for row in conn.execute(
                "PRAGMA table_info(webhook_signals)"
            ).fetchall()
        }

        # Add new columns gracefully if not present
        new_columns = {
            "order_ticket": "TEXT",
            "execution_message": "TEXT",
            "updated_at": "TIMESTAMP",
            "attempts": "INTEGER DEFAULT 0"
        }

        for column, column_type in new_columns.items():
            if column not in existing_columns:
                conn.execute(
                    f"ALTER TABLE webhook_signals ADD COLUMN {column} {column_type}"
                )

        conn.commit()


# ==========================================
# 3. FASTAPI APPLICATION LIFESPAN
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="ExecuTrade",
    version="1.0.0",
    description="Automated Trading Execution Platform | TradingView to MT5",
    lifespan=lifespan
)


# ==========================================
# 4. REQUEST SCHEMAS
# ==========================================

class TradingSignal(BaseModel):
    secret: str
    signal_id: str = Field(min_length=1, max_length=100)
    strategy: str
    action: Literal["BUY", "SELL"]
    symbol: str
    lot: float = Field(gt=0)
    sl: float = Field(gt=0)
    tp: float = Field(gt=0)


class ExecutionResult(BaseModel):
    status: Literal["EXECUTED", "FAILED"]
    order_ticket: str | None = None
    execution_message: str | None = None


# ==========================================
# 5. GENERAL ENDPOINTS
# ==========================================

@app.get("/")
def home():
    return {
        "message": "ExecuTrade Bridge is running!",
        "status": "ONLINE"
    }


@app.get("/health")
def health():
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1")

        return {
            "server": "ONLINE",
            "database": "INITIALIZED"
        }
    except sqlite3.Error:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )


# ==========================================
# 6. TRADINGVIEW WEBHOOK INGESTION
# ==========================================

@app.post("/webhook/tradingview")
def receive_signal(signal: TradingSignal):
    if not hmac.compare_digest(signal.secret, WEBHOOK_SECRET):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication secret"
        )

    try:
        with get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO webhook_signals
                (signal_id, strategy, action, symbol, lot, sl, tp, attempts)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            """, (
                signal.signal_id,
                signal.strategy,
                signal.action,
                signal.symbol,
                signal.lot,
                signal.sl,
                signal.tp
            ))
            conn.commit()
            database_id = cursor.lastrowid

            logger.info(
                "Signal received: %s | Action: %s | Symbol: %s | DB ID: %s",
                signal.signal_id,
                signal.action,
                signal.symbol,
                database_id
            )

        return {
            "status": "SUCCESS",
            "message": "Signal received and stored",
            "database_id": database_id,
            "signal_id": signal.signal_id,
            "action": signal.action,
            "symbol": signal.symbol
        }

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Duplicate signal ID"
        )
    except sqlite3.Error:
        logger.exception("Database storage failed for webhook signal")
        raise HTTPException(
            status_code=500,
            detail="Database storage failed"
        )


# ==========================================
# 7. MT5 SIGNAL CLAIMING & DEAD-LETTER RECOVERY
# ==========================================

@app.post("/mt5/signals/claim")
def claim_next_signal(
    x_bridge_key: str = Header(..., alias="X-Bridge-Key")
):
    if not hmac.compare_digest(x_bridge_key, MT5_API_KEY):
        raise HTTPException(
            status_code=401,
            detail="Invalid MT5 authentication key"
        )

    try:
        with get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")

            # 1a. Fail out signals that exceeded max retry attempts
            conn.execute(f"""
                UPDATE webhook_signals
                SET status = 'FAILED',
                    updated_at = CURRENT_TIMESTAMP,
                    execution_message = 'Exceeded maximum claim attempts ({MAX_EXECUTION_ATTEMPTS})'
                WHERE status = 'PROCESSING'
                  AND updated_at IS NOT NULL
                  AND (strftime('%s', 'now') - strftime('%s', updated_at)) > {STALE_SIGNAL_TIMEOUT_SECONDS}
                  AND COALESCE(attempts, 0) >= {MAX_EXECUTION_ATTEMPTS}
            """)

            # 1b. Reset recoverable timed-out signals back to PENDING
            conn.execute(f"""
                UPDATE webhook_signals
                SET status = 'PENDING',
                    execution_message = 'Reset to PENDING after claim timeout'
                WHERE status = 'PROCESSING'
                  AND updated_at IS NOT NULL
                  AND (strftime('%s', 'now') - strftime('%s', updated_at)) > {STALE_SIGNAL_TIMEOUT_SECONDS}
                  AND COALESCE(attempts, 0) < {MAX_EXECUTION_ATTEMPTS}
            """)

            # 1c. Catch legacy orphaned signals where updated_at was NULL
            conn.execute("""
                UPDATE webhook_signals
                SET status = 'PENDING',
                    updated_at = CURRENT_TIMESTAMP,
                    execution_message = 'Recovered orphaned PROCESSING signal'
                WHERE status = 'PROCESSING'
                  AND updated_at IS NULL
                  AND (strftime('%s', 'now') - strftime('%s', created_at)) > 60
            """)

            # 2. Find the oldest pending signal (FIFO queue)
            signal = conn.execute("""
                SELECT *
                FROM webhook_signals
                WHERE status = 'PENDING'
                ORDER BY id ASC
                LIMIT 1
            """).fetchone()

            if signal is None:
                conn.commit()
                return {
                    "status": "EMPTY",
                    "message": "No pending signals available",
                    "signal": None
                }

            # 3. Transition to PROCESSING, increment attempts, and update timestamp
            conn.execute("""
                UPDATE webhook_signals
                SET status = 'PROCESSING',
                    updated_at = CURRENT_TIMESTAMP,
                    attempts = COALESCE(attempts, 0) + 1
                WHERE id = ? AND status = 'PENDING'
            """, (signal["id"],))

            conn.commit()

            current_attempts = (signal["attempts"] or 0) + 1
            logger.info(
                "Signal claimed: ID %s (%s) | Attempt: %s/%s",
                signal["id"],
                signal["signal_id"],
                current_attempts,
                MAX_EXECUTION_ATTEMPTS
            )

            return {
                "status": "CLAIMED",
                "message": "Signal successfully assigned to MT5",
                "signal": {
                    "id": signal["id"],
                    "signal_id": signal["signal_id"],
                    "strategy": signal["strategy"],
                    "action": signal["action"],
                    "symbol": signal["symbol"],
                    "lot": signal["lot"],
                    "sl": signal["sl"],
                    "tp": signal["tp"],
                    "attempt": current_attempts
                }
            }

    except sqlite3.Error:
        logger.exception("Database error while claiming signal")
        raise HTTPException(
            status_code=500,
            detail="Failed to claim signal from database"
        )


# ==========================================
# 8. MT5 EXECUTION RESULT UPDATE & AUDIT LOG
# ==========================================

@app.post("/mt5/signals/{signal_id}/result")
def update_execution_result(
    signal_id: str,
    result: ExecutionResult,
    x_bridge_key: str = Header(..., alias="X-Bridge-Key")
):
    if not hmac.compare_digest(x_bridge_key, MT5_API_KEY):
        raise HTTPException(
            status_code=401,
            detail="Invalid MT5 authentication key"
        )

    try:
        with get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")

            signal = conn.execute("""
                SELECT status, attempts
                FROM webhook_signals
                WHERE signal_id = ?
            """, (signal_id,)).fetchone()

            if signal is None:
                raise HTTPException(
                    status_code=404,
                    detail="Signal not found"
                )

            if signal["status"] != "PROCESSING":
                raise HTTPException(
                    status_code=409,
                    detail=f"Signal cannot be updated from {signal['status']}"
                )

            # Update core signal status
            conn.execute("""
                UPDATE webhook_signals
                SET status = ?,
                    order_ticket = ?,
                    execution_message = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE signal_id = ?
            """, (
                result.status,
                result.order_ticket,
                result.execution_message,
                signal_id
            ))

            # Record audit trail into execution_logs
            conn.execute("""
                INSERT INTO execution_logs
                (signal_id, attempt_number, status, order_ticket, message)
                VALUES (?, ?, ?, ?, ?)
            """, (
                signal_id,
                signal["attempts"] or 1,
                result.status,
                result.order_ticket,
                result.execution_message
            ))

            conn.commit()

            logger.info("Signal %s recorded as %s (Logged to execution_logs)", signal_id, result.status)

        return {
            "status": "SUCCESS",
            "message": "Execution result updated and logged",
            "signal_id": signal_id,
            "execution_status": result.status,
            "order_ticket": result.order_ticket
        }

    except sqlite3.Error:
        logger.exception("Database error while updating execution result")
        raise HTTPException(
            status_code=500,
            detail="Failed to update execution result"
        )