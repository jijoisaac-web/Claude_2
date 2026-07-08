"""India Shares Tracker — FastAPI backend.

Run:  uvicorn backend.main:app --reload
Then open http://127.0.0.1:8000
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from . import market, database
from .universe import INDICES, NIFTY50

app = FastAPI(title="India Shares Tracker")
database.init()

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"


# ---------- API ----------

@app.get("/api/indices")
def indices():
    return market.get_quotes(list(INDICES.keys()))


@app.get("/api/watchlist")
def watchlist():
    symbols = database.get_watchlist()
    return market.get_quotes(symbols) if symbols else []


@app.post("/api/watchlist/{symbol}")
def watchlist_add(symbol: str):
    database.add_symbol(symbol)
    return {"ok": True, "watchlist": database.get_watchlist()}


@app.delete("/api/watchlist/{symbol}")
def watchlist_remove(symbol: str):
    database.remove_symbol(symbol)
    return {"ok": True, "watchlist": database.get_watchlist()}


@app.get("/api/history/{symbol}")
def history(symbol: str, range: str = "1y"):
    if range not in market.VALID_RANGES:
        raise HTTPException(400, f"range must be one of {list(market.VALID_RANGES)}")
    data = market.get_history(symbol, range)
    if not data["candles"]:
        raise HTTPException(404, f"No data for {symbol}")
    return data


@app.get("/api/fundamentals/{symbol}")
def fundamentals(symbol: str):
    data = market.get_fundamentals(symbol)
    if data.get("name") is None and data.get("price") is None:
        raise HTTPException(404, f"No fundamentals for {symbol}")
    return data


@app.get("/api/screener")
def screener():
    return market.run_screener()


@app.get("/api/symbols")
def symbols():
    return [{"symbol": s, "name": n} for s, n in NIFTY50.items()]


# ---------- frontend ----------

@app.get("/")
def index():
    return FileResponse(FRONTEND / "index.html")


app.mount("/static", StaticFiles(directory=FRONTEND), name="static")
