function Header({ user, onLogout }) {
  if (!user) return null;

  return (
    <header className="bg-bg-card border-b border-border-color h-16 flex items-center justify-between px-6 shrink-0 w-full">
      {/* Інформація про користувача */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text-main font-mono tracking-wide">
            {user.username}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-text-muted font-mono">
            ID: {user.id.substring(0, 8)}
          </span>
        </div>

        {/* Бейдж ролі */}
        <div
          className={`px-2 py-1 text-[10px] uppercase font-mono font-bold tracking-widest border ${
            user.role === "operator"
              ? "bg-accent-secondary/10 text-accent-secondary border-accent-secondary/30"
              : "bg-accent-primary/10 text-accent-primary border-accent-primary/30"
          }`}
        >
          {user.role === "operator" ? "Диспетчер" : "Клієнт"}
        </div>
      </div>

      {/* Кнопка виходу */}
      <button
        onClick={onLogout}
        className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted hover:text-danger hover:bg-danger/10 px-4 py-2 border border-border-color hover:border-danger/30 transition-all"
      >
        Завершити сеанс
      </button>
    </header>
  );
}

export default Header;
