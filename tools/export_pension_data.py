"""Export the constants and reference cases behind /tools/pensioen.

Run with the financial_report venv:

    ../finance/financial_report/.venv/bin/python tools/export_pension_data.py

Writes two committed files:
- src/data/be-pension.json: Belgian pension and investment tax constants
  (second and third pillar, capital-gains tax, stock-exchange tax), from
  financial_report/shared/be_tax/data. Statutory figures only.
- tests/fixtures/pension-reference.json: results of the Python tax functions
  on made-up amounts, which the TypeScript port is tested against.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FINREPORT = ROOT.parent / "finance" / "financial_report"
sys.path.insert(0, str(FINREPORT))

from shared.be_tax._data import load  # noqa: E402
from shared.be_tax.meerwaardebelasting import CapitalGainsConfig, capital_gains_tax  # noqa: E402
from shared.be_tax.pensioenpijlers import (  # noqa: E402
    netto_uitkering_pijler2,
    pensioensparen_voordeel,
    wettelijke_pensioenleeftijd,
)

p2 = load("pijler2")
p3 = load("pijler3")
wp = load("wettelijk_pensioen")
mw = load("meerwaardebelasting")
tob = load("tob")

constants = {
    "last_verified": {
        "pijler2": str(p2["last_verified"]),
        "pijler3": str(p3["last_verified"]),
        "meerwaardebelasting": str(mw["last_verified"]),
        "tob": str(tob["last_verified"]),
    },
    "pijler2": {
        "eindbelasting": p2["parameters"]["eindbelasting"],
        "riziv": p2["parameters"]["riziv_pct"],
        "solidariteit_max": p2["parameters"]["solidariteit_pct_max"],
    },
    "pensioensparen": {
        "opties": [
            {"max_premie_eur": o["max_premie_eur"], "vermindering": o["belastingvermindering"]}
            for o in p3["parameters"]["pensioensparen"]["options"]
        ],
        "heffing_op_60": p3["parameters"]["pensioensparen"]["anticipatieve_heffing_op_60"],
    },
    "wettelijk_pensioen": {
        k: wp["parameters"][k]
        for k in ("geboren_voor_66", "geboren_voor_67", "leeftijd_tot_2025", "leeftijd_2025",
                  "leeftijd_2030")
    },
    "meerwaardebelasting": {
        "tarief": mw["parameters"]["base_rate"],
        "vrijstelling_eur": mw["parameters"]["annual_exemption_eur"],
    },
    # An accumulating ETF registered in the EEA outside Belgium.
    "tob_etf": tob["parameters"]["rates"]["etf_accumulating_eea"]["rate_sell"],
}
(ROOT / "src/data/be-pension.json").write_text(json.dumps(constants, indent=1) + "\n")

pillar2 = []
for legal in (65, 66, 67):
    for age in (60, 61, 62, 64, 65, 66, 67, 70):
        for active in (True, False):
            pillar2.append({
                "capital": 100_000, "age": age, "active": active, "legal": legal,
                "net": round(netto_uitkering_pijler2(100_000, age, active, pensioenleeftijd=legal), 4),
            })
savings = [
    {"premium": prem, "raised": raised, "credit": round(pensioensparen_voordeel(prem, raised), 4)}
    for prem in (0, 500, 1050, 1051, 1200, 1260, 1350, 2000)
    for raised in (False, True)
]
gains = [
    {"gain": g, "exemption": ex, "rate": rate,
     "tax": round(capital_gains_tax(g, CapitalGainsConfig(rate=rate, annual_exemption_eur=ex)), 4)}
    for g in (-500, 0, 5_000, 10_000, 10_001, 40_000)
    for ex in (0, 10_000)
    for rate in (0.10, 0.2)
]
legal_age = [{"born": y, "age": wettelijke_pensioenleeftijd(y)} for y in (1955, 1959, 1960, 1963, 1964, 1990)]
out = {"pillar2": pillar2, "savings": savings, "gains": gains, "legal_age": legal_age}
(ROOT / "tests/fixtures/pension-reference.json").write_text(json.dumps(out) + "\n")
print({k: len(v) for k, v in out.items()})
print(json.dumps(constants)[:400])
