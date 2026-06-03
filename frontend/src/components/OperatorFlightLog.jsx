function OperatorFlightLog({ missionHistory }) {
  const totalMissions = missionHistory?.length || 0;

  const getStatusCell = (status) => {
    switch (status) {
      case "delivered":
        return (
          <span className="text-xs text-accent-primary border border-accent-primary/30 px-2.5 py-1 bg-accent-primary/5 uppercase tracking-wider font-bold">
            ✓ Виконано
          </span>
        );
      case "recalled":
        return (
          <span className="text-xs text-danger border border-danger/30 px-2.5 py-1 bg-danger/5 uppercase tracking-wider font-bold">
            ✕ Скасовано
          </span>
        );
      case "delivering":
        return (
          <span className="text-xs text-accent-secondary border border-accent-secondary/30 px-2.5 py-1 bg-accent-secondary/5 uppercase tracking-wider font-bold animate-pulse">
            ⏳ Очікує клієнта
          </span>
        );
      case "flying":
      case "en_route":
        return (
          <span className="text-xs text-warning border border-warning/30 px-2.5 py-1 bg-warning/5 uppercase tracking-wider font-bold animate-pulse">
            🚁 В місії
          </span>
        );
      default:
        return (
          <span className="text-xs text-text-muted border border-border-color px-2.5 py-1 uppercase tracking-wider font-bold">
            ● На базі
          </span>
        );
    }
  };

  return (
    <div className="bg-bg-card border border-border-color p-5 font-mono animate-sys-fade shadow-[0_0_20px_rgba(0,0,0,0.2)]">
      <div className="flex justify-between items-center mb-4 border-b border-border-color pb-3">
        <h2 className="text-base font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
          <span className="text-accent-secondary">📋</span> Польотний журнал
          системи
        </h2>
        <span className="text-xs text-accent-secondary border border-accent-secondary/40 px-3 py-1.5 bg-accent-secondary/10 uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(0,194,255,0.1)]">
          Усього місій: {totalMissions}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-175">
          <thead>
            <tr className="border-b border-border-color text-xs uppercase tracking-widest text-text-muted bg-[#0d151a]/40">
              <th className="p-3 font-normal text-accent-secondary">
                ID Місії
              </th>
              <th className="p-3 font-normal text-accent-secondary">
                База базування
              </th>
              <th className="p-3 font-normal text-accent-secondary">
                Маса нетто
              </th>
              <th className="p-3 font-normal text-accent-secondary">
                Час створення
              </th>
              <th className="p-3 font-normal text-accent-secondary text-right">
                Статус
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-text-main">
            {!missionHistory || missionHistory.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="p-8 text-center text-text-muted uppercase tracking-widest text-xs"
                >
                  Польотні дані в системі ЦУП відсутні.
                </td>
              </tr>
            ) : (
              missionHistory.map((mission) => {
                const weight = mission.total_weight ?? mission.weight ?? "0";
                const status = mission.status || "delivered";

                return (
                  <tr
                    key={mission.id}
                    className="border-b border-border-color/30 hover:bg-[#0c1418]/60 transition-colors duration-200"
                  >
                    <td className="p-3 text-accent-secondary font-bold tracking-wider">
                      {mission.id ? `${mission.id.substring(0, 8)}...` : "—"}
                    </td>
                    <td className="p-3 font-medium text-text-main">
                      {mission.Restaurant?.name ||
                        mission.restaurant_name ||
                        "—"}
                    </td>
                    <td className="p-3 text-text-muted font-mono">
                      {weight} г
                    </td>
                    <td className="p-3 text-text-muted font-mono">
                      {mission.createdAt
                        ? new Date(mission.createdAt).toLocaleString("uk-UA")
                        : "—"}
                    </td>
                    <td className="p-3 text-right">{getStatusCell(status)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OperatorFlightLog;
