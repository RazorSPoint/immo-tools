import json
from datetime import datetime
import csv
import time
from location_utils import haversine, extract_all_coordinates, get_address_from_coords, calculate_total_distance

# Konfiguration für Fahrtenbuch
TARGET_YEAR = 2024
FILE_PATH = "Zeitachse.json"

# Relevante Orte für Steuer (nur Geschäftsziele)
RELEVANT_LOCATIONS = [
    {
        "name": "Blankenfelde-Mahlow",
        "lat": 52.3660644,
        "lon": 13.4110777,
        "radius_km": 2.0,
        "address": "Kirschenhof 2, 15831 Blankenfelde-Mahlow"
    },
    {
        "name": "Leipzig Geschäftsbereich",
        "lat": 51.36010668944128,
        "lon": 12.368906495788186,
        "radius_km": 20.0,
        "address": "Leipzig (Geschäftsbereich)"
    }
]

# Mindestdistanz für echte Bewegungen (in km)
MIN_MOVEMENT_KM = 0.1

def is_coordinate_relevant(lat, lon):
    """
    Prüft, ob eine Koordinate in einem der relevanten Umkreise liegt.
    Gibt den Namen des relevanten Ortes zurück oder None.
    """
    for location in RELEVANT_LOCATIONS:
        dist = haversine(location["lat"], location["lon"], lat, lon)
        if dist <= location["radius_km"]:
            return location["name"]
    return None

def filter_significant_movements(coords_with_time):
    """
    Filtert nur signifikante Bewegungen (> MIN_MOVEMENT_KM).
    Behält Start- und Endpunkt immer bei.
    """
    if len(coords_with_time) <= 2:
        return coords_with_time

    filtered = [coords_with_time[0]]  # Startpunkt immer dabei

    for i in range(1, len(coords_with_time)):
        current = coords_with_time[i]
        last_kept = filtered[-1]

        dist = haversine(last_kept['lat'], last_kept['lon'],
                        current['lat'], current['lon'])

        if dist >= MIN_MOVEMENT_KM:
            filtered.append(current)

    # Endpunkt immer dabei (falls nicht schon enthalten)
    if filtered[-1] != coords_with_time[-1]:
        filtered.append(coords_with_time[-1])

    return filtered

def get_address_for_important_points(coords_list, max_requests=10):
    """
    Holt Adressen für wichtige Punkte (Start, Ende, größere Stopps).
    Begrenzt API-Requests.
    """
    if not coords_list:
        return coords_list

    # Immer Start und Ende
    important_indices = {0, len(coords_list) - 1}

    # Füge Punkte mit größeren Pausen hinzu (falls weniger als max_requests)
    if len(coords_list) > 2 and len(important_indices) < max_requests:
        # Sortiere nach Zeitabständen zum nächsten Punkt
        gaps = []
        for i in range(len(coords_list) - 1):
            current_time = datetime.fromisoformat(coords_list[i]['zeit'])
            next_time = datetime.fromisoformat(coords_list[i + 1]['zeit'])
            gap_minutes = (next_time - current_time).total_seconds() / 60
            gaps.append((gap_minutes, i))

        # Füge Punkte mit den größten Zeitlücken hinzu
        gaps.sort(reverse=True)
        for gap_minutes, idx in gaps[:max_requests - len(important_indices)]:
            if gap_minutes > 30:  # Mindestens 30 Minuten Pause
                important_indices.add(idx + 1)  # Der Punkt nach der Lücke

    # Hole Adressen für wichtige Punkte
    for idx in important_indices:
        if idx < len(coords_list):
            coord = coords_list[idx]
            if not coord.get('address'):  # Nur wenn noch keine Adresse
                address_data = get_address_from_coords(coord['lat'], coord['lon'])
                if address_data:
                    road = address_data.get('road', '')
                    city = address_data.get('city') or address_data.get('town') or address_data.get('village', '')
                    postcode = address_data.get('postcode', '')
                    coord['address'] = f"{road}, {postcode} {city}".strip(', ')
                else:
                    coord['address'] = f"Koordinate ({coord['lat']:.5f}, {coord['lon']:.5f})"

    return coords_list

def analyze_fahrtenbuch(file_path, year):
    """
    Erstellt ein steuerkonformes Fahrtenbuch.
    """
    print(f"=== FAHRTENBUCH-ANALYSE {year} ===")
    print(f"Lade Datei: {file_path}...")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"[FEHLER] Die Datei '{file_path}' wurde nicht gefunden.")
        return
    except json.JSONDecodeError:
        print(f"[FEHLER] Die Datei '{file_path}' ist keine gültige JSON-Datei.")
        return

    segments = data.get('semanticSegments', [])
    print(f"Analysiere {len(segments)} Segmente für das Jahr {year}...")

    # Schritt 1: Finde alle relevanten Tage
    relevant_days = set()
    day_reasons = {}  # {datum: reason}

    for segment in segments:
        start_time_str = segment.get('startTime')
        if not start_time_str:
            continue

        try:
            start_time = datetime.fromisoformat(start_time_str)
            if start_time.year != year:
                continue
        except ValueError:
            continue

        datum = start_time.strftime('%Y-%m-%d')

        # Prüfe alle Koordinaten in diesem Segment
        coords_to_check = extract_all_coordinates(segment)
        for latlng_str in coords_to_check:
            try:
                lat_str, lon_str = latlng_str.split('°, ')
                lat = float(lat_str.replace('°', ''))
                lon = float(lon_str.replace('°', ''))
            except (ValueError, IndexError):
                continue

            reason = is_coordinate_relevant(lat, lon)
            if reason:
                relevant_days.add(datum)
                # Priorisiere Heimadresse als Grund
                if datum not in day_reasons or reason == "Berlin Heimadresse":
                    day_reasons[datum] = reason
                break  # Ein relevanter Punkt reicht für den Tag

    print(f"Relevante Tage gefunden: {len(relevant_days)}")
    for day in sorted(relevant_days):
        print(f"  {day}: {day_reasons[day]}")

    # Schritt 2: Sammle ALLE Koordinaten für relevante Tage
    daily_movements = {}  # {datum: [coords_with_time]}

    for segment in segments:
        start_time_str = segment.get('startTime')
        if not start_time_str:
            continue

        try:
            start_time = datetime.fromisoformat(start_time_str)
            if start_time.year != year:
                continue
        except ValueError:
            continue

        datum = start_time.strftime('%Y-%m-%d')
        if datum not in relevant_days:
            continue

        # Sammle alle Koordinaten dieses Segments
        coords_to_check = extract_all_coordinates(segment)
        for latlng_str in coords_to_check:
            try:
                lat_str, lon_str = latlng_str.split('°, ')
                lat = float(lat_str.replace('°', ''))
                lon = float(lon_str.replace('°', ''))
            except (ValueError, IndexError):
                continue

            daily_movements.setdefault(datum, []).append({
                'lat': lat,
                'lon': lon,
                'zeit': start_time_str,
                'datum': datum,
                'grund': day_reasons[datum]
            })

    # Schritt 3: Erstelle Fahrtenbuch
    tagesuebersicht = []
    detailrouten = []

    print(f"\n=== VERARBEITUNG DER FAHRTEN ===")

    for datum in sorted(daily_movements.keys()):
        coords = daily_movements[datum]
        grund = day_reasons[datum]

        print(f"\nVerarbeite {datum} ({grund}): {len(coords)} Koordinaten")

        # Sortiere chronologisch
        coords.sort(key=lambda x: x['zeit'])

        # Filtere signifikante Bewegungen
        filtered_coords = filter_significant_movements(coords)
        print(f"  Nach Filterung: {len(filtered_coords)} signifikante Bewegungen")

        if len(filtered_coords) < 2:
            print("  Überspringe Tag (zu wenig Bewegung)")
            continue

        # Hole Adressen für wichtige Punkte
        coords_with_addresses = get_address_for_important_points(filtered_coords, max_requests=5)

        # Berechne Strecken
        route_coords = [(c['lat'], c['lon']) for c in coords_with_addresses]
        section_distances, total_distance = calculate_total_distance(route_coords)

        # Tagesübersicht
        start_time = datetime.fromisoformat(coords_with_addresses[0]['zeit'])
        end_time = datetime.fromisoformat(coords_with_addresses[-1]['zeit'])

        tagesuebersicht.append({
            'Datum': datum,
            'Grund': grund,
            'Startzeit': start_time.strftime('%H:%M:%S'),
            'Endzeit': end_time.strftime('%H:%M:%S'),
            'Start_Adresse': coords_with_addresses[0].get('address', 'Unbekannt'),
            'Ende_Adresse': coords_with_addresses[-1].get('address', 'Unbekannt'),
            'Gesamtstrecke_km': f"{total_distance:.2f}",
            'Wegpunkte_Anzahl': len(coords_with_addresses)
        })

        # Detailroute
        kumuliert = 0.0
        for i, coord in enumerate(coords_with_addresses):
            if i > 0:
                kumuliert += section_distances[i-1]

            time_obj = datetime.fromisoformat(coord['zeit'])
            detailrouten.append({
                'Datum': datum,
                'Uhrzeit': time_obj.strftime('%H:%M:%S'),
                'Lat': f"{coord['lat']:.6f}",
                'Lon': f"{coord['lon']:.6f}",
                'Adresse': coord.get('address', ''),
                'Abschnitt_km': f"{section_distances[i-1]:.3f}" if i > 0 else "0.000",
                'Kumuliert_km': f"{kumuliert:.3f}",
                'Grund': grund
            })

        print(f"  Gesamtstrecke: {total_distance:.2f} km")

    # Schritt 4: CSV-Export
    print(f"\n=== EXPORT ===")

    # Tagesübersicht
    overview_file = f"fahrtenbuch_tagesuebersicht_{year}.csv"
    try:
        with open(overview_file, 'w', newline='', encoding='utf-8') as f:
            if tagesuebersicht:
                writer = csv.DictWriter(f, fieldnames=tagesuebersicht[0].keys())
                writer.writeheader()
                writer.writerows(tagesuebersicht)
        print(f"✓ Tagesübersicht erstellt: {overview_file}")
    except Exception as e:
        print(f"✗ Fehler beim Erstellen der Tagesübersicht: {e}")

    # Detailrouten
    detail_file = f"fahrtenbuch_detailroute_{year}.csv"
    try:
        with open(detail_file, 'w', newline='', encoding='utf-8') as f:
            if detailrouten:
                writer = csv.DictWriter(f, fieldnames=detailrouten[0].keys())
                writer.writeheader()
                writer.writerows(detailrouten)
        print(f"✓ Detailrouten erstellt: {detail_file}")
    except Exception as e:
        print(f"✗ Fehler beim Erstellen der Detailrouten: {e}")

    print(f"\n=== ZUSAMMENFASSUNG ===")
    print(f"Relevante Tage: {len(tagesuebersicht)}")
    total_km = sum(float(day['Gesamtstrecke_km']) for day in tagesuebersicht)
    print(f"Gesamtstrecke: {total_km:.2f} km")
    print(f"Durchschnitt pro Tag: {total_km/len(tagesuebersicht):.2f} km" if tagesuebersicht else "0 km")

if __name__ == '__main__':
    analyze_fahrtenbuch(FILE_PATH, TARGET_YEAR)
