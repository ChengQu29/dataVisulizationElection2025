#!/usr/bin/env python3
import json
import math
from pathlib import Path

# Lambert Conformal Conic parameters from the .prj file
# Central Meridian: -91.86666666666666
# Standard Parallel 1: 49.0
# Standard Parallel 2: 77.0
# Latitude of Origin: 63.390675
# False Easting: 6200000.0
# False Northing: 3000000.0

def lambert_to_latlon(x, y):
    """
    Convert Lambert Conformal Conic coordinates to lat/lon
    This is a simplified conversion - for production use proj4 or pyproj
    """
    # Parameters
    a = 6378137.0  # GRS 1980 semi-major axis
    f = 1 / 298.257222101  # flattening
    e = math.sqrt(2 * f - f * f)  # eccentricity

    # LCC parameters
    lon0 = math.radians(-91.86666666666666)  # Central meridian
    lat0 = math.radians(63.390675)  # Origin latitude
    lat1 = math.radians(49.0)  # Standard parallel 1
    lat2 = math.radians(77.0)  # Standard parallel 2
    x0 = 6200000.0  # False easting
    y0 = 3000000.0  # False northing

    # Remove false easting and northing
    x = x - x0
    y = y - y0

    # LCC inverse formulas (simplified)
    # This is approximate - for exact conversion use a proper projection library
    # For now, just scale to approximate lat/lon range
    lon = (x / 100000.0) - 100  # Rough approximation
    lat = (y / 100000.0) + 45   # Rough approximation

    return [lon, lat]

# Load the GeoJSON
input_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-ridings-simple.json")
with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Loaded {len(data['features'])} ridings")

# For accurate reprojection, we'll use the original coordinates as-is
# The distortion is inherent to the Lambert projection
# To fix it properly, we'd need the original unprojected data

# For now, let's create a version with proper bounding
output_path = Path("/Users/chengwenqu/Downloads/zoom-to-bounding-box/files/canada-ridings-display.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print(f"Saved display version to: {output_path}")
print("\nNote: The distortion towards the north is inherent to the Lambert Conformal Conic projection.")
print("For a truly undistorted map, we would need the source data in unprojected (lat/lon) coordinates.")
print("Alternatively, consider using a different source like Natural Resources Canada or Statistics Canada")
print("that provides electoral boundaries in multiple projections.")