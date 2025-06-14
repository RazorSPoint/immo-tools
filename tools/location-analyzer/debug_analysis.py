import json
from datetime import datetime
from location_utils import haversine, extract_all_coordinates

# Konfiguration
TARGET_YEAR = 2024
TARGET_LAT = 52.3660644
TARGET_LON = 13.4110777
TARGET_RADIUS_KM = 2.0

def debug_analyze():
    print("=== DEBUG ANALYSE ===")

    # Lade JSON
    with open('Zeitachse.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    segments = data.get('semanticSegments', [])
    print(f"Gesamt Segmente: {len(segments)}")

    # Zähler für Debug
    total_segments_2024 = 0
    coords_found = 0
    coords_in_radius = 0
    coords_with_data = {}  # {datum: [(lat, lon, segment_info)]}

    for i, segment in enumerate(segments):
        start_time_str = segment.get('startTime')
        if not start_time_str:
            continue

        try:
            start_time = datetime.fromisoformat(start_time_str)
            if start_time.year != TARGET_YEAR:
                continue
            total_segments_2024 += 1
        except ValueError:
            continue

        # Debug: Was ist in diesem Segment?
        datum = start_time.strftime('%d.%m.%Y')

        # Extrahiere alle Koordinaten
        coords_to_check = extract_all_coordinates(segment)

        if coords_to_check:
            coords_found += len(coords_to_check)

        for latlng_str in coords_to_check:
            try:
                lat_str, lon_str = latlng_str.split('°, ')
                lat = float(lat_str.replace('°', ''))
                lon = float(lon_str.replace('°', ''))
            except (ValueError, IndexError):
                continue

            # Prüfe Distanz
            dist = haversine(TARGET_LAT, TARGET_LON, lat, lon)
            if dist <= TARGET_RADIUS_KM:
                coords_in_radius += 1

                # Sammle für Tagesanalyse
                coords_with_data.setdefault(datum, []).append({
                    'lat': lat,
                    'lon': lon,
                    'dist': dist,
                    'segment_index': i,
                    'zeit': start_time.strftime('%H:%M:%S'),
                    'segment_type': 'visit' if segment.get('visit') else 'activity' if segment.get('activity') else 'timeline'
                })

    print(f"2024 Segmente: {total_segments_2024}")
    print(f"Koordinaten gefunden: {coords_found}")
    print(f"Koordinaten im Radius: {coords_in_radius}")
    print(f"Tage mit Daten: {len(coords_with_data)}")

    # Zeige Details pro Tag
    print("\n=== TAGES-DETAILS ===")
    for datum in sorted(coords_with_data.keys()):
        coords = coords_with_data[datum]
        print(f"\n{datum}: {len(coords)} Koordinaten")

        # Sortiere nach Zeit
        coords_sorted = sorted(coords, key=lambda x: x['zeit'])

        total_dist = 0.0
        for j in range(1, len(coords_sorted)):
            d = haversine(
                coords_sorted[j-1]['lat'], coords_sorted[j-1]['lon'],
                coords_sorted[j]['lat'], coords_sorted[j]['lon']
            )
            total_dist += d

        print(f"  Berechnete Tagesstrecke: {total_dist:.3f} km")
        print(f"  Erste Koordinate: {coords_sorted[0]['zeit']} ({coords_sorted[0]['segment_type']})")
        print(f"  Letzte Koordinate: {coords_sorted[-1]['zeit']} ({coords_sorted[-1]['segment_type']})")

        # Zeige erste 3 und letzte 3 Koordinaten
        if len(coords_sorted) > 6:
            print(f"  Koordinaten (erste 3): ")
            for coord in coords_sorted[:3]:
                print(f"    {coord['zeit']}: ({coord['lat']:.6f}, {coord['lon']:.6f}) - {coord['segment_type']}")
            print(f"  ...")
            print(f"  Koordinaten (letzte 3): ")
            for coord in coords_sorted[-3:]:
                print(f"    {coord['zeit']}: ({coord['lat']:.6f}, {coord['lon']:.6f}) - {coord['segment_type']}")
        else:
            print(f"  Alle Koordinaten:")
            for coord in coords_sorted:
                print(f"    {coord['zeit']}: ({coord['lat']:.6f}, {coord['lon']:.6f}) - {coord['segment_type']}")

if __name__ == '__main__':
    debug_analyze()
