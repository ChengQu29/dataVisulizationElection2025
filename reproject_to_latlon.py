#!/usr/bin/env python3
import json
from pathlib import Path
from pyproj import Transformer

# Load the GeoJSON
input_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-ridings-simple.json")
with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Loaded {len(data['features'])} ridings")

# Define the projection transformation
# From: Lambert Conformal Conic (as defined in the .prj file)
# To: WGS84 lat/lon (EPSG:4326)

# The projection string from the .prj file
proj_string = """
+proj=lcc
+lat_1=49
+lat_2=77
+lat_0=63.390675
+lon_0=-91.86666666666666
+x_0=6200000
+y_0=3000000
+datum=NAD83
+units=m
+no_defs
"""

# Create transformer
transformer = Transformer.from_proj(
    proj_string,
    "EPSG:4326",  # WGS84 lat/lon
    always_xy=True
)

# Function to transform coordinates recursively
def transform_coords(coords):
    if isinstance(coords[0], (list, tuple)):
        # Recursive case: list of coordinates
        return [transform_coords(c) for c in coords]
    else:
        # Base case: single coordinate pair
        lon, lat = transformer.transform(coords[0], coords[1])
        return [lon, lat]

# Create new GeoJSON with transformed coordinates
geojson_latlon = {
    "type": "FeatureCollection",
    "features": []
}

for feature in data["features"]:
    new_feature = {
        "type": "Feature",
        "properties": feature["properties"],
        "geometry": {
            "type": feature["geometry"]["type"],
            "coordinates": transform_coords(feature["geometry"]["coordinates"])
        }
    }
    geojson_latlon["features"].append(new_feature)

# Save the reprojected GeoJSON
output_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-ridings-latlon.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(geojson_latlon, f, ensure_ascii=False, separators=(',', ':'))

print(f"Saved reprojected GeoJSON (lat/lon) to: {output_path}")
print(f"File size: {output_path.stat().st_size / (1024*1024):.2f} MB")

# Check sample coordinates
if geojson_latlon["features"]:
    sample = geojson_latlon["features"][0]["geometry"]["coordinates"][0][0]
    print(f"Sample coordinate (should be lon/lat): {sample}")
    print(f"Longitude range should be around -141 to -53 for Canada")
    print(f"Latitude range should be around 42 to 83 for Canada")