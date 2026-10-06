"""Export the data behind /tools/withdrawal from the local finance repos.

Run with the financial_report venv, which resolves `market_data`:

    ../finance/financial_report/.venv/bin/python tools/export_swr_data.py

Writes two committed files:
- src/data/damodaran-real.json: Damodaran's US annual real returns
  (public data, credited on the page).
- tests/fixtures/swr-reference.json: failure rates from the Python engine
  (financial_report/shared/projections), which the JS port is tested against.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FINREPORT = ROOT.parent / "finance" / "financial_report"
sys.path.insert(0, str(FINREPORT))

import market_data as md  # noqa: E402
from shared.projections.swr_table import _bootstrap_failure_rate  # noqa: E402

df = md.factors.get("DAMODARAN_NOMINAL_VS_REAL")
years = [int(str(d)[:4]) for d in df["date"]]
data = {
    "source": "Aswath Damodaran, Historical Returns on Stocks, Bonds and Bills (NYU Stern)",
    "url": "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html",
    "years": years,
    "stocks": [round(float(x), 6) for x in df["sp500_real"]],
    "bonds": [round(float(x), 6) for x in df["tbond_real"]],
    "bills": [round(float(x), 6) for x in df["tbill_real"]],
    "inflation": [round(float(x), 6) for x in df["inflation"]],
}
(ROOT / "src/data/damodaran-real.json").write_text(json.dumps(data) + "\n")

cases = []
for equity, rate, horizon in [(0.6, 0.04, 30), (0.6, 0.05, 30), (1.0, 0.04, 30),
                              (0.4, 0.035, 40), (0.8, 0.06, 25), (0.6, 0.03, 50)]:
    fr = _bootstrap_failure_rate(
        1.0, rate, horizon, equity_weight=equity, n_paths=40_000, block_length=5,
        stationary=True, start_year=None, end_year=None, seed=7,
    )
    cases.append({"equity": equity, "rate": rate, "years": horizon, "failure": round(fr, 4)})
(ROOT / "tests/fixtures/swr-reference.json").write_text(json.dumps(cases, indent=1) + "\n")
print(f"{len(years)} years ({years[0]}-{years[-1]}); reference cases:")
for c in cases:
    print(c)
