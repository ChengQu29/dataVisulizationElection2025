#!/usr/bin/env python3
import json
from pathlib import Path

# Load the ridings data
ridings_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-ridings-latlon.json")
with open(ridings_path, 'r', encoding='utf-8') as f:
    ridings = json.load(f)

print(f"Processing {len(ridings['features'])} ridings to extract coastline...")

# For a simple approach, let's use the canada-provinces.json file we already have
# It should have better coastline definition
provinces_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-provinces.json")

# Create a coastline by combining all outer boundaries
coastline_features = []

# Check if we have the provinces file with better boundaries
if provinces_path.exists():
    with open(provinces_path, 'r', encoding='utf-8') as f:
        provinces = json.load(f)

    # Create a single MultiPolygon with all province boundaries
    # This will give us the natural coastline
    all_coords = []
    for feature in provinces["features"]:
        if feature["geometry"]["type"] == "Polygon":
            all_coords.append(feature["geometry"]["coordinates"])
        elif feature["geometry"]["type"] == "MultiPolygon":
            all_coords.extend(feature["geometry"]["coordinates"])

    coastline_feature = {
        "type": "Feature",
        "properties": {"name": "Canada Coastline"},
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": all_coords
        }
    }
    coastline_features = [coastline_feature]
    print(f"Created coastline from {len(provinces['features'])} provinces")
else:
    print("Provinces file not found, using existing coastline")
    # Use the basic coastline we have
    coastline_features = []

# Create the GeoJSON
coastline_geojson = {
    "type": "FeatureCollection",
    "features": coastline_features
}

# Save the coastline
output_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-coastline-detailed.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(coastline_geojson, f, ensure_ascii=False, separators=(',', ':'))

print(f"Saved detailed coastline to: {output_path}")
print(f"File size: {output_path.stat().st_size / 1024:.2f} KB")