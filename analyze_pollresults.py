#!/usr/bin/env python3
"""Summarize total votes per candidate and riding using NumPy."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import List

import numpy as np


DATA_DIR = Path(__file__).resolve().parent / "pollresults_resultatsbureauCanada"


def load_rows(csv_files: List[Path]):
    district_num = []
    district_name = []
    candidate_full = []
    party_name = []
    vote_count = []

    for csv_file in csv_files:
        with csv_file.open("r", newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                dist_num = row.get("Electoral District Number/Numéro de circonscription", "").strip()
                dist_name = row.get("Electoral District Name_English/Nom de circonscription_Anglais", "").strip()

                family = row.get("Candidate’s Family Name/Nom de famille du candidat", "").strip()
                middle = row.get("Candidate’s Middle Name/Second prénom du candidat", "").strip()
                first = row.get("Candidate’s First Name/Prénom du candidat", "").strip()
                party = row.get("Political Affiliation Name_English/Appartenance politique_Anglais", "").strip()

                votes_raw = row.get("Candidate Vote Count/Votes du candidat", "").strip()
                if not dist_num or not dist_name or not family or not first or not party or votes_raw == "":
                    continue

                full_name = " ".join(part for part in [first, middle, family] if part)

                district_num.append(dist_num)
                district_name.append(dist_name)
                candidate_full.append(full_name)
                party_name.append(party)
                vote_count.append(int(votes_raw))

    return (
        np.array(district_num, dtype="U"),
        np.array(district_name, dtype="U"),
        np.array(candidate_full, dtype="U"),
        np.array(party_name, dtype="U"),
        np.array(vote_count, dtype=np.int64),
    )


def summarize():
    csv_files = sorted(DATA_DIR.glob("pollresults_resultatsbureau*.csv"))
    if not csv_files:
        raise SystemExit(f"No CSV files found in {DATA_DIR}")

    district_num, district_name, candidate_full, party_name, vote_count = load_rows(csv_files)

    keys = np.char.add(
        np.char.add(
            np.char.add(np.char.add(district_num, "\t"), district_name),
            "\t",
        ),
        np.char.add(np.char.add(candidate_full, "\t"), party_name),
    )

    unique_keys, inverse = np.unique(keys, return_inverse=True)
    totals = np.bincount(inverse, weights=vote_count).astype(np.int64)

    rows = []
    for key, total in zip(unique_keys, totals):
        dist_num, dist_name, cand, party = key.split("\t")
        rows.append((dist_num, dist_name, cand, party, total))

    district_totals = {}
    for dist_num, _dist_name, _cand, _party, total in rows:
        district_totals[dist_num] = district_totals.get(dist_num, 0) + total

    rows.sort(key=lambda r: (int(r[0]), r[2]))

    output_path = Path(__file__).resolve().parent / "result.csv"
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "Electoral District Number",
            "Electoral District Name",
            "Candidate Full Name",
            "Political Party",
            "Total Votes",
            "Vote Share (%)",
        ])
        for dist_num, dist_name, cand, party, total in rows:
            district_total = district_totals.get(dist_num, 0)
            share = (total / district_total * 100) if district_total else 0
            writer.writerow([dist_num, dist_name, cand, party, total, f"{share:.1f}"])

    for dist_num, dist_name, cand, party, total in rows:
        district_total = district_totals.get(dist_num, 0)
        share = (total / district_total * 100) if district_total else 0
        print(f"{dist_num}\t{dist_name}\t{cand}\t{party}\t{total}\t{share:.1f}%")


if __name__ == "__main__":
    summarize()
