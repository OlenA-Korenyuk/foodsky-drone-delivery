import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import MapComponent from "../components/MapComponent";
import WeatherMonitor from "../components/WeatherMonitor";
import DeliveryModal from "../components/DeliveryModal";

const socket = io("http://localhost:5001");

function TrackingPage({
  activeMission,
  user,
  restaurants,
  nfzZones,
  deliveryCoords,
  isArrivalModalOpen,
  setIsArrivalModalOpen,
  onConfirmDelivery,
  weatherData,
  onMissionComplete,
  token,
}) {
  const [operatorMissions, setOperatorMissions] = useState([]);
  const [recallingIds, setRecallingIds] = useState(new Set());
  const missionsRef = useRef({});

  useEffect(() => {
    if (user?.role !== "operator") return;

    const loadActiveMissions = async () => {
      if (!token) return;
      try {
        const res = await axios.get("http://localhost:5001/api/orders/active", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const fresh = {};
        for (const order of res.data || []) {
          fresh[order.id] = missionsRef.current[order.id] || {
            orderId: order.id,
            status: order.status,
            telemetry: null,
          };
        }
        missionsRef.current = fresh;
        setOperatorMissions(Object.values(fresh));
      } catch (e) {
        console.warn("Помилка завантаження активних місій:", e.message);
      }
    };

    loadActiveMissions();

    const handleTelemetry = ({ orderId, telemetry }) => {
      // Якщо місії немає в активних — не додаємо (вона або recalled або вже завершена)
      if (!missionsRef.current[orderId]) return;
      missionsRef.current[orderId] = {
        ...missionsRef.current[orderId],
        telemetry,
      };
      setOperatorMissions(Object.values(missionsRef.current));
    };

    const handleWaitingDelivery = ({ orderId }) => {
      if (!missionsRef.current[orderId]) {
        missionsRef.current[orderId] = {
          orderId,
          status: "delivering",
          telemetry: null,
        };
      } else {
        missionsRef.current[orderId] = {
          ...missionsRef.current[orderId],
          status: "delivering",
        };
      }
      setOperatorMissions(Object.values(missionsRef.current));
    };

    // Місія recalled — одразу прибираємо з екрану
    const handleMissionRecalled = ({ orderId }) => {
      delete missionsRef.current[orderId];
      setOperatorMissions(Object.values(missionsRef.current));
    };

    // Місія завершена нормально — прибираємо з екрану
    const handleMissionComplete = ({ orderId }) => {
      delete missionsRef.current[orderId];
      setOperatorMissions(Object.values(missionsRef.current));
    };

    socket.on("telemetry", handleTelemetry);
    socket.on("drone_waiting_delivery", handleWaitingDelivery);
    socket.on("drone_waiting_delivery", loadActiveMissions);
    socket.on("mission_recalled", handleMissionRecalled);
    socket.on("mission_complete", handleMissionComplete);

    return () => {
      socket.off("telemetry", handleTelemetry);
      socket.off("drone_waiting_delivery", handleWaitingDelivery);
      socket.off("drone_waiting_delivery", loadActiveMissions);
      socket.off("mission_recalled", handleMissionRecalled);
      socket.off("mission_complete", handleMissionComplete);
    };
  }, [user?.role, token]);

  const handleRecallDrone = async (orderId) => {
    if (recallingIds.has(orderId)) return;
    setRecallingIds((prev) => new Set(prev).add(orderId));
    try {
      await axios.post(
        `http://localhost:5001/api/orders/${orderId}/recall`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Сервер emit "mission_recalled" — handleMissionRecalled видалить її з екрану
    } catch (e) {
      alert(e.response?.data?.error || "Помилка відкликання дрона");
      setRecallingIds((prev) => {
        const n = new Set(prev);
        n.delete(orderId);
        return n;
      });
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case "flying":
      case "en_route":
        return {
          text: "🚁 В польоті",
          color:
            "text-accent-secondary border-accent-secondary/20 bg-accent-secondary/10 animate-pulse",
        };
      case "delivering":
        return {
          text: "⏳ Очікує підтвердження",
          color: "text-warning border-warning/20 bg-warning/10",
        };
      default:
        return {
          text: "● Активна",
          color:
            "text-accent-secondary border-accent-secondary/20 bg-accent-secondary/10",
        };
    }
  };

  if (user?.role === "operator") {
    return (
      <div className="space-y-4 animate-sys-fade flex flex-col h-full">
        <WeatherMonitor weatherData={weatherData} />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-main uppercase tracking-widest font-mono">
              Карта заборонених зон для польотів і ресторанів
            </h2>
            <p className="text-xs text-text-muted uppercase tracking-wide mt-0.5 font-mono">
              {operatorMissions.length > 0
                ? `${operatorMissions.length} місій у повітрі`
                : "Повітряний простір вільний"}
            </p>
          </div>
          {operatorMissions.length > 0 && (
            <span className="text-xs text-accent-secondary border border-accent-secondary/30 px-3 py-1.5 bg-accent-secondary/10 font-mono uppercase tracking-widest animate-pulse">
              ● Live
            </span>
          )}
        </div>

        {operatorMissions.length > 0 && (
          <div className="space-y-2">
            {operatorMissions.map((mission) => {
              const label = statusLabel(mission.status);
              const isRecalling = recallingIds.has(mission.orderId);
              const canRecall = ["flying", "en_route", "delivering"].includes(
                mission.status
              );

              return (
                <div
                  key={mission.orderId}
                  className="bg-bg-card border border-border-color px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs text-text-muted font-mono uppercase tracking-wide shrink-0">
                      Замовлення #{String(mission.orderId).substring(0, 8)}
                    </span>
                    <span
                      className={`text-xs uppercase px-2.5 py-1 font-bold border shrink-0 ${label.color}`}
                    >
                      {label.text}
                    </span>
                    {mission.telemetry && (
                      <span className="text-xs text-text-muted font-mono hidden sm:block">
                        {mission.telemetry.distanceLeft}м ·{" "}
                        {mission.telemetry.eta}с · {mission.telemetry.altitude}м
                        ALT
                      </span>
                    )}
                  </div>
                  {canRecall && (
                    <button
                      onClick={() => handleRecallDrone(mission.orderId)}
                      disabled={isRecalling}
                      className="shrink-0 border border-danger/40 text-danger hover:bg-danger/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRecalling ? "⏳ Скасовуємо..." : "✕ Скасувати місію"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 w-full">
          <MapComponent
            activeMission={null}
            restaurants={restaurants}
            nfz={nfzZones}
            deliveryLocation={null}
            onMissionComplete={null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-sys-fade flex flex-col h-full">
      <WeatherMonitor weatherData={weatherData} />
      <div className="flex-1 w-full">
        <MapComponent
          activeMission={activeMission}
          restaurants={restaurants}
          nfz={nfzZones}
          deliveryLocation={deliveryCoords}
          onMissionComplete={onMissionComplete}
        />
      </div>
      {isArrivalModalOpen && user?.role === "client" && (
        <DeliveryModal
          mission={activeMission}
          onConfirm={() => {
            onConfirmDelivery();
            setIsArrivalModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default TrackingPage;
