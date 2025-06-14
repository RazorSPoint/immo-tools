def calculate_total_distance(coords):
    """
    Berechnet die Gesamtdistanz (in km) für eine Liste von (lat, lon)-Tupeln in Reihenfolge.
    Gibt eine Liste der Abschnittsdistanzen und die Gesamtdistanz zurück.
    """
    if not coords or len(coords) < 2:
        return [], 0.0
    section_distances = []
    total = 0.0
    for i in range(1, len(coords)):
        d = haversine(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1])
        section_distances.append(d)
        total += d
    return section_distances, total
import math
import time
import urllib.request
import urllib.parse
import json

HEADERS = {
    'User-Agent': 'Timeline-Analysis-Script for Personal Use'
}

def haversine(lat1, lon1, lat2, lon2):
    """
    Berechnet die Entfernung zwischen zwei Punkten auf der Erde (in km) anhand ihrer Längen- und Breitengrade.
    """
    R = 6371  # Erdradius in km
    # Umwandlung von Grad in Bogenmaß
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    # Haversine-Formel
    # a = sin²(Δφ/2) + cos(φ₁) * cos(φ₂) * sin²(Δλ/2)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    # c = 2 * atan2(√a, √(1−a))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

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

def get_address_from_coords(lat, lon):
    """
    Fragt Adressdaten für Koordinaten über die Nominatim API ab.
    """
    # Kurze Pause, um die öffentliche API nicht zu überlasten
    time.sleep(0.5)

    params = urllib.parse.urlencode({
        'format': 'json',
        'lat': lat,
        'lon': lon,
        'addressdetails': 1
    })
    url = f"https://nominatim.openstreetmap.org/reverse?{params}"
    req = urllib.request.Request(url, headers=HEADERS)

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('address', {})
            return None
    except Exception as e:
        print(f"Fehler bei der API-Anfrage: {e}")
        return None
