"""Export the constants and reference cases behind /tools/huren-of-kopen.

Run with the financial_report venv:

    ../finance/financial_report/.venv/bin/python tools/export_rentbuy_data.py

Writes three committed files:
- src/data/be-realestate.json: Belgian purchase-cost constants (registration
  duties per region, the notary fee scale). Statutory figures only; nothing
  here comes from a client folder.
- src/data/returns.json: the plan engine's long-run return assumptions
  (shared/projections/assumptions.py, DMS_BASELINE), for the portfolio mix.
- tests/fixtures/rentbuy-reference.json: results of the Python engine
  (financial_report/shared/rentbuy.project_cashflows) on made-up inputs,
  which the TypeScript port is tested against.
"""
from __future__ import annotations

import dataclasses
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FINREPORT = ROOT.parent / "finance" / "financial_report"
sys.path.insert(0, str(FINREPORT))

from shared.be_realestate import (  # noqa: E402
    RegistrationConfig,
    notariskosten,
    notary_fee_purchase,
    registratierechten,
)
from shared.be_realestate._data import load  # noqa: E402
from shared.projections.assumptions import DMS_BASELINE  # noqa: E402
from shared.rentbuy import CashflowInputs, project_cashflows  # noqa: E402

reg = load("registratierechten")
p = reg["parameters"]
constants = {
    "last_verified": str(reg["last_verified"]),
    "registratierechten": {
        "VL": {
            "enige_eigen_woning": p["vlaanderen"]["rates"]["enige_eigen_woning"],
            "standaard": p["vlaanderen"]["rates"]["standaard"],
            "vermindering_bescheiden_woning": {
                k: p["vlaanderen"]["vermindering_bescheiden_woning"][k]
                for k in ("bedrag_eur", "max_grondslag_eur", "max_grondslag_kernstad_eur")
            },
        },
        "WA": {
            "enige_eigen_woning": p["wallonie"]["rates"]["eigen_en_enige_woning"],
            "standaard": p["wallonie"]["rates"]["standaard"],
        },
        "BR": {
            "standaard": p["brussel"]["rates"]["standaard"],
            "abattement_eur": p["brussel"]["abattement_eur_eerste_schijf"],
            "abattement_max_grondslag_eur": p["brussel"]["abattement_max_grondslag_eur"],
        },
    },
    "notaris": {
        # [upper bound of the bracket (null = no limit), rate]
        "schijven": [
            [None if math.isinf(upper) else upper, rate]
            for upper, rate in notariskosten.NOTARY_FEE_BRACKETS
        ],
        "vaste_kosten_eur": notariskosten.NOTARY_FIXED_COSTS_EUR,
        "btw": notariskosten.VAT_RATE,
    },
}
(ROOT / "src/data/be-realestate.json").write_text(json.dumps(constants, indent=1) + "\n")

returns = {
    "source": "Dimson, Marsh & Staunton, UBS Global Investment Returns Yearbook 2024",
    "period": "1900-2024",
    # Per year, above inflation, before costs and taxes.
    "equity_real": DMS_BASELINE.equity_real_mu,
    "bond_real": DMS_BASELINE.bond_real_mu,
    "inflation": DMS_BASELINE.inflation_mu,
}
(ROOT / "src/data/returns.json").write_text(json.dumps(returns, indent=1) + "\n")

VERDICTS = {
    "Huren is financieel voordeliger over deze horizon gegeven de aannames.": "huren",
    "Kopen is financieel voordeliger over deze horizon gegeven de aannames.": "kopen",
    "Quasi-pariteit — niet-financiële factoren bepalen de keuze.": "pariteit",
}

# Made-up inputs that cover each region, both rates, a loan that ends inside
# the horizon, a zero mortgage rate, a full cash purchase and near-parity.
CASES = [
    {},
    dict(home_value_eur=425_000, monthly_rent_eur=1_100, holding_period_years=10),
    dict(home_value_eur=400_000, monthly_rent_eur=1_300, holding_period_years=30,
         opportunity_cost=0.07, property_tax_pct=0.003),
    dict(home_value_eur=210_000, monthly_rent_eur=850, holding_period_years=15),
    dict(home_value_eur=350_000, monthly_rent_eur=1_400, region="WA", holding_period_years=20),
    dict(home_value_eur=350_000, monthly_rent_eur=1_400, region="WA", is_sole_own_home=False,
         holding_period_years=20),
    dict(home_value_eur=500_000, monthly_rent_eur=1_600, region="BR", holding_period_years=25,
         mortgage_term_years=20),
    dict(home_value_eur=650_000, monthly_rent_eur=2_000, region="BR", holding_period_years=12),
    dict(home_value_eur=300_000, monthly_rent_eur=1_000, mortgage_rate=0.0,
         holding_period_years=8),
    dict(home_value_eur=300_000, monthly_rent_eur=1_000, down_payment_pct=1.0,
         holding_period_years=8),
    dict(home_value_eur=450_000, monthly_rent_eur=1_500, is_sole_own_home=False,
         mortgage_term_years=10, holding_period_years=40, house_growth_pct=0.02,
         rent_growth_pct=0.03, selling_cost_pct=0.05, insurance_pct=0.002,
         maintenance_pct=0.015, down_payment_pct=0.35, mortgage_rate=0.045),
    dict(home_value_eur=400_000, monthly_rent_eur=1_250, holding_period_years=1),
]
BASE = dict(home_value_eur=400_000, monthly_rent_eur=1_200)

cases = []
for overrides in CASES:
    inp = CashflowInputs(**{**BASE, **overrides})
    res = project_cashflows(inp)
    cases.append({
        "inputs": dataclasses.asdict(inp),
        "upfront_transaction_eur": round(res.upfront_transaction_eur, 4),
        "monthly_mortgage_payment_eur": round(res.monthly_mortgage_payment_eur, 4),
        "buyer_net_worth_eur": round(res.buyer_net_worth_eur, 4),
        "renter_net_worth_eur": round(res.renter_net_worth_eur, 4),
        "breakeven_year": res.breakeven_year,
        "verdict": VERDICTS[res.verdict],
        "schedule": [
            {k: round(float(v), 4) for k, v in row.items()}
            for row in res.schedule.to_dict("records")
        ],
    })

purchase = []
for price in (150_000, 219_999, 220_000, 220_001, 240_000, 400_000, 600_000, 600_001, 900_000):
    for region in ("VL", "WA", "BR"):
        for sole in (True, False):
            for kernstad in ((False, True) if region == "VL" else (False,)):
                cfg = RegistrationConfig(
                    region=region, is_sole_own_home=sole, kernstad_of_vlaamse_rand=kernstad
                )
                purchase.append({
                    "price": price, "region": region, "sole": sole, "kernstad": kernstad,
                    "registratierechten": round(registratierechten(price, cfg), 4),
                    "notaris": round(notary_fee_purchase(price), 4),
                })

out = {"cashflow": cases, "purchase": purchase}
(ROOT / "tests/fixtures/rentbuy-reference.json").write_text(json.dumps(out) + "\n")
print(f"{len(cases)} cash-flow cases, {len(purchase)} purchase-cost cases")
for c in cases:
    print(c["inputs"]["region"], c["inputs"]["holding_period_years"], c["verdict"],
          c["breakeven_year"], round(c["buyer_net_worth_eur"] - c["renter_net_worth_eur"]))
