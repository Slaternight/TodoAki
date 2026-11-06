"""
Radar de tendencias (Fase 1 del agente de sourcing).

Recorre los nichos de agent/niches.json, consulta Google Trends (Colombia) las
búsquedas EN AUGE de cada nicho, las ordena por fuerza y guarda la shortlist en
frontend/data/radar.json (que lee el panel web). No usa APIs de pago ni scraping.

Uso:  python agent/trends.py
"""

import datetime
import json
import os
import time
from urllib.parse import quote

from pytrends.request import TrendReq

BASE = os.path.dirname(os.path.abspath(__file__))
NICHES_FILE = os.path.join(BASE, "niches.json")
OUT_FILE = os.path.normpath(os.path.join(BASE, "..", "frontend", "data", "radar.json"))

GEO = "CO"
TIMEFRAME = "now 7-d"   # últimos 7 días
PER_NICHE = 8           # cuántas búsquedas en auge tomar por nicho

# Descarta ruido típico de Trends (preguntas, entretenimiento, software...).
DENY = [
    "que es", "que son", "que significa", "como se", "para que sirve",
    "significado", "pelicula", "serie", "capitulo", "capitulos", "novela",
    "cancion", "letra", "descargar", "gratis", "pdf", "quien es",
    "wikipedia", "youtube", "tiktok", "roblox", "en vivo", "app",
]


def is_product_like(term: str) -> bool:
    t = term.lower()
    return not any(d in t for d in DENY)


def aliexpress_url(term: str) -> str:
    return "https://www.aliexpress.com/wholesale?SearchText=" + quote(term)


def to_score(value) -> int:
    # El "value" de rising es un % (int) o "Breakout" para los que explotan.
    try:
        return int(value)
    except (ValueError, TypeError):
        return 10000  # Breakout = lo más fuerte


def collect():
    niches = json.load(open(NICHES_FILE, encoding="utf-8"))
    pytrends = TrendReq(hl="es-CO", tz=300)
    items, seen = [], set()

    for niche in niches:
        seed, label = niche["seed"], niche["label"]
        try:
            pytrends.build_payload([seed], geo=GEO, timeframe=TIMEFRAME)
            rq = pytrends.related_queries().get(seed, {}) or {}
            rows = rq.get("rising")
            if rows is None or rows.empty:
                rows = rq.get("top")
            if rows is None or rows.empty:
                print(f"  (sin datos) {label}")
                continue
            for _, r in rows.head(PER_NICHE).iterrows():
                term = str(r["query"]).strip()
                key = term.lower()
                if key in seen or len(term) < 3 or not is_product_like(term):
                    continue
                seen.add(key)
                items.append(
                    {
                        "term": term,
                        "niche": label,
                        "score": to_score(r["value"]),
                        "aliexpress": aliexpress_url(term),
                    }
                )
            print(f"  OK {label}")
        except Exception as e:  # noqa: BLE001 - un nicho que falle no debe tumbar todo
            print(f"  (aviso) fallo en '{seed}': {type(e).__name__}")
        time.sleep(2)  # ser amables con Google Trends

    items.sort(key=lambda x: x["score"], reverse=True)
    return items


def main():
    items = collect()
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    data = {
        "generatedAt": datetime.datetime.now().isoformat(timespec="seconds"),
        "geo": GEO,
        "items": items,
    }
    json.dump(data, open(OUT_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nGuardadas {len(items)} tendencias en {OUT_FILE}\n")
    for it in items[:12]:
        s = "Breakout" if it["score"] >= 10000 else f"+{it['score']}%"
        print(f"  [{s:>9}] {it['term']}  ({it['niche']})")


if __name__ == "__main__":
    main()
