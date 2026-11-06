import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("tradebridge.db")


def get_connection():
    return sqlite3.connect(DB_PATH)


def initialize_database():

    with get_connection() as conn:

        conn.execute("""
            CREATE TABLE IF NOT EXISTS signals (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                signal_id TEXT UNIQUE NOT NULL,

                strategy TEXT NOT NULL,

                action TEXT NOT NULL,

                symbol TEXT NOT NULL,

                lot REAL,

                sl REAL,

                tp REAL,

                status TEXT DEFAULT 'RECEIVED',

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            )
        """)


def save_signal(signal):

    with get_connection() as conn:

        cursor = conn.execute("""
            INSERT INTO signals
            (signal_id, strategy, action, symbol, lot, sl, tp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            signal.signal_id,
            signal.strategy,
            signal.action,
            signal.symbol,
            signal.lot,
            signal.sl,
            signal.tp
        ))

        return cursor.lastrowid'
        