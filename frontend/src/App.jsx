import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

import LoginForm from "./components/LoginForm";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ClientOrderPage from "./pages/ClientOrderPage";
import TrackingPage from "./pages/TrackingPage";
import ClientHistoryPage from "./pages/ClientHistoryPage";
import OperatorFleetPage from "./pages/OperatorFleetPage";
import OperatorLogPage from "./pages/OperatorLogPage";
import OperatorInfraPage from "./pages/OperatorInfraPage";

const socket = io("http://localhost:5001");

function App() {
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const [restaurants, setRestaurants] = useState([]);
  const [nfzZones, setNfzZones] = useState([]);
  const [cart, setCart] = useState([]);
  const [deliveryCoords, setDeliveryCoords] = useState(null);

  const [activeMission, setActiveMission] = useState(null);
  const [missionHistory, setMissionHistory] = useState([]);
  const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
  const [weatherData, setWeatherData] = useState(null);

  const [hasAvailableDrones, setHasAvailableDrones] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:5001/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMissionHistory(res.data);
    } catch (error) {
      console.debug("Помилка історії:", error.message);
    }
  }, [token]);

  const fetchFleetStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:5001/api/drones", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const idleDrones = res.data.filter((d) => d.status === "idle");

      if (cart.length > 0 && cart[0].restaurant?.id) {
        // Перевіряємо наявність дрона для конкретного ресторану з кошика

        const restaurantId = cart[0].restaurant.id;
        const available = idleDrones.some(
          (d) => d.restaurant_id === restaurantId || d.restaurant_id === null
        );
        setHasAvailableDrones(available);
      } else {
        // Кошик порожній — є хоч якийсь вільний дрон?
        setHasAvailableDrones(idleDrones.length > 0);
      }
    } catch (error) {
      console.debug("Помилка перевірки флоту:", error.message);
      setHasAvailableDrones(false);
    }
  }, [token, cart]);

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setCart([]);
    setDeliveryCoords(null);
    setActiveMission(null);
    setIsArrivalModalOpen(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    if (!token) return;

    const loadInitialData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const restaurantsRes = await axios.get(
          "http://localhost:5001/api/restaurants",
          config
        );
        setRestaurants(restaurantsRes.data);

        const nfzRes = await axios.get("http://localhost:5001/api/nfz", config);
        setNfzZones(nfzRes.data);

        const weatherRes = await axios.get(
          "http://localhost:5001/api/weather",
          config
        );
        setWeatherData(weatherRes.data);

        await fetchHistory();
        await fetchFleetStatus();
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403)
          handleLogout();
      }
    };

    loadInitialData();

    const fleetInterval = setInterval(fetchFleetStatus, 4000);
    return () => clearInterval(fleetInterval);
  }, [token, fetchHistory, fetchFleetStatus, handleLogout]);

  useEffect(() => {
    if (!token) return;

    socket.on("drone_waiting_delivery", (data) => {
      fetchHistory();
      if (user && user.role === "client") {
        setActiveMission((prev) => ({ ...prev, orderId: data.orderId }));
        setIsArrivalModalOpen(true);
      }
    });

    socket.on("mission_recalled", (data) => {
      fetchHistory();
      // Якщо це місія поточного клієнта — показуємо повідомлення і скидаємо стан
      if (activeMission?.orderId === data.orderId) {
        alert(
          "⚠️ Ваше замовлення було скасовано оператором. Дрон повертається на базу."
        );
        setTimeout(() => {
          setActiveMission(null);
          setDeliveryCoords(null);
        }, 3000);
      }
    });

    return () => {
      socket.off("drone_waiting_delivery");
      socket.off("mission_complete");
    };
  }, [token, user, fetchHistory]);

  const handleAddToCart = (item, restaurant) => {
    if (cart.length > 0 && cart[0].restaurant?.id !== restaurant.id) {
      alert("⚠️ Дрон може забрати вантаж лише з одного ресторану одночасно!");
      return;
    }
    setCart((prev) => [...prev, { ...item, restaurant }]);
  };

  const handleRemoveFromCart = () => setCart([]);

  const handleStartMission = async () => {
    if (cart.length === 0 || !deliveryCoords || !hasAvailableDrones) return;

    const totalPrice = cart.reduce(
      (sum, item) => sum + parseFloat(item.price),
      0
    );
    const totalWeight = cart.reduce(
      (sum, item) => sum + parseInt(item.weight_grams),
      0
    );
    const restaurantId = cart[0].restaurant.id;

    try {
      const response = await axios.post(
        "http://localhost:5001/api/orders",
        {
          restaurant_id: restaurantId,
          delivery_lat: deliveryCoords[0],
          delivery_lng: deliveryCoords[1],
          total_price: totalPrice,
          total_weight: totalWeight,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveMission({
        waypoints: response.data.waypoints,
        orderId: response.data.order.id,
      });

      setCart([]);
      fetchHistory();
      fetchFleetStatus();
      navigate("/tracking");
    } catch (error) {
      alert(error.response?.data?.error || "Помилка ініціалізації польоту");
    }
  };

  const handleConfirmDelivery = (orderId) => {
    let finalWaypoints = activeMission?.waypoints;
    const currentId = orderId || activeMission?.orderId;

    if (!finalWaypoints && currentId) {
      const targetOrder = missionHistory.find((o) => o.id === currentId);
      finalWaypoints =
        targetOrder?.waypoints ||
        targetOrder?.Mission?.waypoints ||
        targetOrder?.waypoints_json;
      if (targetOrder?.route_geojson?.coordinates) {
        finalWaypoints = targetOrder.route_geojson.coordinates.map((c) => [
          c[1],
          c[0],
        ]);
      }
    }

    if (typeof finalWaypoints === "string") {
      try {
        finalWaypoints = JSON.parse(finalWaypoints);
      } catch (error) {
        console.debug("JSON парсинг:", error.message);
      }
    }

    if (
      !finalWaypoints ||
      !Array.isArray(finalWaypoints) ||
      finalWaypoints.length === 0
    ) {
      if (currentId) {
        const targetOrder = missionHistory.find((o) => o.id === currentId);
        if (targetOrder) {
          const restaurant = restaurants.find(
            (r) => r.id === targetOrder.restaurant_id
          );
          if (
            restaurant?.location?.lat &&
            (targetOrder.delivery_lat || targetOrder.lat)
          ) {
            finalWaypoints = [
              [restaurant.location.lat, restaurant.location.lng],
              [
                parseFloat(targetOrder.delivery_lat || targetOrder.lat),
                parseFloat(targetOrder.delivery_lng || targetOrder.lng),
              ],
            ];
          }
        }
      }
    }

    if (
      !finalWaypoints ||
      !Array.isArray(finalWaypoints) ||
      finalWaypoints.length === 0
    ) {
      finalWaypoints = [
        [50.4501, 30.5234],
        [50.4601, 30.5334],
      ];
    }

    setIsArrivalModalOpen(false);
    socket.emit("confirm_delivery", {
      orderId: currentId,
      waypoints: finalWaypoints,
    });
    fetchHistory();
  };

  const handleMissionCompleteFromMap = async (orderId) => {
    try {
      await axios.patch(
        `http://localhost:5001/api/orders/${orderId}`,
        { status: "delivered" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.debug("Помилка фіксації посадки:", error.message);
    } finally {
      fetchHistory();
      fetchFleetStatus();
      setTimeout(() => {
        setActiveMission(null);
        setDeliveryCoords(null);
      }, 3000);
    }
  };

  const handleLogin = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
    navigate(userData.role === "operator" ? "/fleet" : "/order");
  };

  if (!token) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="flex h-screen overflow-hidden bg-bg-main text-text-main font-mono">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <Routes>
            {user.role === "client" && (
              <>
                <Route
                  path="/order"
                  element={
                    <ClientOrderPage
                      restaurants={restaurants}
                      nfzZones={nfzZones}
                      cart={cart}
                      onAddToCart={handleAddToCart}
                      onRemoveFromCart={handleRemoveFromCart}
                      deliveryCoords={deliveryCoords}
                      setDeliveryCoords={setDeliveryCoords}
                      onStartMission={handleStartMission}
                      isWeatherSafe={weatherData?.isSafe ?? true}
                      weatherReason={
                        weatherData?.forecastWarning || "Несприятливий прогноз"
                      }
                      hasAvailableDrones={hasAvailableDrones}
                    />
                  }
                />
                <Route
                  path="/tracking"
                  element={
                    <TrackingPage
                      activeMission={activeMission}
                      user={user}
                      restaurants={restaurants}
                      nfzZones={nfzZones}
                      deliveryCoords={deliveryCoords}
                      isArrivalModalOpen={isArrivalModalOpen}
                      setIsArrivalModalOpen={setIsArrivalModalOpen}
                      onConfirmDelivery={handleConfirmDelivery}
                      weatherData={weatherData}
                      onMissionComplete={handleMissionCompleteFromMap}
                    />
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ClientHistoryPage
                      missionHistory={missionHistory}
                      onConfirmDelivery={handleConfirmDelivery}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/order" replace />} />
              </>
            )}
            {user.role === "operator" && (
              <>
                <Route
                  path="/infra"
                  element={<OperatorInfraPage token={token} />}
                />
                <Route
                  path="/fleet"
                  element={<OperatorFleetPage token={token} />}
                />
                <Route
                  path="/tracking"
                  element={
                    <TrackingPage
                      activeMission={activeMission}
                      user={user}
                      restaurants={restaurants}
                      nfzZones={nfzZones}
                      deliveryCoords={deliveryCoords}
                      isArrivalModalOpen={isArrivalModalOpen}
                      setIsArrivalModalOpen={setIsArrivalModalOpen}
                      onConfirmDelivery={handleConfirmDelivery}
                      weatherData={weatherData}
                      onMissionComplete={handleMissionCompleteFromMap}
                      token={token}
                    />
                  }
                />
                <Route
                  path="/log"
                  element={
                    <OperatorLogPage
                      missionHistory={missionHistory}
                      token={token}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/fleet" replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
