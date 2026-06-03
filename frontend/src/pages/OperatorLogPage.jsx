import { useState, useEffect } from "react";
import axios from "axios";
import OperatorFlightLog from "../components/OperatorFlightLog";

const LEVEL_STYLES = {
  INFO: "text-accent-primary border-accent-primary/30 bg-accent-primary/5",
  WARNING: "text-warning border-warning/30 bg-warning/5",
  ERROR: "text-danger border-danger/30 bg-danger/5",
  CRITICAL: "text-danger border-danger/50 bg-danger/10 animate-pulse",
};

const COMPONENT_ICON = {
  AUTOPILOT: "🚁",
  DISPATCHER: "📡",
  OPERATOR: "👤",
  FLEET: "🔧",
  SYSTEM: "⚙️",
};

function OperatorLogPage({ missionHistory, token }) {
  const [activeTab, setActiveTab] = useState("missions");
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (activeTab !== "events" || !token) return;
    const load = async () => {
      setLoadingEvents(true);
      try {
        const res = await axios.get("http://localhost:5001/api/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEvents(res.data || []);
      } catch (e) {
        console.warn("Помилка завантаження журналу подій:", e.message);
      } finally {
        setLoadingEvents(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [activeTab, token]);

  return (
    <div className="animate-sys-fade space-y-4">
      {/* Таб-перемикач */}
      <div className="flex gap-0 border border-border-color w-fit">
        <button
          onClick={() => setActiveTab("missions")}
          className={`text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all cursor-pointer border-r border-border-color ${
            activeTab === "missions"
              ? "bg-accent-secondary text-bg-main"
              : "bg-bg-card text-text-muted hover:text-text-main hover:bg-bg-main"
          }`}
        >
          📋 Журнал місій
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all cursor-pointer ${
            activeTab === "events"
              ? "bg-accent-secondary text-bg-main"
              : "bg-bg-card text-text-muted hover:text-text-main hover:bg-bg-main"
          }`}
        >
          ⚙️ Журнал подій системи
        </button>
      </div>

      {/* Журнал місій */}
      {activeTab === "missions" && (
        <OperatorFlightLog missionHistory={missionHistory} />
      )}

      {/* Журнал подій */}
      {activeTab === "events" && (
        <div className="bg-bg-card border border-border-color p-5 font-mono animate-sys-fade shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-center mb-4 border-b border-border-color pb-3">
            <div>
              <h2 className="text-base font-bold text-text-main uppercase tracking-widest">
                ⚙️ Журнал подій кіберфізичної системи
              </h2>
              <span className="text-xs text-text-muted uppercase tracking-wider mt-1 block">
                Централізований лог-сервер · {events.length} записів
              </span>
            </div>
            <span className="text-xs text-accent-secondary border border-accent-secondary/40 px-3 py-1.5 bg-accent-secondary/10 uppercase tracking-widest font-bold">
              Авто-оновлення 10с
            </span>
          </div>

          {loadingEvents ? (
            <p className="text-xs text-text-muted text-center py-8 uppercase tracking-widest">
              ⏳ Завантаження журналу...
            </p>
          ) : events.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8 uppercase tracking-widest">
              Журнал подій порожній
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-border-color/50 bg-bg-main px-4 py-2.5 flex flex-wrap items-start gap-3 hover:border-border-color/80 transition-colors"
                >
                  {/* Час */}
                  <span className="text-xs text-text-muted font-mono shrink-0 mt-0.5">
                    {new Date(event.createdAt).toLocaleString("uk-UA")}
                  </span>

                  {/* Рівень */}
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 border shrink-0 ${
                      LEVEL_STYLES[event.level] || LEVEL_STYLES.INFO
                    }`}
                  >
                    {event.level}
                  </span>

                  {/* Компонент */}
                  <span className="text-xs text-text-muted border border-border-color/50 px-2 py-0.5 shrink-0">
                    {COMPONENT_ICON[event.component] || "•"} {event.component}
                  </span>

                  {/* Повідомлення */}
                  <span className="text-xs text-text-main flex-1 min-w-0 break-words">
                    {event.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OperatorLogPage;
