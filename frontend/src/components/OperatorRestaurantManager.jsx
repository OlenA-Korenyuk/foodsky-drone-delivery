import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5001";

function OperatorRestaurantManager({ token }) {
  const [restaurants, setRestaurants] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Форма нового ресторану
  const [newRest, setNewRest] = useState({ name: "", lat: "", lng: "" });
  const [showAddRest, setShowAddRest] = useState(false);

  // Форма редагування ресторану
  const [editRest, setEditRest] = useState(null);

  // Форма нової страви
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    weight_grams: "",
  });
  const [addingItemTo, setAddingItemTo] = useState(null);

  // Форма редагування страви
  const [editItem, setEditItem] = useState(null);

  // Модальне підтвердження видалення
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null,
    id: null,
    name: "",
  });

  const fetchRestaurants = async () => {
    try {
      const res = await axios.get(`${API}/api/restaurants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRestaurants(res.data || []);
    } catch (e) {
      console.warn("Помилка завантаження ресторанів:", e.message);
    }
  };

  useEffect(() => {
    axios
      .get(`${API}/api/restaurants`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setRestaurants(res.data || []))
      .catch((e) =>
        console.warn("Помилка завантаження ресторанів:", e.message)
      );
  }, [token]);

  const handleAddRestaurant = async () => {
    if (!newRest.name || !newRest.lat || !newRest.lng) return;
    setLoading(true);
    try {
      await axios.post(
        `${API}/api/restaurants`,
        {
          name: newRest.name,
          location: {
            lat: parseFloat(newRest.lat),
            lng: parseFloat(newRest.lng),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewRest({ name: "", lat: "", lng: "" });
      setShowAddRest(false);
      await fetchRestaurants();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка створення ресторану");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRestaurant = async () => {
    if (!editRest) return;
    setLoading(true);
    try {
      await axios.patch(
        `${API}/api/restaurants/${editRest.id}`,
        {
          name: editRest.name,
          location: {
            lat: parseFloat(editRest.lat),
            lng: parseFloat(editRest.lng),
          },
          is_active: editRest.is_active,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditRest(null);
      await fetchRestaurants();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка оновлення ресторану");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rest) => {
    try {
      await axios.patch(
        `${API}/api/restaurants/${rest.id}`,
        { is_active: !rest.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchRestaurants();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка зміни статусу");
    }
  };

  const handleDeleteRestaurant = async (id) => {
    try {
      await axios.delete(`${API}/api/restaurants/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExpandedId(null);
      await fetchRestaurants();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка видалення ресторану");
    } finally {
      setDeleteModal({ open: false, type: null, id: null, name: "" });
    }
  };

  // ── МЕНЮ ───────────────────────────────────────────────────

  const handleAddMenuItem = async (restaurantId) => {
    if (!newItem.name || !newItem.price || !newItem.weight_grams) return;
    setLoading(true);
    try {
      await axios.post(
        `${API}/api/restaurants/${restaurantId}/menu`,
        {
          name: newItem.name,
          price: newItem.price,
          weight_grams: newItem.weight_grams,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewItem({ name: "", price: "", weight_grams: "" });
      setAddingItemTo(null);
      await fetchRestaurants();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка додавання страви");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMenuItem = async () => {
    if (!editItem) return;
    setLoading(true);
    try {
      await axios.patch(
        `${API}/api/menu/${editItem.id}`,
        {
          name: editItem.name,
          price: editItem.price,
          weight_grams: editItem.weight_grams,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditItem(null);
      await fetchRestaurants();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка оновлення страви");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenuItem = async (id) => {
    try {
      await axios.delete(`${API}/api/menu/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRestaurants();
    } catch (e) {
      alert(e.response?.data?.error || "Помилка видалення страви");
    } finally {
      setDeleteModal({ open: false, type: null, id: null, name: "" });
    }
  };

  const confirmDelete = () => {
    if (deleteModal.type === "restaurant")
      handleDeleteRestaurant(deleteModal.id);
    else if (deleteModal.type === "menuitem")
      handleDeleteMenuItem(deleteModal.id);
  };

  return (
    <div className="bg-bg-card border border-border-color p-6 font-mono animate-sys-fade shadow-[0_0_20px_rgba(0,0,0,0.2)] mb-6">
      {/* Заголовок */}
      <div className="border-b border-border-color pb-4 flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-text-main uppercase tracking-widest">
            Управління мережею ресторанів-партнерів
          </h2>
          <span className="text-xs text-text-muted uppercase tracking-wider mt-1">
            CRUD: заклади та позиції меню · {restaurants.length} об'єктів у базі
          </span>
        </div>
        <button
          onClick={() => {
            setShowAddRest((v) => !v);
            setEditRest(null);
          }}
          className="bg-accent-primary hover:bg-accent-primary/90 hover:shadow-[0_0_15px_rgba(0,229,160,0.3)] text-bg-main text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all cursor-pointer border border-transparent"
        >
          {showAddRest ? "✕ Скасувати" : "＋ Новий ресторан"}
        </button>
      </div>

      {/* Форма додавання ресторану */}
      {showAddRest && (
        <div className="bg-bg-main border border-accent-primary/30 p-5 mb-6 animate-sys-fade">
          <p className="text-xs uppercase tracking-widest text-accent-primary font-bold mb-4">
            Реєстрація нового закладу
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                Назва закладу
              </label>
              <input
                value={newRest.name}
                onChange={(e) =>
                  setNewRest((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Burger Sky Podil"
                className="w-full bg-bg-card border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-primary/60 placeholder:text-text-muted/40"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                Широта (lat)
              </label>
              <input
                value={newRest.lat}
                onChange={(e) =>
                  setNewRest((p) => ({ ...p, lat: e.target.value }))
                }
                placeholder="50.4521"
                type="number"
                step="0.0001"
                className="w-full bg-bg-card border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-primary/60 placeholder:text-text-muted/40"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                Довгота (lng)
              </label>
              <input
                value={newRest.lng}
                onChange={(e) =>
                  setNewRest((p) => ({ ...p, lng: e.target.value }))
                }
                placeholder="30.5140"
                type="number"
                step="0.0001"
                className="w-full bg-bg-card border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-primary/60 placeholder:text-text-muted/40"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={handleAddRestaurant}
              disabled={
                loading || !newRest.name || !newRest.lat || !newRest.lng
              }
              className="bg-accent-primary text-bg-main text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-primary/90"
            >
              {loading ? "⏳ Зберігаємо..." : "✓ Зберегти"}
            </button>
          </div>
        </div>
      )}

      {/* Список ресторанів */}
      <div className="space-y-3">
        {restaurants.map((rest) => (
          <div
            key={rest.id}
            className="border border-border-color bg-bg-main transition-all duration-200 hover:border-border-color/60"
          >
            {/* Рядок ресторану */}
            <div className="flex items-center justify-between px-5 py-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() =>
                    setExpandedId(expandedId === rest.id ? null : rest.id)
                  }
                  className="text-text-muted hover:text-accent-primary transition-colors text-sm shrink-0"
                >
                  {expandedId === rest.id ? "▾" : "▸"}
                </button>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-text-main block truncate">
                    {rest.name}
                  </span>
                  <span className="text-xs text-text-muted font-mono mt-0.5 block">
                    {rest.location?.lat?.toFixed(4)},{" "}
                    {rest.location?.lng?.toFixed(4)} · {rest.menu?.length ?? 0}{" "}
                    позицій меню
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs uppercase px-2.5 py-1 font-bold border ${
                    rest.is_active
                      ? "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                      : "bg-bg-card text-text-muted border-border-color"
                  }`}
                >
                  {rest.is_active ? "● активний" : "○ вимкнено"}
                </span>
                <button
                  onClick={() => handleToggleActive(rest)}
                  title={rest.is_active ? "Деактивувати" : "Активувати"}
                  className="text-sm border border-border-color px-2.5 py-1.5 text-text-muted hover:text-warning hover:border-warning/40 transition-all cursor-pointer"
                >
                  {rest.is_active ? "⏸" : "▶"}
                </button>
                <button
                  onClick={() =>
                    setEditRest(
                      editRest?.id === rest.id
                        ? null
                        : {
                            id: rest.id,
                            name: rest.name,
                            lat: rest.location?.lat,
                            lng: rest.location?.lng,
                            is_active: rest.is_active,
                          }
                    )
                  }
                  className="text-sm border border-border-color px-2.5 py-1.5 text-text-muted hover:text-accent-secondary hover:border-accent-secondary/40 transition-all cursor-pointer"
                >
                  ✏️
                </button>
                <button
                  onClick={() =>
                    setDeleteModal({
                      open: true,
                      type: "restaurant",
                      id: rest.id,
                      name: rest.name,
                    })
                  }
                  className="text-sm border border-border-color px-2.5 py-1.5 text-text-muted hover:text-danger hover:border-danger/40 transition-all cursor-pointer"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Форма редагування ресторану */}
            {editRest?.id === rest.id && (
              <div className="border-t border-border-color/50 bg-bg-card px-5 py-4 animate-sys-fade">
                <p className="text-xs uppercase tracking-widest text-accent-secondary font-bold mb-4">
                  Редагування закладу
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                      Назва
                    </label>
                    <input
                      value={editRest.name}
                      onChange={(e) =>
                        setEditRest((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-secondary/60"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                      Широта
                    </label>
                    <input
                      value={editRest.lat}
                      onChange={(e) =>
                        setEditRest((p) => ({ ...p, lat: e.target.value }))
                      }
                      type="number"
                      step="0.0001"
                      className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-secondary/60"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-text-muted block mb-1.5">
                      Довгота
                    </label>
                    <input
                      value={editRest.lng}
                      onChange={(e) =>
                        setEditRest((p) => ({ ...p, lng: e.target.value }))
                      }
                      type="number"
                      step="0.0001"
                      className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-secondary/60"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => setEditRest(null)}
                    className="border border-border-color text-text-muted hover:text-text-main px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleUpdateRestaurant}
                    disabled={loading}
                    className="bg-accent-secondary text-bg-main px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 hover:bg-accent-secondary/90"
                  >
                    {loading ? "⏳" : "✓ Зберегти"}
                  </button>
                </div>
              </div>
            )}

            {/* Розгорнуте меню */}
            {expandedId === rest.id && (
              <div className="border-t border-border-color/50 px-5 py-4 animate-sys-fade">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs uppercase tracking-widest text-text-muted font-bold">
                    Позиції меню
                  </span>
                  <button
                    onClick={() =>
                      setAddingItemTo(addingItemTo === rest.id ? null : rest.id)
                    }
                    className="text-xs uppercase tracking-widest text-accent-primary border border-accent-primary/30 px-3 py-1.5 hover:bg-accent-primary/10 transition-all cursor-pointer font-bold"
                  >
                    {addingItemTo === rest.id
                      ? "✕ Скасувати"
                      : "＋ Нова страва"}
                  </button>
                </div>

                {/* Форма нової страви */}
                {addingItemTo === rest.id && (
                  <div className="bg-bg-card border border-accent-primary/20 p-4 mb-4 animate-sys-fade">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3 md:col-span-1">
                        <label className="text-xs uppercase text-text-muted block mb-1.5">
                          Назва страви
                        </label>
                        <input
                          value={newItem.name}
                          onChange={(e) =>
                            setNewItem((p) => ({ ...p, name: e.target.value }))
                          }
                          placeholder="Чизбургер XL"
                          className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-primary/60 placeholder:text-text-muted/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-text-muted block mb-1.5">
                          Ціна (₴)
                        </label>
                        <input
                          value={newItem.price}
                          onChange={(e) =>
                            setNewItem((p) => ({ ...p, price: e.target.value }))
                          }
                          placeholder="120"
                          type="number"
                          min="0"
                          className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-primary/60 placeholder:text-text-muted/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-text-muted block mb-1.5">
                          Вага (г)
                        </label>
                        <input
                          value={newItem.weight_grams}
                          onChange={(e) =>
                            setNewItem((p) => ({
                              ...p,
                              weight_grams: e.target.value,
                            }))
                          }
                          placeholder="300"
                          type="number"
                          min="0"
                          className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-accent-primary/60 placeholder:text-text-muted/40"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleAddMenuItem(rest.id)}
                        disabled={
                          loading ||
                          !newItem.name ||
                          !newItem.price ||
                          !newItem.weight_grams
                        }
                        className="bg-accent-primary text-bg-main text-xs font-bold uppercase tracking-widest px-4 py-2.5 transition-all cursor-pointer disabled:opacity-50 hover:bg-accent-primary/90"
                      >
                        {loading ? "⏳" : "✓ Додати"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Список страв */}
                {!rest.menu || rest.menu.length === 0 ? (
                  <p className="text-sm text-text-muted italic py-2">
                    Меню порожнє — додайте першу страву
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rest.menu.map((item) => (
                      <div key={item.id}>
                        {editItem?.id === item.id ? (
                          // Inline-редагування страви
                          <div className="bg-bg-card border border-accent-secondary/20 p-3 animate-sys-fade">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-3 md:col-span-1">
                                <input
                                  value={editItem.name}
                                  onChange={(e) =>
                                    setEditItem((p) => ({
                                      ...p,
                                      name: e.target.value,
                                    }))
                                  }
                                  className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2 font-mono focus:outline-none focus:border-accent-secondary/60"
                                />
                              </div>
                              <div>
                                <input
                                  value={editItem.price}
                                  onChange={(e) =>
                                    setEditItem((p) => ({
                                      ...p,
                                      price: e.target.value,
                                    }))
                                  }
                                  type="number"
                                  min="0"
                                  className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2 font-mono focus:outline-none focus:border-accent-secondary/60"
                                />
                              </div>
                              <div>
                                <input
                                  value={editItem.weight_grams}
                                  onChange={(e) =>
                                    setEditItem((p) => ({
                                      ...p,
                                      weight_grams: e.target.value,
                                    }))
                                  }
                                  type="number"
                                  min="0"
                                  className="w-full bg-bg-main border border-border-color text-text-main text-sm px-3 py-2 font-mono focus:outline-none focus:border-accent-secondary/60"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-3">
                              <button
                                onClick={() => setEditItem(null)}
                                className="text-xs uppercase text-text-muted border border-border-color px-3 py-2 cursor-pointer hover:text-text-main transition-all font-bold tracking-widest"
                              >
                                Скасувати
                              </button>
                              <button
                                onClick={handleUpdateMenuItem}
                                disabled={loading}
                                className="text-xs uppercase bg-accent-secondary text-bg-main px-3 py-2 cursor-pointer disabled:opacity-50 hover:bg-accent-secondary/90 transition-all font-bold tracking-widest"
                              >
                                ✓ Зберегти
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between py-2.5 px-3 hover:bg-bg-card/40 transition-colors group">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm text-text-main truncate">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-sm text-accent-primary font-bold">
                                ₴{parseFloat(item.price).toFixed(0)}
                              </span>
                              <span className="text-xs text-text-muted uppercase tracking-wide">
                                {item.weight_grams} г
                              </span>
                              <button
                                onClick={() =>
                                  setEditItem({
                                    id: item.id,
                                    name: item.name,
                                    price: item.price,
                                    weight_grams: item.weight_grams,
                                  })
                                }
                                className="text-sm text-text-muted hover:text-accent-secondary transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteModal({
                                    open: true,
                                    type: "menuitem",
                                    id: item.id,
                                    name: item.name,
                                  })
                                }
                                className="text-sm text-text-muted hover:text-danger transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Модальне підтвердження видалення */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-main/80 backdrop-blur-sm animate-sys-fade">
          <div className="bg-bg-card border-2 border-danger p-8 max-w-sm w-full shadow-[0_0_30px_rgba(255,59,92,0.2)] font-mono text-center">
            <div className="text-4xl mb-4">🗑️</div>
            <h3 className="text-base font-bold text-text-main mb-3 uppercase tracking-widest">
              Системне підтвердження
            </h3>
            <p className="text-sm text-text-muted mb-3 uppercase tracking-wide leading-relaxed">
              {deleteModal.type === "restaurant"
                ? "Видалити ресторан та всі його страви?"
                : "Видалити позицію меню?"}
            </p>
            <p className="text-sm text-danger font-bold mb-6 truncate">
              "{deleteModal.name}"
            </p>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setDeleteModal({
                    open: false,
                    type: null,
                    id: null,
                    name: "",
                  })
                }
                className="flex-1 border border-border-color text-text-muted hover:text-text-main py-3 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-danger text-white hover:bg-danger/90 py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,59,92,0.4)] cursor-pointer"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorRestaurantManager;
