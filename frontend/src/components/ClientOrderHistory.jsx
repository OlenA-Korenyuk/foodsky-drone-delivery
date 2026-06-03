function ClientOrderHistory({ missionHistory, onConfirmDelivery }) {
  if (!missionHistory || missionHistory.length === 0) {
    return (
      <p className="text-text-muted font-mono text-sm tracking-wide">
        Журнал польотів порожній.
      </p>
    );
  }

  const getStatusCell = (order) => {
    switch (order.status) {
      case "delivered":
        return (
          <span className="text-xs text-accent-primary border border-accent-primary/50 px-2.5 py-1 uppercase tracking-widest bg-accent-primary/10">
            ✓ Виконано
          </span>
        );
      case "delivering":
        return (
          <button
            onClick={() => onConfirmDelivery(order.id)}
            className="text-xs bg-accent-secondary text-bg-main px-3 py-1.5 uppercase tracking-widest font-bold cursor-pointer hover:shadow-[0_0_10px_rgba(0,194,255,0.4)]"
          >
            Підтвердити
          </button>
        );
      case "recalled":
        return (
          <span className="text-xs text-danger border border-danger/50 px-2.5 py-1 uppercase tracking-widest bg-danger/10">
            ✕ Скасовано
          </span>
        );
      default:
        return (
          <span className="text-xs text-warning border border-warning/50 px-2.5 py-1 uppercase tracking-widest bg-warning/10 animate-pulse">
            ↑ В польоті
          </span>
        );
    }
  };

  return (
    <div className="bg-bg-card border border-border-color p-5 overflow-x-auto">
      <h2 className="text-base font-bold text-text-main mb-4 uppercase tracking-widest font-mono border-b border-border-color pb-3">
        Журнал статусів авіадоставки
      </h2>
      <table className="w-full text-left border-collapse min-w-150">
        <thead>
          <tr className="border-b border-border-color text-xs uppercase tracking-widest text-text-muted font-mono">
            <th className="p-3 font-normal">ID Замовлення</th>
            <th className="p-3 font-normal">Точка зльоту</th>
            <th className="p-3 font-normal">Маса</th>
            <th className="p-3 font-normal">Вартість</th>
            <th className="p-3 font-normal">Час (Місцевий)</th>
            <th className="p-3 font-normal text-right">Статус</th>
          </tr>
        </thead>
        <tbody className="text-sm font-mono text-text-main">
          {missionHistory.map((order) => (
            <tr
              key={order.id}
              className="border-b border-border-color/30 hover:bg-[#0a0f0d] transition-colors"
            >
              <td className="p-3 text-accent-secondary">
                #{order.id.substring(0, 8)}
              </td>
              <td className="p-3">{order.Restaurant?.name || "Невідомо"}</td>
              <td className="p-3">{order.total_weight} г</td>
              <td className="p-3">{order.total_price} грн</td>
              <td className="p-3 text-text-muted text-xs">
                {new Date(order.createdAt).toLocaleString("uk-UA")}
              </td>
              <td className="p-3 text-right">{getStatusCell(order)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ClientOrderHistory;
