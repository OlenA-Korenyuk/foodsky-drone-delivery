function WeatherMonitor({ weatherData }) {
  if (!weatherData) return null;

  return (
    <div className="space-y-3 mb-4 animate-sys-fade">
      <div className="bg-bg-card border border-border-color p-4 flex flex-wrap gap-6 items-center text-[10px] font-mono uppercase tracking-widest text-text-muted">
        <span className="font-bold text-text-main flex items-center gap-1">
          🌤️ Метеомоніторинг ЦУП:
        </span>
        <div>
          Температура:{" "}
          <span className="font-semibold text-text-main">
            {weatherData.current?.temp ?? "--"}°C
          </span>
        </div>
        <div>
          Вітер:{" "}
          <span className="font-semibold text-text-main">
            {weatherData.current?.wind ?? "--"} м/с
          </span>
        </div>
        <div>
          Опади:{" "}
          <span className="font-semibold text-text-main">
            {weatherData.current?.rain ?? "0"} мм
          </span>
        </div>
        <div className="ml-auto">
          <span
            className={`px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase border ${
              weatherData.isSafe
                ? "bg-accent-primary/10 text-accent-primary border-accent-primary/30"
                : "bg-danger/10 text-danger border-danger/30"
            }`}
          >
            {weatherData.isSafe
              ? "● Політна погода Сприятлива"
              : "● Зльоти Автоматично Заблоковано"}
          </span>
        </div>
      </div>

      {weatherData.forecastWarning && (
        <div className="bg-[#1a1300] border border-warning/30 p-3 text-warning text-[10px] uppercase font-mono tracking-wider animate-pulse">
          ⚠️ Прогнозне попередження системи: {weatherData.forecastWarning}
        </div>
      )}
    </div>
  );
}

export default WeatherMonitor;
