#!/usr/bin/env python3
import shapefile
import json
from pathlib import Path

# Read the shapefile
sf = shapefile.Reader("/Users/chengwenqu/Downloads/SHP/FED_CA_2025_EN")

# Get field names (excluding the first deletion flag field)
fields = [field[0] for field in sf.fields[1:]]
print(f"Fields in shapefile: {fields}")
print(f"Number of ridings: {len(sf.shapes())}")

# Create GeoJSON structure
geojson = {
    "type": "FeatureCollection",
    "features": []
}

# Process each shape and its attributes
for shape_idx, shape in enumerate(sf.shapes()):
    # Get the corresponding record (attributes)
    record = sf.records()[shape_idx]

    # Create properties dict
    properties = {}
    for field_idx, field_name in enumerate(fields):
        value = record[field_idx]
        # Handle bytes encoding
        if isinstance(value, bytes):
            value = value.decode('utf-8', errors='replace')
        properties[field_name] = value

    # Create the feature
    feature = {
        "type": "Feature",
        "properties": properties,
        "geometry": shape.__geo_interface__
    }

    geojson["features"].append(feature)

# Print sample of first riding's properties
if geojson["features"]:
    print("\nSample riding properties:")
    for key, value in geojson["features"][0]["properties"].items():
        print(f"  {key}: {value}")

# Save to file
output_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-ridings.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False)

print(f"\nGeoJSON saved to: {output_path}")
print(f"File size: {output_path.stat().st_size / (1024*1024):.2f} MB")

# Create a simplified version for better performance
print("\nCreating simplified version...")
# For web performance, we'll reduce coordinate precision
def simplify_coords(coords, precision=5):
    if isinstance(coords, (list, tuple)):
        if len(coords) > 0 and isinstance(coords[0], (list, tuple)):
            return [simplify_coords(c, precision) for c in coords]
        elif len(coords) == 2 and isinstance(coords[0], (int, float)):
            # This is a coordinate pair
            return [round(coords[0], precision), round(coords[1], precision)]
        else:
            return [simplify_coords(c, precision) for c in coords]
    else:
        return round(coords, precision)

geojson_simple = {
    "type": "FeatureCollection",
    "features": []
}

for feature in geojson["features"]:
    simple_feature = {
        "type": "Feature",
        "properties": feature["properties"],
        "geometry": {
            "type": feature["geometry"]["type"],
            "coordinates": simplify_coords(feature["geometry"]["coordinates"])
        }
    }
    geojson_simple["features"].append(simple_feature)

# Save simplified version
simple_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-ridings-simple.json")
with open(simple_path, 'w', encoding='utf-8') as f:
    json.dump(geojson_simple, f, ensure_ascii=False, separators=(',', ':'))

print(f"Simplified GeoJSON saved to: {simple_path}")
print(f"File size: {simple_path.stat().st_size / (1024*1024):.2f} MB")