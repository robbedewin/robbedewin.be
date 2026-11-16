"""Export the constants and reference cases behind /tools/risicoprofiel.

Run with the financial_report venv:

    ../finance/financial_report/.venv/bin/python tools/export_riskprofile_data.py

Writes two committed files:
- src/data/risk-capacity.json: the thresholds of the plan engine's
  risk-capacity rule (financial_report/shared/risicocapaciteit.py).
- tests/fixtures/riskprofile-reference.json: that rule's verdict on a grid of
  made-up inputs, which the TypeScript port is tested against.
"""
from __future__ import annotations

import dataclasses
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FINREPORT = ROOT.parent / "finance" / "financial_report"
sys.path.insert(0, str(FINREPORT))

from shared.plan.sections.risk_capacity import verdict  # noqa: E402
from shared.risicocapaciteit import DREMPELS  # noqa: E402

(ROOT / "src/data/risk-capacity.json").write_text(
    json.dumps(dataclasses.asdict(DREMPELS), indent=1) + "\n"
)

cases = []
for horizon in (0, 3, 4.99, 5, 7, 9.99, 10, 12, 14.99, 15, 20, 40):
    for stability in ("hoog", "matig", "laag"):
        for margin in (None, -0.2, -0.001, 0.0, 0.05, 0.0999, 0.1, 0.3):
            v, factors = verdict(horizon, stability, margin, DREMPELS)
            cases.append({
                "horizon": horizon, "stability": stability, "margin": margin,
                "verdict": v.value, "factors": [f.value for f in factors],
            })
(ROOT / "tests/fixtures/riskprofile-reference.json").write_text(json.dumps(cases) + "\n")
print(f"{len(cases)} capacity cases; thresholds {dataclasses.asdict(DREMPELS)}")
