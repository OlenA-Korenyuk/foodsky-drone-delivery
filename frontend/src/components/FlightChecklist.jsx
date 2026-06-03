function FlightChecklist({
  cart,
  onRemove,
  deliveryCoords,
  onStartMission,
  isWeatherSafe,
  weatherReason,
  hasAvailableDrones,
}) {
  const totalPrice = cart.reduce(
    (sum, item) => sum + parseFloat(item.price),
    0
  );
  const totalWeight = cart.reduce(
    (sum, item) => sum + parseInt(item.weight_grams),
    0
  );

  const canLaunch = isWeatherSafe && !!deliveryCoords && hasAvailableDrones;

  return (
    <div className="bg-bg-card border border-border-color p-5 h-fit sticky top-6 mt-12">
      <h2 className="text-base font-bold text-text-main mb-4 uppercase tracking-widest font-mono border-b border-border-color pb-3">
        Польотне завдання
      </h2>

      {cart.length === 0 ? (
        <p className="text-xs text-text-muted font-mono tracking-wide">
          Кошик порожній. Оберіть страви з меню.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
            {cart.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#0a0f0d] border border-border-color p-3 text-xs font-mono"
              >
                <div className="flex justify-between text-text-main font-bold mb-1">
                  <span>{item.name}</span>
                  <span className="text-accent-secondary">
                    {item.price} грн
                  </span>
                </div>
                <div className="text-text-muted">
                  Маса: {item.weight_grams} г
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border-color/50 text-xs font-mono uppercase tracking-widest">
            <div className="flex justify-between mb-1">
              <span className="text-text-muted">Точка зльоту:</span>{" "}
              <span className="text-accent-primary">
                {cart[0].restaurant.name}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-text-muted">Ціль (Lat/Lng):</span>{" "}
              <span
                className={
                  deliveryCoords ? "text-accent-secondary" : "text-danger"
                }
              >
                {deliveryCoords
                  ? `${deliveryCoords[0].toFixed(
                      4
                    )}, ${deliveryCoords[1].toFixed(4)}`
                  : "Не обрано на карті"}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-text-muted">Загальна маса:</span>{" "}
              <span className="text-text-main">{totalWeight} г</span>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-border-color font-bold text-sm">
              <span className="text-text-muted">Сума:</span>{" "}
              <span className="text-accent-secondary">
                {totalPrice.toFixed(2)} грн
              </span>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            {!hasAvailableDrones && (
              <div className="bg-warning/10 border border-warning p-3">
                <p className="text-xs text-warning font-mono uppercase tracking-widest leading-relaxed">
                  🚁 Усі БПЛА зайняті або на технічному обслуговуванні.
                  Замовлення тимчасово недоступне — спробуйте пізніше.
                </p>
              </div>
            )}

            {!isWeatherSafe && (
              <div className="bg-danger/10 border border-danger p-3">
                <p className="text-xs text-danger font-mono uppercase tracking-widest leading-relaxed">
                  ☁️ Запуск заблоковано: {weatherReason}
                </p>
              </div>
            )}

            <button
              onClick={onRemove}
              className="w-full text-danger border border-danger/30 hover:bg-danger/10 px-4 py-2.5 text-xs uppercase font-mono tracking-widest transition-all"
            >
              Очистити кошик
            </button>
            <button
              onClick={onStartMission}
              disabled={!canLaunch}
              className="w-full bg-accent-primary text-bg-main hover:bg-accent-primary/90 disabled:bg-border-color disabled:text-text-muted disabled:cursor-not-allowed px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all cursor-pointer font-mono"
            >
              Ініціювати запуск
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlightChecklist;
