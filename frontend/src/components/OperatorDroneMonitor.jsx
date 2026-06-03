import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5001";

function OperatorDroneMonitor({ token }) {
  const [drones, setDrones] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const isMounted = useRef(true);

  // Форма нового дрона
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDrone, setNewDrone] = useState({
    model_name: "",
    restaurant_id: "",
  });

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: null,
    droneId: null,
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchDrones = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/drones`, { headers });
      if (isMounted.current) setDrones(res.data || []);
    } catch (error) {
      console.warn("Помилка отримання авіапарку:", error.message);
    }
  }, [token]);

  const fetchRestaurants = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/restaurants`, { headers });
      if (isMounted.current) setRestaurants(res.data || []);
    } catch (error) {
      console.warn("Помилка отримання ресторанів:", error.message);
    }
  }, [token]);

  useEffect(() => {
    isMounted.current = true;
    const load = async () => {
      if (isMounted.current) {
        await fetchRestaurants();
        await fetchDrones();
      }
    };
    load();
    const interval = setInterval(() => {
      if (isMounted.current) fetchDrones();
    }, 4000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchDrones, fetchRestaurants]);

  const setProcessing = (id, val) =>
    setProcessingIds((prev) => {
      const n = new Set(prev);
      val ? n.add(id) : n.delete(id);
      return n;
    });

  // Зміна статусу: idle <-> maintenance
  const handleStatusToggle = async (droneId, currentStatus) => {
    if (processingIds.has(droneId)) return;
    const nextStatus = currentStatus === "idle" ? "maintenance" : "idle";
    setProcessing(droneId, true);
    try {
      await axios.patch(
        `${API}/api/drones/${droneId}`,
        { status: nextStatus },
        { headers }
      );
      await fetchDrones();
    } catch (error) {
      alert(error.response?.data?.error || "Помилка зміни статусу БПЛА");
      await fetchDrones();
    } finally {
      setProcessing(droneId, false);
    }
  };

  // Призначення ресторану-бази
  const handleAssignBase = async (droneId, restaurantId) => {
    setProcessing(droneId, true);
    try {
      await axios.patch(
        `${API}/api/drones/${droneId}`,
        { restaurant_id: restaurantId || null },
        { headers }
      );
      await fetchDrones();
    } catch (error) {
      alert(error.response?.data?.error || "Помилка призначення бази");
      await fetchDrones();
    } finally {
      setProcessing(droneId, false);
    }
  };

  // Додавання нового БПЛА — тільки через сервер
  const handleAddDrone = async () => {
    if (loadingAdd) return;
    setLoadingAdd(true);
    const boardNumber = String(Math.floor(Math.random() * 100)).padStart(
      2,
      "0"
    );
    try {
      await axios.post(
        `${API}/api/drones`,
        {
          model_name:
            newDrone.model_name.trim() ||
            `DJI Matrice 300 RTK (Борт №${boardNumber})`,
          status: "idle",
          battery_level: 100,
          restaurant_id: newDrone.restaurant_id || null,
        },
        { headers }
      );
      setNewDrone({ model_name: "", restaurant_id: "" });
      setShowAddForm(false);
      await fetchDrones();
    } catch (error) {
      alert(error.response?.data?.error || "Помилка додавання БПЛА");
    } finally {
      setLoadingAdd(false);
    }
  };

  const openModal = (type, droneId) =>
    setModalConfig({ isOpen: true, type, droneId });
  const closeModal = () =>
    setModalConfig({ isOpen: false, type: null, droneId: null });

  const confirmAction = async () => {
    const { type, droneId } = modalConfig;
    closeModal();
    if (processingIds.has(droneId)) return;
    setProcessing(droneId, true);
    try {
      if (type === "retire") {
        await axios.patch(
          `${API}/api/drones/${droneId}`,
          { status: "retired" },
          { headers }
        );
      } else if (type === "delete") {
        await axios.delete(`${API}/api/drones/${droneId}`, { headers });
      }
      await fetchDrones();
    } catch (error) {
      const action = type === "retire" ? "списання" : "видалення";
      alert(error.response?.data?.error || `Помилка ${action} БПЛА`);
      await fetchDrones();
    } finally {
      setProcessing(droneId, false);
    }
  };

  // Групуємо дрони по ресторанах для відображення
  const grouped = {};
  const unassigned = [];
  for (const d of drones) {
    if (d.restaurant_id && d.base) {
      if (!grouped[d.restaurant_id])
        grouped[d.restaurant_id] = { name: d.base.name, drones: [] };
      grouped[d.restaurant_id].drones.push(d);
    } else {
      unassigned.push(d);
    }
  }

  const renderDroneCard = (d) => {
    const usableBattery = Math.max(0, d.battery_level - 20);
    const maxDistanceKm = ((usableBattery / 80) * 15000) / 1000;
    const isIdle = d.status === "idle";
    const isFlying = d.status === "flying";
    const isRetired = d.status === "retired";
    const isProcessing = processingIds.has(d.id);

    let statusText = "ремонт";
    if (isIdle) statusText = "готовий";
    if (isFlying) statusText = "в місії";
    if (isRetired) statusText = "списаний";

    return (
      <div
        key={d.id}
        className="bg-bg-main border border-border-color p-5 flex flex-col justify-between min-h-80 hover:border-border-color/80 transition-all duration-200"
      >
        <div>
          <div className="flex justify-between items-start mb-3 gap-2">
            <div className="flex flex-col max-w-48">
              <span className="text-sm font-bold text-text-main block truncate">
                {d.model_name || "DJI Matrice 300 RTK"}
              </span>
              <span className="text-xs text-text-muted font-mono mt-1">
                Борт №{String(d.id).substring(0, 8)}
              </span>
            </div>
            <span
              className={`text-xs uppercase px-2.5 py-1 font-bold shrink-0 border ${
                isIdle
                  ? "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                  : isFlying
                  ? "bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20 animate-pulse"
                  : isRetired
                  ? "bg-bg-card text-text-muted border-border-color"
                  : "bg-danger/10 text-danger border-danger/20"
              }`}
            >
              ● {statusText}
            </span>
          </div>

          {/* Призначення бази */}
          <div className="mt-2 mb-4">
            <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
              База / Ресторан
            </label>
            <select
              value={d.restaurant_id || ""}
              onChange={(e) => handleAssignBase(d.id, e.target.value)}
              disabled={isFlying || isProcessing}
              className="w-full bg-bg-card border border-border-color text-text-main text-xs px-3 py-2 font-mono focus:border-accent-secondary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">— Без бази —</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5 text-xs uppercase tracking-wide text-text-muted">
            <div className="flex justify-between">
              <span>Заряд акумулятора:</span>
              <span
                className={`font-bold ${
                  d.battery_level <= 30
                    ? "text-danger animate-pulse"
                    : "text-text-main"
                }`}
              >
                {d.battery_level}%
              </span>
            </div>
            <div className="w-full bg-bg-card h-2 border border-border-color">
              <div
                className={`h-full transition-all duration-500 ${
                  d.battery_level <= 30
                    ? "bg-danger"
                    : d.battery_level <= 50
                    ? "bg-warning"
                    : "bg-accent-primary"
                }`}
                style={{ width: `${d.battery_level}%` }}
              />
            </div>
            <div className="pt-2 mt-2 border-t border-border-color/30 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Резерв безпеки:</span>
                <span className="text-danger font-bold">20% (Заблоковано)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Макс. дальність місії:</span>
                <span className="text-accent-secondary font-bold">
                  {isRetired ? "0.00" : maxDistanceKm.toFixed(2)} км
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border-color/30">
          <div className="flex gap-2">
            {!isRetired && (
              <button
                onClick={() => handleStatusToggle(d.id, d.status)}
                disabled={isFlying || isProcessing}
                className={`flex-1 text-center text-xs font-bold uppercase tracking-widest py-2.5 transition-all font-mono border ${
                  isFlying || isProcessing
                    ? "bg-bg-card/40 text-text-muted border-border-color cursor-not-allowed opacity-60"
                    : isIdle
                    ? "bg-transparent text-danger border-danger/40 hover:bg-danger/10 cursor-pointer"
                    : "bg-accent-primary text-bg-main border-transparent hover:bg-accent-primary/90 cursor-pointer shadow-[0_0_10px_rgba(0,229,160,0.2)]"
                }`}
              >
                {isProcessing
                  ? "⏳ Зачекайте..."
                  : isFlying
                  ? "🔒 В небі"
                  : isIdle
                  ? "🛠️ В ремонт"
                  : "⚙️ В стрій"}
              </button>
            )}
            {!isFlying && !isRetired && (
              <button
                onClick={() => openModal("retire", d.id)}
                disabled={isProcessing}
                className="border border-border-color text-text-muted hover:text-warning hover:border-warning/40 px-3 py-2.5 text-xs transition-all cursor-pointer font-mono disabled:opacity-50"
              >
                📉 Списати
              </button>
            )}
            {isRetired && (
              <>
                <button
                  onClick={() => handleStatusToggle(d.id, "maintenance")}
                  disabled={isProcessing}
                  className="border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10 px-3 py-2.5 text-xs font-bold uppercase transition-all cursor-pointer font-mono disabled:opacity-50"
                  title="Відновити"
                >
                  🔄
                </button>
                <button
                  onClick={() => openModal("delete", d.id)}
                  disabled={isProcessing}
                  className="flex-1 border border-danger/40 text-danger hover:bg-danger/10 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer font-mono disabled:opacity-50"
                >
                  {isProcessing ? "⏳..." : "🗑️ Видалити"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-bg-card border border-border-color p-6 font-mono animate-sys-fade shadow-[0_0_20px_rgba(0,0,0,0.2)] mb-6 relative">
      {/* Заголовок */}
      <div className="border-b border-border-color pb-4 flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-text-main uppercase tracking-widest">
            Моніторинг авіапарку БПЛА
          </h2>
          <span className="text-xs text-text-muted uppercase tracking-wider mt-1">
            Дрони прив'язані до ресторанів-баз · {drones.length} бортів у
            системі
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="bg-accent-secondary hover:bg-accent-secondary/90 hover:shadow-[0_0_15px_rgba(0,194,255,0.3)] text-bg-main text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all cursor-pointer border border-transparent"
          >
            {showAddForm ? "✕ Скасувати" : "➕ Додати БПЛА"}
          </button>
          <span className="text-xs text-accent-secondary border border-accent-secondary/30 px-3 py-2 bg-accent-secondary/10 shrink-0">
            Телеметрія 20 Гц
          </span>
        </div>
      </div>

      {/* Форма додавання нового БПЛА */}
      {showAddForm && (
        <div className="bg-bg-main border border-accent-secondary/30 p-5 mb-6 animate-sys-fade">
          <p className="text-xs text-accent-secondary uppercase tracking-widest font-bold mb-4">
            Реєстрація нового борту
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                Назва / позивний (необов'язково)
              </label>
              <input
                className="w-full bg-bg-card border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:border-accent-secondary outline-none placeholder:text-text-muted/40"
                placeholder="DJI Matrice 300 RTK (Борт №05)"
                value={newDrone.model_name}
                onChange={(e) =>
                  setNewDrone((p) => ({ ...p, model_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                Ресторан-база
              </label>
              <select
                className="w-full bg-bg-card border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:border-accent-secondary outline-none"
                value={newDrone.restaurant_id}
                onChange={(e) =>
                  setNewDrone((p) => ({ ...p, restaurant_id: e.target.value }))
                }
              >
                <option value="">— Без бази (призначити пізніше) —</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddDrone}
                disabled={loadingAdd}
                className="w-full bg-accent-secondary text-bg-main text-xs font-bold uppercase tracking-widest px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-secondary/90"
              >
                {loadingAdd ? "⏳ Реєструємо..." : "✓ Зареєструвати борт"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Дрони згруповані по ресторанах */}
      {Object.entries(grouped).map(([restId, group]) => (
        <div key={restId} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase tracking-widest text-accent-primary font-bold border-b border-accent-primary/30 pb-1.5">
              🍽 {group.name} — {group.drones.length} борт(ів)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {group.drones.map(renderDroneCard)}
          </div>
        </div>
      ))}

      {/* Дрони без бази */}
      {unassigned.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase tracking-widest text-warning font-bold border-b border-warning/30 pb-1.5">
              ⚠️ Без бази — {unassigned.length} борт(ів) (потребують
              призначення)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {unassigned.map(renderDroneCard)}
          </div>
        </div>
      )}

      {drones.length === 0 && (
        <p className="text-sm text-text-muted text-center py-10">
          Авіапарк порожній — додайте перший борт
        </p>
      )}

      {/* Модальне підтвердження */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-main/80 backdrop-blur-sm animate-sys-fade">
          <div className="bg-bg-card border-2 border-danger p-8 max-w-sm w-full shadow-[0_0_30px_rgba(255,59,92,0.2)] font-mono text-center">
            <div className="text-4xl mb-4">
              {modalConfig.type === "delete" ? "🗑️" : "📉"}
            </div>
            <h3 className="text-base font-bold text-text-main mb-3 uppercase tracking-widest">
              Системне підтвердження
            </h3>
            <p className="text-sm text-text-muted mb-6 uppercase tracking-wide leading-relaxed">
              {modalConfig.type === "delete"
                ? "Безповоротно видалити цей БПЛА з інфраструктури ЦУП?"
                : "Перевести БПЛА у статус списаного? Використання буде заблоковано."}
            </p>
            <div className="flex gap-4">
              <button
                onClick={closeModal}
                className="flex-1 border border-border-color text-text-muted hover:text-text-main py-3 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 bg-danger text-white hover:bg-danger/90 py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,59,92,0.4)] cursor-pointer"
              >
                {modalConfig.type === "delete" ? "Видалити" : "Списати"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorDroneMonitor;
