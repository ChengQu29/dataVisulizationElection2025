#!/usr/bin/env python3
"""Summarize total votes per candidate and riding without NumPy."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent / "pollresults_resultatsbureauCanada"
PROVINCE_BY_PREFIX = {
    "10": "Newfoundland and Labrador",
    "11": "Prince Edward Island",
    "12": "Nova Scotia",
    "13": "New Brunswick",
    "24": "Quebec",
    "35": "Ontario",
    "46": "Manitoba",
    "47": "Saskatchewan",
    "48": "Alberta",
    "59": "British Columbia",
    "60": "Yukon",
    "61": "Northwest Territories",
    "62": "Nunavut",
}


def summarize():
    csv_files = sorted(DATA_DIR.glob("pollresults_resultatsbureau*.csv"))
    if not csv_files:
        raise SystemExit(f"No CSV files found in {DATA_DIR}")

    totals = {}
    names = {}

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
                key = (dist_num, dist_name, full_name, party)

                if key in totals:
                    totals[key] += int(votes_raw)
                else:
                    totals[key] = int(votes_raw)

                names[key] = key
    #one row of total: ('62001', 'Nunavut', 'Kilikvak Kabloona', 'Liberal'): 2812
    #one row of name: ('62001', 'Nunavut', 'Kilikvak Kabloona', 'Liberal')

    #convert to flat list
    rows = [(k[0], k[1], k[2], k[3], total) for k, total in totals.items()]

    #aggregate district total
    district_totals = {}
    for dist_num, _dist_name, _cand, _party, total in rows:
        district_totals[dist_num] = district_totals.get(dist_num, 0) + total

    #compute district winner
    district_winners = {}
    for dist_num, dist_name, cand, party, total in rows:
        current = district_winners.get(dist_num)
        if current is None:
            district_winners[dist_num] = (total, cand, party, dist_name)
            continue
        best_total, best_cand, best_party, _best_dist_name = current
        if total > best_total or (total == best_total and cand < best_cand):
            district_winners[dist_num] = (total, cand, party, dist_name)
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

    seat_counts = defaultdict(int) #this is just more pythonic
    for _dist_num, (_total, _cand, party, _dist_name) in district_winners.items():
        seat_counts[party] += 1

    seats_path = Path(__file__).resolve().parent / "result_seats.csv"
    with seats_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Political Party", "Seats"])
        for party, seats in sorted(seat_counts.items(), key=lambda item: (-item[1], item[0])):
            writer.writerow([party, seats])

    seats_by_province = defaultdict(int)
    for dist_num, (_total, _cand, party, _dist_name) in district_winners.items():
        province = PROVINCE_BY_PREFIX.get(dist_num[:2], "Unknown")
        seats_by_province[(province, party)] += 1

    seats_by_province_path = Path(__file__).resolve().parent / "result_seats_by_province.csv"
    with seats_by_province_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Province", "Political Party", "Seats"])
        for (province, party), seats in sorted(
            seats_by_province.items(),
            key=lambda item: (item[0][0], -item[1], item[0][1]),
        ):
            writer.writerow([province, party, seats])

    for dist_num, dist_name, cand, party, total in rows:
        district_total = district_totals.get(dist_num, 0)
        share = (total / district_total * 100) if district_total else 0
        # print(f"{dist_num}\t{dist_name}\t{cand}\t{party}\t{total}\t{share:.1f}%")


if __name__ == "__main__":
    summarize()
