function DeliveryModal({ mission, onConfirm }) {
  const orderItems = mission?.items || [
    { name: "Гаряче замовлення з ресторану", qty: 1 },
  ];

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#0a0f0d]/90 backdrop-blur-md animate-sys-fade p-4">
      <div className="bg-bg-card border-2 border-accent-primary p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,229,160,0.15)] font-mono text-left grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <div className="border-r border-border-color pr-2 md:pr-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-accent-primary animate-pulse">
              🎯
            </span>
            <h2 className="text-base font-bold text-text-main uppercase tracking-wider">
              Дрон на позиції!
            </h2>
          </div>

          <p className="text-xs text-text-muted uppercase tracking-widest mb-4">
            Замовлення #{mission?.orderId?.substring(0, 8) || "SYS"} доставлено.
          </p>

          <div className="space-y-3 bg-[#0a0f0d] p-4 border border-border-color">
            <h4 className="text-xs uppercase font-bold text-warning tracking-widest">
              Протокол отримання з троса:
            </h4>
            <ol className="text-xs text-text-main space-y-2 list-decimal list-inside uppercase tracking-wide leading-relaxed">
              <li>
                Дочекайтеся зависання БПЛА на безпечній висоті (7 метрів).
              </li>
              <li>Зачекайте, поки лебідка повністю спустить бокс на землю.</li>
              <li>Обережно відчепіть карабін від контейнера.</li>
              <li>Відійдіть на безпечну відстань та підтвердіть отримання.</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-col justify-between pt-4 md:pt-0">
          <div>
            <h3 className="text-xs uppercase font-bold text-text-muted tracking-widest mb-3 border-b border-border-color pb-1.5">
              Склад вантажного боксу:
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm bg-[#0a0f0d] p-2.5 border border-border-color/60"
                >
                  <span className="text-text-main font-medium">
                    {item.name}
                  </span>
                  <span className="text-accent-secondary font-bold text-xs">
                    x{item.qty || 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <p className="text-xs text-text-muted uppercase tracking-widest text-center mb-3 leading-normal">
              Після натискання кнопки лебідка підніметься, і дрон автоматично
              повернеться на базу.
            </p>
            <button
              onClick={() => onConfirm(mission?.orderId)}
              className="w-full bg-accent-primary text-bg-main hover:bg-accent-primary/90 font-bold text-sm uppercase tracking-widest py-4 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,229,160,0.4)] cursor-pointer"
            >
              Вантаж відчеплено. Зліт!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeliveryModal;
