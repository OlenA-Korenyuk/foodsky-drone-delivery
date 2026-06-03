function RestaurantList({ restaurants, onAddToCart }) {
  return (
    <div className="w-full">
      <h2 className="text-sm font-bold text-text-main mb-4 uppercase tracking-widest font-mono border-b border-border-color pb-3">
        Мережа ресторанів-партнерів
      </h2>
      <div className="space-y-4">
        {restaurants.map((rest) => (
          <div
            key={rest.id}
            className="bg-bg-card border border-border-color p-5 hover:border-accent-primary/40 transition-colors"
          >
            <div className="flex justify-between items-center mb-4 border-b border-border-color/50 pb-3">
              <h3 className="font-bold text-lg text-accent-primary tracking-wide">
                {rest.name}
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-accent-primary border border-accent-primary/30 px-2 py-1 bg-accent-primary/10">
                Online
              </span>
            </div>

            <p className="text-xs text-text-muted mb-3 font-mono uppercase tracking-wide">
              Доступне меню:
            </p>

            <ul className="space-y-2">
              {rest.menu.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center bg-[#0a0f0d] p-3 border border-border-color hover:border-accent-secondary/50 transition-colors"
                >
                  <span className="text-sm text-text-main font-medium">
                    {item.name}
                    <span className="text-text-muted text-xs font-mono ml-2">
                      — {item.price} грн ({item.weight_grams} г)
                    </span>
                  </span>
                  <button
                    onClick={() => onAddToCart(item, rest)}
                    className="bg-accent-secondary/10 text-accent-secondary border border-accent-secondary hover:bg-accent-secondary hover:text-bg-main px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer font-mono"
                  >
                    Додати
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RestaurantList;
