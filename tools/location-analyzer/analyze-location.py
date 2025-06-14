def extract_all_coordinates(segment):
    """
    Extrahiert alle relevanten Koordinaten-Strings aus einem Segment.
    Gibt eine Liste von Strings im Format "lat°, lon°" zurück.
    """
    coords = []
    # 1. visit.topCandidate.placeLocation.latLng
    visit = segment.get('visit')
    if visit:
        top_candidate = visit.get('topCandidate')
        if top_candidate:
            place_location = top_candidate.get('placeLocation')
            if place_location and isinstance(place_location, dict):
                latlng = place_location.get('latLng')
                if latlng:
                    coords.append(latlng)
    # 2. activity.start.latLng und activity.end.latLng
    activity = segment.get('activity')
    if activity:
        for key in ['start', 'end']:
            point = activity.get(key)
            if point and isinstance(point, dict):
                latlng = point.get('latLng')
                if latlng:
                    coords.append(latlng)
    # 3. timelinePath[].point
    timeline_path = segment.get('timelinePath')
    if timeline_path and isinstance(timeline_path, list):
        for path_point in timeline_path:
            latlng = path_point.get('point')
            if latlng:
                coords.append(latlng)
    return coords
from datetime import datetime

import json
import time
from location_utils import haversine, extract_all_coordinates, get_address_from_coords, calculate_total_distance

# --- Configuration ---
TARGET_YEAR = 2024
TARGET_POSTCODE = "15831"
FILE_PATH = "Zeitachse.json" # Name Ihrer JSON-Datei

# Zielkoordinate (Kirschenhof 2, 15831)
TARGET_LAT = 52.3660644
TARGET_LON = 13.4110777
TARGET_RADIUS_KM = 2.0



def analyze_timeline(file_path, year, postcode):
    """
    Analysiert die Google Zeitachsen-JSON-Datei und findet Besuche
    in einem bestimmten Jahr und mit einer bestimmten Postleitzahl.
    """
    print(f"Lese Datei: {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"[FEHLER] Die Datei '{file_path}' wurde nicht gefunden.")
        print("Stellen Sie sicher, dass die Datei im selben Ordner wie das Skript liegt.")
        return
    except json.JSONDecodeError:
        print(f"[FEHLER] Die Datei '{file_path}' ist keine gültige JSON-Datei.")
        return


    found_locations = []  # Für CSV: alle Einzeltreffer (mit Distanz zum vorherigen)
    processed_coords = set()
    day_coords = {}  # {datum: [ (lat, lon, ort, strasse, plz, zeit) ] }

    segments = data.get('semanticSegments', [])
    if not segments:
        print("[INFO] Keine 'semanticSegments' in der Datei gefunden.")
        return

    print(f"Analysiere {len(segments)} Segmente für das Jahr {year} und PLZ {postcode}...")

    for i, segment in enumerate(segments):
        # 1. Zeitfilter
        start_time_str = segment.get('startTime')
        if not start_time_str:
            continue
        try:
            start_time = datetime.fromisoformat(start_time_str)
            if start_time.year != year:
                continue
        except ValueError:
            continue

        # 2. Koordinaten extrahieren
        coords_to_check = extract_all_coordinates(segment)
        if not coords_to_check:
            continue

        for latlng_str in coords_to_check:
            try:
                lat_str, lon_str = latlng_str.split('°, ')
                lat = float(lat_str.replace('°', ''))
                lon = float(lon_str.replace('°', ''))
            except (ValueError, IndexError):
                continue

            # 3. Distanzfilter
            dist = haversine(TARGET_LAT, TARGET_LON, lat, lon)
            if dist > TARGET_RADIUS_KM:
                continue

            coord_tuple = (round(lat, 6), round(lon, 6))
            if coord_tuple in processed_coords:
                continue

            # 4. Adresse abfragen
            print(f"Prüfe Segment {i+1}/{len(segments)}: {start_time.strftime('%d.%m.%Y')} an Koordinate {coord_tuple} (Entfernung: {dist:.2f} km)")
            address = get_address_from_coords(lat, lon)
            processed_coords.add(coord_tuple)

            # 5. Postleitzahl prüfen und Ergebnis speichern
            if address and address.get('postcode') == postcode:
                datum = start_time.strftime('%d.%m.%Y')
                ort = address.get('village') or address.get('suburb') or address.get('town') or 'N/A'
                strasse = address.get('road', 'N/A')
                plz = address.get('postcode')
                zeit = start_time.strftime('%H:%M:%S')
                # Für Tagesauswertung sammeln
                day_coords.setdefault(datum, []).append((lat, lon, ort, strasse, plz, zeit))
                # Für Einzel-Csv (Distanz zum vorherigen wird später berechnet)
                found_locations.append({
                    "Besuch am": datum,
                    "Ort": ort,
                    "Strasse": strasse,
                    "PLZ": plz,
                    "lat": lat,
                    "lon": lon,
                    "Uhrzeit": zeit
                })
                print(f"----> Treffer gefunden: {{'Besuch am': datum, 'Ort': ort, 'Strasse': strasse, 'PLZ': plz}}")



    print("\n--- Analyse abgeschlossen ---")
    if not found_locations:
        print(f"Keine Besuche für das Jahr {year} in der PLZ {postcode} gefunden.")
        return

    print(f"Gefundene Orte ({len(found_locations)}):")
    # Sortiere alle Einzeltreffer chronologisch
    found_locations = sorted(found_locations, key=lambda x: (x['Besuch am'], x['Uhrzeit']))

    # Abschnittsdistanzen berechnen (für bestehende CSV)
    last_lat, last_lon = None, None
    abschnitts_distanzen = []
    for loc in found_locations:
        lat, lon = loc['lat'], loc['lon']
        if last_lat is not None and last_lon is not None:
            d = haversine(last_lat, last_lon, lat, lon)
        else:
            d = 0.0
        abschnitts_distanzen.append(d)
        last_lat, last_lon = lat, lon

    # Schreibe die Ergebnisse in die Einzel-Csv (mit Abschnittsdistanz)
    import csv
    csv_file = f"analyse_ergebnis_{year}_{postcode}.csv"
    try:
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["Besuch am", "Uhrzeit", "Ort", "Strasse", "PLZ", "Distanz_km"])
            writer.writeheader()
            for loc, dist in zip(found_locations, abschnitts_distanzen):
                writer.writerow({
                    "Besuch am": loc["Besuch am"],
                    "Uhrzeit": loc["Uhrzeit"],
                    "Ort": loc["Ort"],
                    "Strasse": loc["Strasse"],
                    "PLZ": loc["PLZ"],
                    "Distanz_km": f"{dist:.3f}"
                })
        print(f"\n[INFO] CSV-Datei mit den Ergebnissen wurde erstellt: {csv_file}")
    except Exception as e:
        print(f"[FEHLER] Konnte CSV-Datei nicht schreiben: {e}")

    # Tagesauswertung: Gesamtdistanz pro Tag
    tages_csv = f"analyse_tagesstrecken_{year}_{postcode}.csv"
    try:
        with open(tages_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["Datum", "Gesamtdistanz_km"])
            writer.writeheader()
            for datum in sorted(day_coords.keys()):
                coords = [(lat, lon) for lat, lon, *_ in sorted(day_coords[datum], key=lambda x: x[-1])]
                _, total = calculate_total_distance(coords)
                writer.writerow({"Datum": datum, "Gesamtdistanz_km": f"{total:.3f}"})
        print(f"[INFO] Tagesstrecken-CSV wurde erstellt: {tages_csv}")
    except Exception as e:
        print(f"[FEHLER] Konnte Tagesstrecken-CSV nicht schreiben: {e}")


if __name__ == '__main__':
    analyze_timeline(FILE_PATH, TARGET_YEAR, TARGET_POSTCODE)