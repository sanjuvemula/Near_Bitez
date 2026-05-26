import { useCallback, useState } from "react";

const STORAGE_KEY = "nb_user_location";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (lat, lng, city) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, city, ts: Date.now() }));
  } catch {
    // Ignore storage failures in private browsing or locked-down browsers.
  }
};

/**
 * useUserLocation
 * Returns { location, status, error, requestLocation, clearLocation }
 * status: "idle" | "requesting" | "granted" | "denied" | "unavailable"
 */
export const useUserLocation = () => {
  const [location, setLocation] = useState(() => {
    const cached = readCache();
    return cached ? { lat: cached.lat, lng: cached.lng, city: cached.city } : null;
  }); // { lat, lng, city }
  const [status, setStatus] = useState(() => (location ? "granted" : "idle"));
  const [error, setError] = useState("");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setStatus("requesting");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));

        // Reverse geocode for city name (Nominatim — free, no API key)
        let city = "Your location";
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await resp.json();
          city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.suburb ||
            "Your location";
        } catch {
          // Keep the coordinates even if reverse geocoding fails.
        }

        writeCache(lat, lng, city);
        setLocation({ lat, lng, city });
        setStatus("granted");
        setError("");
      },
      (err) => {
        if (err.code === 1) {
          setStatus("denied");
          setError("Location access denied. Enable it in browser settings.");
        } else if (err.code === 2) {
          setStatus("unavailable");
          setError("Location unavailable. Please try again.");
        } else {
          setStatus("denied");
          setError("Could not get your location.");
        }
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }, []);

  const clearLocation = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY); }
    catch {
      // Ignore storage failures and still clear in-memory state.
    }
    setLocation(null);
    setStatus("idle");
    setError("");
  }, []);

  return { location, status, error, requestLocation, clearLocation };
};
