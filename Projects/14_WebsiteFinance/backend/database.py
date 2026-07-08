"""SQLite watchlist storage."""
import os
import sqlite3
import tempfile
from pathlib import Path

DB_PATH = Path(os.environ.get("APP_DB_PATH") or
               Path(__file__).resolve().parent.parent / "data" / "app.db")

DEFAULT_WATCHLIST = ["RELIANCE.NS", "HDFCBANK.NS", "INFY.NS", "TCS.NS", "TATAMOTORS.NS"]

_SCHEMA = """CREATE TABLE IF NOT EXISTS watchlist (
    symbol TEXT PRIMARY KEY,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
)"""


def _connect(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(path)
    c.execute(_SCHEMA)
    return c


def _conn():
    global DB_PATH
    try:
        return _connect(DB_PATH)
    except sqlite3.OperationalError:
        # some mounted/network filesystems don't support SQLite locking
        DB_PATH = Path(tempfile.gettempdir()) / "india_shares_app.db"
        return _connect(DB_PATH)


def init():
    with _conn() as c:
        if c.execute("SELECT COUNT(*) FROM watchlist").fetchone()[0] == 0:
            c.executemany("INSERT OR IGNORE INTO watchlist(symbol) VALUES (?)",
                          [(s,) for s in DEFAULT_WATCHLIST])


def get_watchlist() -> list[str]:
    with _conn() as c:
        return [r[0] for r in c.execute("SELECT symbol FROM watchlist ORDER BY added_at").fetchall()]


def add_symbol(symbol: str):
    with _conn() as c:
        c.execute("INSERT OR IGNORE INTO watchlist(symbol) VALUES (?)", (symbol.upper(),))


def remove_symbol(symbol: str):
    with _conn() as c:
        c.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol.upper(),))
