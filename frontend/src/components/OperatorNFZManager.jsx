import { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  useMapEvents,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = "http://localhost:5001";

const cornerIcon = new L.DivIcon({
  html: `<div style="width:10px;height:10px;background:#00e5a0;border:2px solid #0a0f0d;border-radius:50%;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  className: "",
});

function NFZMapEvents({ isDrawing, onPointAdd }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onPointAdd([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

function OperatorNFZManager({ token }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [newZoneName, setNewZoneName] = useState("");

  const [editZone, setEditZone] = useState(null);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
  });

  const fetchZones = async () => {
    try {
      const res = await axios.get(`${API}/api/nfz`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setZones(res.data || []);
    } catch (e) {
      console.warn("Помилка завантаження NFZ:", e.message);
    }
  };

  useEffect(() => {
    axios
      .get(`${API}/api/nfz`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setZones(res.data || []))
      .catch((e) => console.warn("Помилка завантаження NFZ:", e.message));
  }, [token]);

  const handleAddPoint = (point) => {
    setDrawPoints((prev) => [...prev, point]);
  };

  const handleRemoveLastPoint = () => {
    setDrawPoints((prev) => prev.slice(0, -1));
  };

  const handleSaveZone = async () => {
    if (!newZoneName || drawPoints.length < 3) return;
    setLoading(true);

    const coords = [...drawPoints, drawPoints[0]].map(([lat, lng]) => [
      lng,
      lat,
    ]);

    try {
      await axios.post(
        `${API}/api/nfz`,
        {
          name: newZoneName,
          polygon: { type: "Polygon", coordinates: [coords] },
          is_active: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsDrawing(false);
      setDrawPoints([]);
      setNewZoneName("");
      await fetchZones();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка створення NFZ");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDraw = () => {
    setIsDrawing(false);
    setDrawPoints([]);
    setNewZoneName("");
  };

  const handleToggleActive = async (zone) => {
    try {
      await axios.patch(
        `${API}/api/nfz/${zone.id}`,
        { is_active: !zone.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchZones();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка зміни статусу зони");
    }
  };

  const handleUpdateName = async () => {
    if (!editZone?.name) return;
    setLoading(true);
    try {
      await axios.patch(
        `${API}/api/nfz/${editZone.id}`,
        { name: editZone.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditZone(null);
      await fetchZones();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка оновлення назви");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/api/nfz/${deleteModal.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchZones();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка видалення зони");
    } finally {
      setDeleteModal({ open: false, id: null, name: "" });
    }
  };

  const toLeaflet = (zone) => {
    if (!zone.polygon?.coordinates?.[0]) return [];
    return zone.polygon.coordinates[0].map(([lng, lat]) => [lat, lng]);
  };

  return (
    <div className="bg-bg-card border border-border-color p-5 font-mono animate-sys-fade shadow-[0_0_20px_rgba(0,0,0,0.2)] mb-6">
      {/* Заголовок */}
      <div className="border-b border-border-color pb-4 flex flex-wrap justify-between items-center gap-4 mb-5">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-text-main uppercase tracking-widest">
            Управління зонами заборони польотів (NFZ)
          </h2>
          <span className="text-xs text-text-muted uppercase tracking-wider mt-1">
            PostGIS геофенсинг · {zones.filter((z) => z.is_active).length}{" "}
            активних / {zones.length} усього
          </span>
        </div>
        {!isDrawing && (
          <button
            onClick={() => setIsDrawing(true)}
            className="bg-danger hover:bg-danger/90 hover:shadow-[0_0_15px_rgba(255,59,92,0.3)] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all cursor-pointer border border-transparent"
          >
            🚫 Нова зона NFZ
          </button>
        )}
      </div>

      {/* Карта */}
      <div className="mb-5">
        {isDrawing && (
          <div className="bg-danger/10 border border-danger/30 px-4 py-2.5 mb-2 flex flex-wrap items-center gap-3 animate-sys-fade">
            <span className="text-xs uppercase tracking-widest text-danger font-bold animate-pulse">
              🖊 Режим малювання
            </span>
            <span className="text-xs text-text-muted uppercase">
              Клікайте на карті, щоб додавати кути зони · {drawPoints.length}{" "}
              точок
            </span>
            <span className="text-xs text-warning uppercase">
              Мінімум 3 точки для збереження
            </span>
          </div>
        )}

        <div className="w-full h-96 rounded-sm overflow-hidden border border-border-color">
          <MapContainer
            center={[50.4501, 30.5234]}
            zoom={13}
            style={{
              height: "100%",
              width: "100%",
              backgroundColor: "#0a0f0d",
              cursor: isDrawing ? "crosshair" : "grab",
            }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; CartoDB"
            />

            <NFZMapEvents isDrawing={isDrawing} onPointAdd={handleAddPoint} />

            {zones.map((zone) => {
              const positions = toLeaflet(zone);
              if (!positions.length) return null;
              return (
                <Polygon
                  key={zone.id}
                  positions={positions}
                  pathOptions={{
                    color: zone.is_active ? "#ff3b5c" : "#555",
                    fillColor: zone.is_active ? "#ff3b5c" : "#555",
                    fillOpacity: zone.is_active ? 0.15 : 0.07,
                    weight: zone.is_active ? 1.5 : 1,
                    dashArray: zone.is_active ? undefined : "4,6",
                  }}
                >
                  <Popup className="custom-popup">
                    <div
                      className={`text-xs uppercase font-bold ${
                        zone.is_active ? "text-danger" : "text-text-muted"
                      }`}
                    >
                      {zone.is_active ? "🚨" : "○"} {zone.name}
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {drawPoints.map((pt, i) => (
              <Marker key={i} position={pt} icon={cornerIcon}>
                <Popup className="custom-popup">
                  <div className="text-xs text-accent-primary font-bold uppercase">
                    Точка {i + 1}: {pt[0].toFixed(4)}, {pt[1].toFixed(4)}
                  </div>
                </Popup>
              </Marker>
            ))}

            {drawPoints.length >= 2 && (
              <Polygon
                positions={drawPoints}
                pathOptions={{
                  color: "#00e5a0",
                  fillColor: "#00e5a0",
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: "6,6",
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Панель завершення малювання */}
        {isDrawing && (
          <div className="border border-accent-primary/30 bg-bg-main p-3 mt-2 animate-sys-fade">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-48">
                <label className="text-xs uppercase tracking-widest text-text-muted block mb-1">
                  Назва нової зони
                </label>
                <input
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Напр.: Зона аеропорту Бориспіль"
                  className="w-full bg-bg-card border border-border-color text-text-main text-sm px-3 py-2 font-mono focus:outline-none focus:border-accent-primary/60 placeholder:text-text-muted/40"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRemoveLastPoint}
                  disabled={drawPoints.length === 0}
                  className="border border-warning/40 text-warning hover:bg-warning/10 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ↩ Скасувати точку
                </button>
                <button
                  onClick={handleCancelDraw}
                  className="border border-border-color text-text-muted hover:text-text-main px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleSaveZone}
                  disabled={loading || drawPoints.length < 3 || !newZoneName}
                  className="bg-danger text-white hover:bg-danger/90 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(255,59,92,0.2)]"
                >
                  {loading
                    ? "⏳ Зберігаємо..."
                    : `🚫 Зберегти зону (${drawPoints.length} точок)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Список зон */}
      <div className="space-y-2">
        {zones.length === 0 && (
          <p className="text-xs text-text-muted italic py-2">
            Зони заборони польотів відсутні
          </p>
        )}
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="border border-border-color bg-bg-main px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:border-border-color/60 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`text-sm shrink-0 ${
                  zone.is_active
                    ? "text-danger animate-pulse"
                    : "text-text-muted"
                }`}
              >
                {zone.is_active ? "🚨" : "○"}
              </span>
              {editZone?.id === zone.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editZone.name}
                    onChange={(e) =>
                      setEditZone((p) => ({ ...p, name: e.target.value }))
                    }
                    className="bg-bg-card border border-accent-secondary/40 text-text-main text-sm px-2 py-1.5 font-mono focus:outline-none w-64"
                  />
                  <button
                    onClick={handleUpdateName}
                    disabled={loading}
                    className="text-xs uppercase bg-accent-secondary text-bg-main px-2.5 py-1.5 cursor-pointer hover:bg-accent-secondary/90 transition-all disabled:opacity-50"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditZone(null)}
                    className="text-xs uppercase text-text-muted border border-border-color px-2.5 py-1.5 cursor-pointer hover:text-text-main transition-all"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="min-w-0">
                  <span className="text-sm font-bold text-text-main block truncate">
                    {zone.name}
                  </span>
                  <span className="text-xs text-text-muted">
                    {zone.polygon?.coordinates?.[0]?.length
                      ? `${
                          zone.polygon.coordinates[0].length - 1
                        } кутів полігона`
                      : "Немає геометрії"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs uppercase px-2.5 py-1 font-bold border ${
                  zone.is_active
                    ? "bg-danger/10 text-danger border-danger/20"
                    : "bg-bg-card text-text-muted border-border-color"
                }`}
              >
                {zone.is_active ? "Активна" : "Вимкнена"}
              </span>
              <button
                onClick={() => handleToggleActive(zone)}
                title={zone.is_active ? "Деактивувати зону" : "Активувати зону"}
                className="text-sm border border-border-color px-2.5 py-1.5 text-text-muted hover:text-warning hover:border-warning/40 transition-all cursor-pointer"
              >
                {zone.is_active ? "⏸" : "▶"}
              </button>
              <button
                onClick={() =>
                  setEditZone(
                    editZone?.id === zone.id
                      ? null
                      : { id: zone.id, name: zone.name }
                  )
                }
                className="text-sm border border-border-color px-2.5 py-1.5 text-text-muted hover:text-accent-secondary hover:border-accent-secondary/40 transition-all cursor-pointer"
              >
                ✏️
              </button>
              <button
                onClick={() =>
                  setDeleteModal({ open: true, id: zone.id, name: zone.name })
                }
                className="text-sm border border-border-color px-2.5 py-1.5 text-text-muted hover:text-danger hover:border-danger/40 transition-all cursor-pointer"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Модальне підтвердження видалення */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-main/80 backdrop-blur-sm animate-sys-fade">
          <div className="bg-bg-card border-2 border-danger p-8 max-w-sm w-full shadow-[0_0_30px_rgba(255,59,92,0.2)] font-mono text-center">
            <div className="text-3xl mb-4">🚫</div>
            <h3 className="text-base font-bold text-text-main mb-3 uppercase tracking-widest">
              Видалення NFZ-зони
            </h3>
            <p className="text-sm text-text-muted mb-3 uppercase tracking-wide leading-relaxed">
              Безповоротно видалити зону заборони польотів?
            </p>
            <p className="text-sm text-danger font-bold mb-6 truncate">
              "{deleteModal.name}"
            </p>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setDeleteModal({ open: false, id: null, name: "" })
                }
                className="flex-1 border border-border-color text-text-muted hover:text-text-main py-3 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-danger text-white hover:bg-danger/90 py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,59,92,0.4)] cursor-pointer"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorNFZManager;
