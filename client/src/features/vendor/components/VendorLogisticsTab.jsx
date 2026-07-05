import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { VendorButton, EmptyState } from "./VendorUi.jsx";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom orange marker
const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const DEFAULT_LOCATION = { lat: 30.9010, lng: 75.8573 };

const asMapLocation = (location) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  return {
    lat: Number.isFinite(lat) ? lat : DEFAULT_LOCATION.lat,
    lng: Number.isFinite(lng) ? lng : DEFAULT_LOCATION.lng,
  };
};

// Map click handler
const LocationPicker = ({ position, setPosition }) => {
  useMapEvents({ click(e) { setPosition({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return position ? <Marker position={[position.lat, position.lng]} icon={orangeIcon} /> : null;
};

// Fly to location helper
const MapFlyTo = ({ position }) => {
  const map = useMap();
  useEffect(() => { if (position) map.flyTo([position.lat, position.lng], 14, { duration: 1.2 }); }, [position, map]);
  return null;
};

// ── Small stat card ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent }) => (
  <div className={`rounded-2xl border p-4 ${accent}`}>
    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
    <p className="text-2xl font-black">{value}</p>
    {sub && <p className="text-xs font-semibold opacity-50 mt-0.5">{sub}</p>}
  </div>
);

// ── Input (light teal theme) ──────────────────────────────────────────────────
const TealInput = ({ label, hint, prefix, ...props }) => (
  <label className="block">
    <div className="flex justify-between mb-1.5">
      <span className="text-[11px] font-black uppercase tracking-widest text-teal-700">{label}</span>
      {hint && <span className="text-[10px] text-teal-400">{hint}</span>}
    </div>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-teal-500">{prefix}</span>}
      <input
        className={`w-full rounded-xl border border-teal-200 bg-white ${prefix ? "pl-8" : "pl-4"} pr-4 py-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-teal-400 focus:ring-3 focus:ring-teal-100 placeholder:text-zinc-300`}
        {...props}
      />
    </div>
  </label>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const VendorLogisticsTab = ({ restaurant, logistics, saveLogistics, savingLogistics }) => {
  const [form, setForm] = useState({
    location: DEFAULT_LOCATION,
    deliveryRadiusKm: 5,
    baseDeliveryFee: 40,
    freeDeliveryAbove: 500,
    isSelfDelivery: true,
    // Extra distance tiers
    extraTiers: [],
  });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showTierForm, setShowTierForm] = useState(false);
  const [newTier, setNewTier] = useState({ fromKm: "", toKm: "", extraCharge: "" });

  useEffect(() => {
    if (logistics?.location) {
      setForm({
        location: asMapLocation(logistics.location),
        deliveryRadiusKm: logistics.deliveryRadiusKm || 5,
        baseDeliveryFee: logistics.baseDeliveryFee || 40,
        freeDeliveryAbove: logistics.freeDeliveryAbove || 500,
        isSelfDelivery: logistics.isSelfDelivery ?? true,
        extraTiers: logistics.extraTiers || [],
      });
    }
  }, [logistics]);

  const getMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError("Geolocation not supported"); return; }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }));
        setLocating(false);
      },
      () => { setLocationError("Location access denied. Please allow location."); setLocating(false); }
    );
  }, []);

  const addTier = () => {
    const from = parseFloat(newTier.fromKm);
    const to = parseFloat(newTier.toKm);
    const charge = parseFloat(newTier.extraCharge);
    if (!from || !to || !charge || from >= to) return alert("Enter valid tier values (from < to)");
    setForm(f => ({ ...f, extraTiers: [...(f.extraTiers || []), { fromKm: from, toKm: to, extraCharge: charge }].sort((a, b) => a.fromKm - b.fromKm) }));
    setNewTier({ fromKm: "", toKm: "", extraCharge: "" });
    setShowTierForm(false);
  };

  const removeTier = (idx) => setForm(f => ({ ...f, extraTiers: f.extraTiers.filter((_, i) => i !== idx) }));

  const handleSave = () => saveLogistics({ ...form, location: asMapLocation(form.location) });

  if (!restaurant) return <EmptyState title="Store Not Ready" description="Complete your store profile before setting delivery zones." tone="info" />;

  const mapLocation = asMapLocation(form.location);
  const totalRadius = form.deliveryRadiusKm;

  return (
    <div
      className="min-h-screen rounded-3xl p-6 md:p-8"
      style={{ background: "linear-gradient(135deg, #f0fdfa 0%, #e6fffa 40%, #ccfbf1 100%)" }}
    >
      {/* ── Header ── */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🛵</span>
            <h1 className="text-3xl font-black text-teal-900 tracking-tight">Delivery Zones</h1>
          </div>
          <p className="text-sm font-semibold text-teal-600">
            Set your coverage area · Define delivery fees · Distance-based pricing
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Radius" value={`${totalRadius} km`} accent="border-teal-200 bg-teal-50 text-teal-800" />
          <StatCard label="Base Fee" value={`₹${form.baseDeliveryFee}`} sub={`Free >${form.freeDeliveryAbove}`} accent="border-emerald-200 bg-emerald-50 text-emerald-800" />
          <StatCard label="Tiers" value={form.extraTiers?.length || 0} sub="extra zones" accent="border-cyan-200 bg-cyan-50 text-cyan-800" />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px,1fr]">

        {/* ── LEFT PANEL ── */}
        <div className="space-y-5">

          {/* Location */}
          <div className="rounded-2xl border border-teal-200 bg-white shadow-[0_8px_32px_-8px_rgba(20,184,166,0.2)] overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4">
              <h2 className="text-lg font-black text-white">📍 Restaurant Location</h2>
              <p className="text-sm text-teal-100 mt-0.5">Pin your exact location on the map</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TealInput label="Latitude" type="number" step="0.0001" value={form.location.lat} onChange={e => setForm(f => ({ ...f, location: { ...f.location, lat: parseFloat(e.target.value) } }))} />
                <TealInput label="Longitude" type="number" step="0.0001" value={form.location.lng} onChange={e => setForm(f => ({ ...f, location: { ...f.location, lng: parseFloat(e.target.value) } }))} />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                onClick={getMyLocation}
                disabled={locating}
                className="w-full rounded-xl border-2 border-dashed border-teal-300 bg-teal-50 py-3 text-sm font-black text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-50"
              >
                {locating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                    Getting location...
                  </span>
                ) : "📡 Use My Current Location"}
              </motion.button>

              {locationError && <p className="text-xs font-semibold text-red-500">{locationError}</p>}
              <p className="text-[10px] font-semibold text-teal-400">Or click anywhere on the map to pin your location</p>
            </div>
          </div>

          {/* Coverage & Fees */}
          <div className="rounded-2xl border border-teal-200 bg-white shadow-[0_8px_32px_-8px_rgba(20,184,166,0.15)] p-5 space-y-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-teal-700">Coverage & Fees</h2>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-teal-700">Coverage Radius</span>
                <span className="text-lg font-black text-teal-600">{form.deliveryRadiusKm} km</span>
              </div>
              <input
                type="range" min="1" max="25" step="0.5"
                value={form.deliveryRadiusKm}
                onChange={e => setForm(f => ({ ...f, deliveryRadiusKm: parseFloat(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-teal-500"
                style={{ background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${(form.deliveryRadiusKm / 25) * 100}%, #d1fae5 ${(form.deliveryRadiusKm / 25) * 100}%, #d1fae5 100%)` }}
              />
              <div className="flex justify-between text-[10px] font-bold text-teal-300 mt-1">
                <span>1 km</span><span>25 km</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TealInput label="Base Fee (₹)" prefix="₹" type="number" placeholder="40" value={form.baseDeliveryFee} onChange={e => setForm(f => ({ ...f, baseDeliveryFee: e.target.value }))} />
              <TealInput label="Free Above (₹)" prefix="₹" type="number" placeholder="500" value={form.freeDeliveryAbove} onChange={e => setForm(f => ({ ...f, freeDeliveryAbove: e.target.value }))} />
            </div>

            {/* Self delivery toggle */}
            <label className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm font-black text-teal-800">Self Delivery</p>
                <p className="text-xs font-semibold text-teal-500">Your own delivery team</p>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, isSelfDelivery: !f.isSelfDelivery }))}
                className={`relative h-7 w-12 rounded-full border transition-colors duration-200 cursor-pointer ${form.isSelfDelivery ? "bg-teal-500 border-teal-400" : "bg-zinc-200 border-zinc-300"}`}
              >
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${form.isSelfDelivery ? "right-1" : "left-1"}`}
                />
              </div>
            </label>
          </div>

          {/* Distance Tiers */}
          <div className="rounded-2xl border border-teal-200 bg-white shadow-[0_8px_32px_-8px_rgba(20,184,166,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-teal-100">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-teal-700">Extra Distance Charges</h2>
                <p className="text-xs font-semibold text-teal-400 mt-0.5">Charge more for farther deliveries</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowTierForm(v => !v)}
                className="rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-black text-white hover:bg-teal-600 transition-colors"
              >
                {showTierForm ? "Cancel" : "+ Add Tier"}
              </motion.button>
            </div>

            <div className="p-4 space-y-2">
              <AnimatePresence>
                {showTierForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-dashed border-teal-300 bg-teal-50 p-4 space-y-3 mb-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-500">New Tier</p>
                    <div className="grid grid-cols-3 gap-2">
                      <TealInput label="From (km)" type="number" placeholder="5" value={newTier.fromKm} onChange={e => setNewTier(t => ({ ...t, fromKm: e.target.value }))} />
                      <TealInput label="To (km)" type="number" placeholder="10" value={newTier.toKm} onChange={e => setNewTier(t => ({ ...t, toKm: e.target.value }))} />
                      <TealInput label="Extra (₹)" type="number" placeholder="30" value={newTier.extraCharge} onChange={e => setNewTier(t => ({ ...t, extraCharge: e.target.value }))} />
                    </div>
                    <button onClick={addTier} className="w-full rounded-xl bg-teal-500 py-2 text-xs font-black text-white hover:bg-teal-600 transition-colors">
                      Add This Tier ✓
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {(!form.extraTiers || form.extraTiers.length === 0) ? (
                <p className="text-center text-xs font-semibold text-teal-300 py-4">
                  No extra tiers — flat fee for all distances
                </p>
              ) : (
                form.extraTiers.map((tier, idx) => (
                  <motion.div
                    key={idx} layout
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📍</span>
                      <div>
                        <p className="text-sm font-black text-teal-800">{tier.fromKm}–{tier.toKm} km</p>
                        <p className="text-xs font-semibold text-teal-500">+₹{tier.extraCharge} extra</p>
                      </div>
                    </div>
                    <button onClick={() => removeTier(idx)} className="text-teal-300 hover:text-red-400 transition-colors font-black text-lg leading-none">×</button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Save button */}
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={savingLogistics}
            className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 py-4 text-sm font-black text-white shadow-[0_4px_20px_-4px_rgba(20,184,166,0.5)] hover:shadow-[0_6px_24px_-4px_rgba(20,184,166,0.6)] transition-all disabled:opacity-50"
          >
            {savingLogistics ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving...
              </span>
            ) : "💾 Save Delivery Settings"}
          </motion.button>

          {/* Info box */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-xs font-black text-teal-700 mb-2">ℹ️ How it works</p>
            <ul className="space-y-1">
              {[
                `Customers beyond ${form.deliveryRadiusKm} km won't see your restaurant`,
                "Customers share location automatically when they open the app",
                "Distance tiers add extra charges based on delivery distance",
                `Orders above ₹${form.freeDeliveryAbove} get free delivery`,
              ].map(tip => (
                <li key={tip} className="text-[11px] font-semibold text-teal-600 flex items-start gap-1.5">
                  <span className="text-teal-400 mt-0.5">✓</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── RIGHT: MAP ── */}
        <div className="rounded-2xl overflow-hidden border border-teal-200 shadow-[0_12px_40px_-8px_rgba(20,184,166,0.2)] relative" style={{ minHeight: "600px" }}>
          {/* Map overlay label */}
          <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-teal-200 shadow pointer-events-none">
            <p className="text-xs font-black text-teal-700 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse inline-block" />
              Live Zone Mapping
            </p>
          </div>

          {/* Coordinate display */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-teal-200 shadow pointer-events-none">
            <p className="text-[10px] font-black text-teal-600">
              {mapLocation.lat.toFixed(4)}, {mapLocation.lng.toFixed(4)}
            </p>
          </div>

          <MapContainer
            center={[mapLocation.lat, mapLocation.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%", minHeight: "600px" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            <MapFlyTo position={mapLocation} />
            <LocationPicker position={mapLocation} setPosition={(pos) => setForm(f => ({ ...f, location: pos }))} />

            {/* Main delivery zone */}
            <Circle
              center={[mapLocation.lat, mapLocation.lng]}
              radius={form.deliveryRadiusKm * 1000}
              pathOptions={{ color: "#14b8a6", fillColor: "#14b8a6", fillOpacity: 0.12, weight: 2.5, dashArray: "6 4" }}
            />

            {/* Extra tier zones */}
            {(form.extraTiers || []).map((tier, idx) => (
              <Circle
                key={idx}
                center={[mapLocation.lat, mapLocation.lng]}
                radius={tier.toKm * 1000}
                pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.06, weight: 1.5, dashArray: "3 6" }}
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default VendorLogisticsTab;
