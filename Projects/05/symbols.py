# -*- coding: utf-8 -*-
"""
symbols.py — NSE stock universe (Nifty 500 subset) with sector tags
Symbols use Yahoo Finance format: TICKER.NS
"""

# ── Nifty 500 Representative Universe ────────────────────────────────────────
# Grouped by sector for sector rotation strategy

UNIVERSE = {

    "IT": [
        "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS", "TECHM.NS",
        "LTIM.NS", "MPHASIS.NS", "COFORGE.NS", "PERSISTENT.NS", "OFSS.NS",
        "KPITTECH.NS", "TATAELXSI.NS",
    ],

    "Banking": [
        "HDFCBANK.NS", "ICICIBANK.NS", "KOTAKBANK.NS", "SBIN.NS", "AXISBANK.NS",
        "INDUSINDBK.NS", "BANDHANBNK.NS", "FEDERALBNK.NS", "IDFCFIRSTB.NS",
        "RBLBANK.NS", "EQUITASBNK.NS", "AUBANK.NS",
    ],

    "NBFC": [
        "BAJFINANCE.NS", "BAJAJFINSV.NS", "CHOLAFIN.NS", "MUTHOOTFIN.NS",
        "MANAPPURAM.NS", "LICHSGFIN.NS", "ABCAPITAL.NS", "IIFL.NS",
    ],

    "FMCG": [
        "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS", "MARICO.NS",
        "DABUR.NS", "COLPAL.NS", "GODREJCP.NS", "TATACONSUM.NS", "EMAMILTD.NS",
        "VBL.NS", "RADICO.NS",
    ],

    "Auto": [
        "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS", "HEROMOTOCO.NS",
        "EICHERMOT.NS", "ASHOKLEY.NS", "TVSMOTOR.NS", "BHARATFORG.NS",
        "MOTHERSON.NS", "SONACOMS.NS", "VARROC.NS",
    ],

    "Pharma": [
        "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "AUROPHARMA.NS",
        "TORNTPHARM.NS", "IPCALAB.NS", "JBCHEPHARM.NS", "ALKEM.NS",
        "GRANULES.NS", "LAURUSLABS.NS", "ABBOTINDIA.NS",
    ],

    "Metal": [
        "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS", "SAIL.NS",
        "NMDC.NS", "COALINDIA.NS", "NATIONALUM.NS", "MOIL.NS", "HINDCOPPER.NS",
    ],

    "Energy": [
        "RELIANCE.NS", "ONGC.NS", "BPCL.NS", "IOC.NS", "GAIL.NS",
        "PETRONET.NS", "OIL.NS", "POWERGRID.NS", "NTPC.NS", "TATAPOWER.NS",
        "ADANIGREEN.NS", "CESC.NS",
    ],

    "Realty": [
        "DLF.NS", "GODREJPROP.NS", "OBEROIRLTY.NS", "BRIGADE.NS", "SOBHA.NS",
        "PRESTIGE.NS", "MAHLIFE.NS", "PHOENIXLTD.NS",
    ],

    "Capital Goods": [
        "LT.NS", "SIEMENS.NS", "ABB.NS", "HAVELLS.NS", "CUMMINSIND.NS",
        "THERMAX.NS", "BHEL.NS", "GRSE.NS", "POWERMECH.NS", "AIAENG.NS",
    ],

    "Infra": [
        "ADANIENT.NS", "ADANIPORTS.NS", "GMRAIRPORT.NS", "IRB.NS",
        "KNR.NS", "NCC.NS", "PNCINFRA.NS", "HGINFRA.NS",
    ],

    "Insurance": [
        "HDFCLIFE.NS", "SBILIFE.NS", "ICICIPRULI.NS", "GICRE.NS",
        "ICICIGI.NS", "NIACL.NS",
    ],

    "Consumer Durables": [
        "TITAN.NS", "CROMPTON.NS", "POLYCAB.NS", "VGUARD.NS",
        "BLUESTARCO.NS", "WHIRLPOOL.NS",
    ],

    "Chemicals": [
        "PIDILITIND.NS", "SRF.NS", "DEEPAKNTR.NS", "AARTI.NS", "NAVINFLUOR.NS",
        "CLEAN.NS", "VINATIORGA.NS", "TATACHEM.NS",
    ],

    "MidCap_Misc": [
        "APTUS.NS", "BSE.NS", "GREENPLY.NS", "SUPREMEIND.NS",
        "VIJAYA.NS", "FORTIS.NS",
    ],
}

# Flat list for strategies that scan all stocks
ALL_SYMBOLS = [sym for sector_list in UNIVERSE.values() for sym in sector_list]

# Sector lookup: symbol -> sector
SYMBOL_SECTOR = {
    sym: sector
    for sector, syms in UNIVERSE.items()
    for sym in syms
}

# Pairs to monitor for statistical arbitrage (same sector peers)
PAIRS_UNIVERSE = [
    ("HDFCBANK.NS",  "ICICIBANK.NS"),
    ("HDFCBANK.NS",  "KOTAKBANK.NS"),
    ("ICICIBANK.NS", "AXISBANK.NS"),
    ("TCS.NS",       "INFY.NS"),
    ("TCS.NS",       "HCLTECH.NS"),
    ("INFY.NS",      "WIPRO.NS"),
    ("MARUTI.NS",    "M&M.NS"),
    ("BAJAJ-AUTO.NS","HEROMOTOCO.NS"),
    ("SUNPHARMA.NS", "DRREDDY.NS"),
    ("CIPLA.NS",     "DIVISLAB.NS"),
    ("TATASTEEL.NS", "JSWSTEEL.NS"),
    ("HINDUNILVR.NS","ITC.NS"),
    ("RELIANCE.NS",  "ONGC.NS"),
    ("BAJFINANCE.NS","CHOLAFIN.NS"),
]

# Sector ETFs / indices for sector rotation
SECTOR_INDICES = {
    "IT":        "^CNX IT",
    "Banking":   "^NSEBANK",
    "FMCG":      "^CNXFMCG",
    "Auto":      "^CNXAUTO",
    "Pharma":    "^CNXPHARMA",
    "Metal":     "^CNXMETAL",
    "Energy":    "RELIANCE.NS",   # Proxy — CNX Energy not always on yfinance
    "Realty":    "DLF.NS",        # Proxy
}
