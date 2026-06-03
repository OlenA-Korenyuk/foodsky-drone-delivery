import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";

const socket = io("http://localhost:5001");

const droneIcon = new L.Icon({
  iconUrl: "/my-drone.png",
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

const deliveryIcon = new L.Icon({
  iconUrl: "/geolocation.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

function MapEventsHandler({ onMapClick, isFlying }) {
  useMapEvents({
    click(e) {
      if (!isFlying && onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

function MapComponent({
  restaurants = [],
  deliveryLocation,
  onMapClick,
  activeMission,
  nfz = [],
  onMissionComplete,
}) {
  const defaultCenter = [50.4501, 30.5234];

  // Якщо activeMission вже містить dronePos (від оператора через TrackingPage)
  // — використовуємо його як початковий стан, а не waypoints[0]
  const [dronePos, setDronePos] = useState(activeMission?.dronePos || null);
  const [telemetry, setTelemetry] = useState(
    activeMission?.telemetry || {
      distanceLeft: 0,
      eta: 0,
      altitude: 0,
      speed: 0,
    }
  );

  // Скидаємо/ініціалізуємо позицію при зміні місії
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activeMission) {
        setDronePos(null);
        setTelemetry({ distanceLeft: 0, eta: 0, altitude: 0, speed: 0 });
        return;
      }

      // Якщо є зовнішній dronePos (оператор) — використовуємо його
      if (activeMission.dronePos) {
        setDronePos(activeMission.dronePos);
      } else if (activeMission.waypoints?.length > 0) {
        // Клієнт — ставимо початкову точку маршруту
        setDronePos(activeMission.waypoints[0]);
      }

      if (activeMission.telemetry) {
        setTelemetry(activeMission.telemetry);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeMission]);

  // Слухаємо телеметрію через сокет
  useEffect(() => {
    if (!activeMission) return;

    const handleTelemetry = (data) => {
      if (data.orderId !== activeMission.orderId) return;
      setDronePos(data.dronePos);
      if (data.telemetry) setTelemetry(data.telemetry);
    };

    const handleMissionComplete = (data) => {
      if (data.orderId !== activeMission.orderId) return;
      setTelemetry({ distanceLeft: 0, eta: 0, altitude: 0, speed: 0 });
      setDronePos(null);
      if (onMissionComplete) onMissionComplete(data.orderId);
    };

    socket.on("telemetry", handleTelemetry);
    socket.on("mission_complete", handleMissionComplete);

    return () => {
      socket.off("telemetry", handleTelemetry);
      socket.off("mission_complete", handleMissionComplete);
    };
  }, [activeMission, onMissionComplete]);

  const safeWaypoints = activeMission?.waypoints;

  return (
    <div className="w-full flex flex-col gap-4 font-mono">
      <div className="w-full h-112.5 rounded-sm overflow-hidden border border-border-color">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%", backgroundColor: "#0a0f0d" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CartoDB"
          />

          <MapEventsHandler
            onMapClick={onMapClick}
            isFlying={!!activeMission}
          />

          {/* Бази ресторанів */}
          {restaurants.map(
            (restaurant) =>
              restaurant.location?.lat && (
                <Marker
                  key={restaurant.id}
                  position={[restaurant.location.lat, restaurant.location.lng]}
                >
                  <Popup className="custom-popup">
                    <div className="text-[10px] uppercase text-accent-primary font-bold">
                      {restaurant.name}
                    </div>
                  </Popup>
                </Marker>
              )
          )}

          {/* Точка призначення */}
          {(deliveryLocation || (activeMission && safeWaypoints)) && (
            <Marker
              position={
                activeMission && safeWaypoints
                  ? safeWaypoints[safeWaypoints.length - 1]
                  : deliveryLocation
              }
              icon={deliveryIcon}
            >
              <Popup className="custom-popup">
                <div className="text-[10px] uppercase text-accent-secondary font-bold">
                  Точка призначення вантажу
                </div>
              </Popup>
            </Marker>
          )}

          {/* Маршрут польоту */}
          {activeMission && safeWaypoints && (
            <Polyline
              positions={safeWaypoints}
              pathOptions={{
                color: "#00c2ff",
                weight: 4,
                dashArray: "6, 12",
                opacity: 0.8,
              }}
            />
          )}

          {/* Зони заборони польотів (NFZ) */}
          {nfz.map((zone) => {
            if (!zone.is_active || !zone.polygon?.coordinates) return null;
            const leafletPositions = zone.polygon.coordinates[0].map(
              (coord) => [coord[1], coord[0]]
            );
            return (
              <Polygon
                key={zone.id}
                positions={leafletPositions}
                pathOptions={{
                  color: "#ff3b5c",
                  fillColor: "#ff3b5c",
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-[10px] uppercase text-danger font-bold">
                    🚨 NFZ: {zone.name}
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Дрон у польоті */}
          {activeMission && dronePos && (
            <Marker position={dronePos} icon={droneIcon}>
              <Popup className="custom-popup">
                <div className="text-[10px] uppercase text-warning font-bold animate-pulse">
                  Виконання доставки...
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Панель телеметрії */}
      {activeMission && dronePos && (
        <div className="bg-bg-card border border-border-color p-4 shadow-inner grid grid-cols-2 sm:grid-cols-4 gap-4 text-center animate-sys-fade">
          <div className="border-r border-border-color/40 last:border-0">
            <p className="text-[9px] uppercase text-text-muted tracking-widest font-bold">
              Дистанція
            </p>
            <p className="text-xl font-bold text-text-main mt-1 font-mono">
              {telemetry.distanceLeft || 0} м
            </p>
          </div>
          <div className="border-r border-border-color/40 last:border-0">
            <p className="text-[9px] uppercase text-text-muted tracking-widest font-bold">
              Час до мети (ETA)
            </p>
            <p className="text-xl font-bold text-warning mt-1 font-mono">
              {telemetry.eta || 0} сек
            </p>
          </div>
          <div className="border-r border-border-color/40 last:border-0">
            <p className="text-[9px] uppercase text-text-muted tracking-widest font-bold">
              Висота (ALT)
            </p>
            <p className="text-xl font-bold text-accent-secondary mt-1 font-mono">
              {telemetry.altitude || 0} м
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-text-muted tracking-widest font-bold">
              Швидкість (SPD)
            </p>
            <p className="text-xl font-bold text-accent-primary mt-1 font-mono">
              {telemetry.speed || 0} м/с
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapComponent;
