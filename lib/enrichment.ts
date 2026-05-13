export interface EnrichmentResult {
  sunsetTime?: string;
  sunsetLocation?: string;
  travelGettingReadyToCeremony?: string;
  travelCeremonyToReception?: string;
  travelGettingReadyToReception?: string;
}

async function geocode(address: string): Promise<{ lat: number; lng: number; timezone: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Sundial/1.0 (wedding timeline app)' } });
    const data = await res.json();
    if (!data[0]) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    // Get timezone from timezonefinder-like lookup via another API
    const tzRes = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`);
    const tzData = await tzRes.json();
    const timezone = tzData.timeZone || 'America/New_York';
    return { lat, lng, timezone };
  } catch {
    return null;
  }
}

async function getSunsetTime(lat: number, lng: number, date: string, timezone: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${date}&formatted=0`
    );
    const data = await res.json();
    if (data.status !== 'OK') return null;
    const utcSunset = new Date(data.results.sunset);
    return utcSunset.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });
  } catch {
    return null;
  }
}

async function getDrivingTime(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<string | null> {
  try {
    if (process.env.GOOGLE_MAPS_API_KEY) {
      const origin = `${fromLat},${fromLng}`;
      const destination = `${toLat},${toLng}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.[0]?.legs?.[0]?.duration?.text) {
        return `~${data.routes[0].legs[0].duration.text} drive`;
      }
    }
    // Fallback: OSRM
    const url = `http://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]?.duration) {
      const minutes = Math.round(data.routes[0].duration / 60);
      return `~${minutes} min drive`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function enrich(
  gettingReadyAddress: string,
  ceremonyAddress: string,
  receptionAddress: string,
  weddingDate: string,
  sameVenue?: boolean
): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {};

  // Geocode all three addresses
  const [grGeo, cerGeo, recGeo] = await Promise.all([
    geocode(gettingReadyAddress),
    geocode(ceremonyAddress),
    sameVenue ? Promise.resolve(null) : geocode(receptionAddress),
  ]);

  // Sunset from ceremony (or reception if no ceremony)
  const sunsetGeo = cerGeo || recGeo;
  if (sunsetGeo) {
    const sunset = await getSunsetTime(sunsetGeo.lat, sunsetGeo.lng, weddingDate, sunsetGeo.timezone);
    if (sunset) {
      result.sunsetTime = sunset;
      result.sunsetLocation = ceremonyAddress;
    }
  }

  // Driving times
  const travelPromises: Promise<void>[] = [];

  if (grGeo && cerGeo) {
    travelPromises.push(
      getDrivingTime(grGeo.lat, grGeo.lng, cerGeo.lat, cerGeo.lng).then(t => {
        if (t) result.travelGettingReadyToCeremony = t;
      })
    );
  }

  if (cerGeo && !sameVenue) {
    const destGeo = recGeo || cerGeo;
    travelPromises.push(
      getDrivingTime(cerGeo.lat, cerGeo.lng, destGeo.lat, destGeo.lng).then(t => {
        if (t) result.travelCeremonyToReception = t;
      })
    );
  }

  if (grGeo && recGeo && !sameVenue) {
    travelPromises.push(
      getDrivingTime(grGeo.lat, grGeo.lng, recGeo.lat, recGeo.lng).then(t => {
        if (t) result.travelGettingReadyToReception = t;
      })
    );
  }

  await Promise.allSettled(travelPromises);
  return result;
}
