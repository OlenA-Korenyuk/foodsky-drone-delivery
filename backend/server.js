require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sequelize = require("./db");
const { Op } = require("sequelize");

const http = require("http");
const { Server } = require("socket.io");

const { findSafeRoute } = require("./utils/pathfinder");
const { getFlightWeather } = require("./utils/weather");
const { authMiddleware, roleCheck, JWT_SECRET } = require("./utils/auth");

const User = require("./models/User");
const Restaurant = require("./models/Restaurant");
const MenuItem = require("./models/MenuItem");
const Order = require("./models/Order");
const NoFlyZone = require("./models/NoFlyZone");
const Drone = require("./models/Drone");
const OrderItem = require("./models/OrderItem");
const Mission = require("./models/Mission");
const Telemetry = require("./models/Telemetry");
const EventLog = require("./models/EventLog");

const { seedDatabase } = require("./utils/dbInit");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`📡 Нове підключення до ЦУП: ${socket.id}`);
});

// --- DB Relations ---
Restaurant.hasMany(MenuItem, { foreignKey: "restaurant_id", as: "menu" });
MenuItem.belongsTo(Restaurant, { foreignKey: "restaurant_id" });

Restaurant.hasMany(Order, { foreignKey: "restaurant_id" });
Order.belongsTo(Restaurant, { foreignKey: "restaurant_id" });

Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id" });

Order.hasOne(Mission, { foreignKey: "order_id" });
Mission.belongsTo(Order, { foreignKey: "order_id" });

Drone.hasMany(Mission, { foreignKey: "drone_id" });
Mission.belongsTo(Drone, { foreignKey: "drone_id" });

Restaurant.hasMany(Drone, { foreignKey: "restaurant_id", as: "drones" });
Drone.belongsTo(Restaurant, { foreignKey: "restaurant_id", as: "base" });

const activeFlightIntervals = {};

async function logEvent(level, message, component = "SYSTEM") {
  try {
    await EventLog.create({ level, message, component });
  } catch (e) {
    console.error("Помилка запису в event_log:", e.message);
  }
}

function simulateFlight(
  orderId,
  waypoints,
  isReturningPhase = false,
  droneId,
  isRecalled = false
) {
  let currentSegment = 0;
  let segmentProgress = 0;
  const stepsPerSegment = 200;
  const intervalTime = 50;

  const currentPath = isReturningPhase ? [...waypoints].reverse() : waypoints;

  // Уникаємо перезапису статусу при примусовому скасуванні місії (RTH)
  if (!isRecalled) {
    Order.update({ status: "en_route" }, { where: { id: orderId } });
  }

  const interval = setInterval(async () => {
    segmentProgress += 1;

    if (segmentProgress > stepsPerSegment) {
      currentSegment += 1;
      segmentProgress = 0;
    }

    if (segmentProgress % 45 === 0) {
      const drone = await Drone.findByPk(droneId);
      if (drone && drone.battery_level > 0) {
        const nextBattery = drone.battery_level - 1;
        await drone.update({ battery_level: nextBattery });
        io.emit("drone_battery_changed", {
          droneId,
          battery_level: nextBattery,
        });
      }
    }

    if (currentSegment >= currentPath.length - 1) {
      clearInterval(interval);
      delete activeFlightIntervals[orderId];

      if (!isReturningPhase) {
        await Order.update(
          { status: "delivering" },
          { where: { id: orderId } }
        );
        io.emit("drone_waiting_delivery", { orderId });
        await logEvent(
          "INFO",
          `Місія #${String(orderId).substring(
            0,
            8
          )}: БПЛА прибув до точки доставки, очікує підтвердження клієнта.`,
          "AUTOPILOT"
        );
      } else {
        const finalStatus = isRecalled ? "recalled" : "delivered";
        await Order.update({ status: finalStatus }, { where: { id: orderId } });
        await Drone.update({ status: "idle" }, { where: { id: droneId } });
        io.emit("mission_complete", { orderId, recalled: isRecalled });
        if (isRecalled) {
          await logEvent(
            "WARNING",
            `Місія #${String(orderId).substring(
              0,
              8
            )}: БПЛА повернувся на базу після скасування оператором.`,
            "AUTOPILOT"
          );
        } else {
          await logEvent(
            "INFO",
            `Місія #${String(orderId).substring(
              0,
              8
            )}: БПЛА успішно повернувся на базу. Місію завершено.`,
            "AUTOPILOT"
          );
        }
      }
      return;
    }

    const pStart = currentPath[currentSegment];
    const pEnd = currentPath[currentSegment + 1];

    const currentLat =
      pStart[0] + (pEnd[0] - pStart[0]) * (segmentProgress / stepsPerSegment);
    const currentLng =
      pStart[1] + (pEnd[1] - pStart[1]) * (segmentProgress / stepsPerSegment);

    const finalEnd = currentPath[currentPath.length - 1];
    const latDiff = finalEnd[0] - currentLat;
    const lngDiff = finalEnd[1] - currentLng;
    const metersLeft =
      Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lngDiff, 2)) * 111000;

    const sensorNoise = (Math.random() - 0.5) * 3;
    let baseAltitude = 90;
    if (metersLeft < 200) {
      baseAltitude = isReturningPhase
        ? Math.max(0, (metersLeft / 200) * 90)
        : Math.max(7, (metersLeft / 200) * 90);
    } else if (currentSegment === 0 && segmentProgress < 50) {
      baseAltitude = (segmentProgress / 50) * 90;
    }

    const altitude = baseAltitude + sensorNoise;
    const speed = 12 + (Math.random() - 0.5) * 2;

    io.emit("telemetry", {
      orderId,
      dronePos: [currentLat, currentLng],
      isReturning: isReturningPhase,
      telemetry: {
        distanceLeft: Math.round(metersLeft),
        eta: Math.round(metersLeft / speed),
        altitude: Math.max(0, altitude).toFixed(1),
        speed: speed.toFixed(1),
      },
    });
  }, intervalTime);

  activeFlightIntervals[orderId] = interval;
}

io.on("connection", (socket) => {
  socket.on("confirm_delivery", async (data) => {
    const { orderId, waypoints } = data;
    const order = await Order.findByPk(orderId);
    const mission = await Mission.findOne({ where: { order_id: orderId } });
    if (order && order.status === "delivering" && mission) {
      simulateFlight(orderId, waypoints, true, mission.drone_id);
    }
  });
});

// --- API Routes ---

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      first_name,
      last_name,
      phone_number,
    } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      username,
      email,
      password_hash: hashed,
      role: role || "client",
      first_name,
      last_name,
      phone_number,
    });
    res.status(201).json({ message: "Успіх", userId: newUser.id });
  } catch (e) {
    console.error("Помилка реєстрації:", e);
    res.status(500).json({ error: "Помилка реєстрації користувача" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(400).json({ error: "Неправильний логін або пароль." });
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
      },
    });
  } catch (e) {
    console.error("Помилка входу:", e);
    res.status(500).json({ error: "Помилка авторизації" });
  }
});

app.get("/api/restaurants", authMiddleware, async (req, res) => {
  try {
    const where = req.user.role === "client" ? { is_active: true } : {};
    const restaurants = await Restaurant.findAll({
      where,
      include: [
        { model: MenuItem, as: "menu" },
        {
          model: Drone,
          as: "drones",
          attributes: ["id", "model_name", "status", "battery_level"],
        },
      ],
    });
    res.json(restaurants);
  } catch (e) {
    console.error("Помилка отримання ресторанів:", e);
    res.status(500).json({ error: "Помилка отримання списку ресторанів" });
  }
});

app.post(
  "/api/restaurants",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const { name, location } = req.body;
      const rest = await Restaurant.create({ name, location, is_active: true });
      res.status(201).json(rest);
    } catch (e) {
      console.error("Помилка створення ресторану:", e);
      res.status(500).json({ error: "Помилка створення ресторану" });
    }
  }
);

app.patch(
  "/api/restaurants/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const rest = await Restaurant.findByPk(req.params.id);
      if (!rest) return res.status(404).json({ error: "Ресторан не знайдено" });
      await rest.update(req.body);
      res.json(rest);
    } catch (e) {
      console.error("Помилка оновлення ресторану:", e);
      res.status(500).json({ error: "Помилка оновлення ресторану" });
    }
  }
);

app.delete(
  "/api/restaurants/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const rest = await Restaurant.findByPk(req.params.id);
      if (!rest) return res.status(404).json({ error: "Ресторан не знайдено" });

      // Відв'язуємо дрони від видаленого ресторану (стають без бази)
      await Drone.update(
        { restaurant_id: null },
        { where: { restaurant_id: req.params.id } }
      );
      await MenuItem.destroy({ where: { restaurant_id: req.params.id } });
      await rest.destroy();
      res.json({ message: "Ресторан видалено" });
    } catch (e) {
      console.error("Помилка видалення ресторану:", e);
      res.status(500).json({ error: "Помилка видалення ресторану" });
    }
  }
);

app.post(
  "/api/restaurants/:id/menu",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const rest = await Restaurant.findByPk(req.params.id);
      if (!rest) return res.status(404).json({ error: "Ресторан не знайдено" });
      const { name, price, weight_grams } = req.body;
      const item = await MenuItem.create({
        restaurant_id: req.params.id,
        name,
        price,
        weight_grams,
      });
      res.status(201).json(item);
    } catch (e) {
      console.error("Помилка додавання страви:", e);
      res.status(500).json({ error: "Помилка додавання страви до меню" });
    }
  }
);

app.patch(
  "/api/menu/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const item = await MenuItem.findByPk(req.params.id);
      if (!item) return res.status(404).json({ error: "Страву не знайдено" });
      await item.update(req.body);
      res.json(item);
    } catch (e) {
      console.error("Помилка оновлення страви:", e);
      res.status(500).json({ error: "Помилка оновлення страви" });
    }
  }
);

app.delete(
  "/api/menu/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const item = await MenuItem.findByPk(req.params.id);
      if (!item) return res.status(404).json({ error: "Страву не знайдено" });
      await item.destroy();
      res.json({ message: "Страву видалено" });
    } catch (e) {
      console.error("Помилка видалення страви:", e);
      res.status(500).json({ error: "Помилка видалення страви" });
    }
  }
);

app.get("/api/weather", authMiddleware, async (req, res) => {
  try {
    res.json(await getFlightWeather(50.4501, 30.5234));
  } catch (e) {
    console.error("Помилка погоди:", e);
    res.status(500).json({ error: "Помилка отримання метеоданих" });
  }
});

app.get("/api/nfz", authMiddleware, async (req, res) => {
  try {
    res.json(await NoFlyZone.findAll());
  } catch (e) {
    console.error("Помилка НЗП:", e);
    res.status(500).json({ error: "Помилка отримання зон заборони польотів" });
  }
});

app.post(
  "/api/nfz",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const { name, polygon, is_active } = req.body;
      const zone = await NoFlyZone.create({
        name,
        polygon,
        is_active: is_active ?? true,
      });
      res.status(201).json(zone);
    } catch (e) {
      console.error("Помилка створення NFZ:", e);
      res
        .status(500)
        .json({ error: "Помилка створення зони заборони польотів" });
    }
  }
);

app.patch(
  "/api/nfz/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const zone = await NoFlyZone.findByPk(req.params.id);
      if (!zone) return res.status(404).json({ error: "Зону не знайдено" });
      await zone.update(req.body);
      res.json(zone);
    } catch (e) {
      console.error("Помилка оновлення NFZ:", e);
      res.status(500).json({ error: "Помилка оновлення зони" });
    }
  }
);

app.delete(
  "/api/nfz/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const zone = await NoFlyZone.findByPk(req.params.id);
      if (!zone) return res.status(404).json({ error: "Зону не знайдено" });
      await zone.destroy();
      res.json({ message: "Зону видалено" });
    } catch (e) {
      console.error("Помилка видалення NFZ:", e);
      res.status(500).json({ error: "Помилка видалення зони" });
    }
  }
);

app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [Restaurant],
      order: [["createdAt", "DESC"]],
    });
    res.json(orders);
  } catch (e) {
    console.error("Помилка отримання замовлень:", e);
    res.status(500).json({ error: "Помилка отримання історії замовлень" });
  }
});

app.get("/api/orders/active", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { status: { [Op.in]: ["flying", "en_route", "delivering"] } },
      include: [{ model: Restaurant }, { model: Mission }],
      order: [["createdAt", "DESC"]],
    });
    res.json(orders);
  } catch (e) {
    console.error("Помилка отримання активних місій:", e);
    res.status(500).json({ error: "Помилка отримання активних місій" });
  }
});

// Фільтр скасованих місій (останні 30 хв) для оптимізації фронтенду (ігнор telemetry)
app.get("/api/orders/recalled-recent", authMiddleware, async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const orders = await Order.findAll({
      where: { status: "recalled", updatedAt: { [Op.gte]: thirtyMinutesAgo } },
      attributes: ["id", "status", "updatedAt"],
    });
    res.json(orders);
  } catch (e) {
    console.error("Помилка отримання скасованих місій:", e);
    res.status(500).json({ error: "Помилка" });
  }
});

app.post(
  "/api/orders",
  authMiddleware,
  roleCheck("client"),
  async (req, res) => {
    try {
      const {
        restaurant_id,
        delivery_lat,
        delivery_lng,
        total_price,
        total_weight,
      } = req.body;

      // Шукаємо вільний дрон на базі ресторану. Fallback: будь-який вільний дрон без бази.
      let drone = await Drone.findOne({
        where: { status: "idle", restaurant_id },
        order: [["battery_level", "DESC"]],
      });

      if (!drone) {
        drone = await Drone.findOne({
          where: { status: "idle", restaurant_id: null },
          order: [["battery_level", "DESC"]],
        });
      }

      if (!drone)
        return res
          .status(400)
          .json({ error: "🚨 Немає вільних БПЛА для цього ресторану!" });
      if (total_weight > drone.max_payload_g)
        return res
          .status(400)
          .json({
            error: `🚨 Перевищено ліміт вантажопідйомності дрона (${drone.max_payload_g} г)!`,
          });

      const restaurant = await Restaurant.findByPk(restaurant_id);
      const startCoords = [restaurant.location.lat, restaurant.location.lng];
      const endCoords = [delivery_lat, delivery_lng];

      const nfzZones = await NoFlyZone.findAll({ where: { is_active: true } });
      const safeWaypoints = findSafeRoute(startCoords, endCoords, nfzZones);

      let totalOneWayDistance = 0;
      for (let i = 0; i < safeWaypoints.length - 1; i++) {
        const p1 = safeWaypoints[i];
        const p2 = safeWaypoints[i + 1];
        totalOneWayDistance +=
          Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)) *
          111000;
      }
      const totalRoundTripDistance = totalOneWayDistance * 2;

      const usableBattery = drone.battery_level - 20;
      if (usableBattery <= 0)
        return res
          .status(400)
          .json({
            error: `🚨 Борт розряджений (${drone.battery_level}%). Зліт заблоковано.`,
          });

      const maxAllowedDistance = (usableBattery / 80) * 15000;
      if (totalRoundTripDistance > maxAllowedDistance)
        return res.status(400).json({
          error: `🚨 Запас енергії недостатній для повернення! Потрібно: ${Math.round(
            totalRoundTripDistance
          )}м, ліміт при ${drone.battery_level}%: ${Math.round(
            maxAllowedDistance
          )}м (із 20% резервом).`,
        });

      const weatherStatus = await getFlightWeather(
        startCoords[0],
        startCoords[1]
      );
      if (!weatherStatus.isSafe)
        return res
          .status(400)
          .json({
            error: `☁️ Погодні умови несприятливі: ${weatherStatus.reason}`,
          });

      await drone.update({ status: "flying" });

      const newOrder = await Order.create({
        restaurant_id,
        delivery_lat,
        delivery_lng,
        total_price,
        total_weight,
        status: "flying",
      });

      await Mission.create({
        order_id: newOrder.id,
        drone_id: drone.id,
        route_geojson: { type: "LineString", coordinates: safeWaypoints },
        operating_altitude: 90,
      });

      simulateFlight(newOrder.id, safeWaypoints, false, drone.id);
      await logEvent(
        "INFO",
        `Місія #${String(newOrder.id).substring(0, 8)}: запущено. БПЛА "${
          drone.model_name
        }" вилетів з "${restaurant.name}". Вага: ${total_weight}г, заряд: ${
          drone.battery_level
        }%.`,
        "DISPATCHER"
      );
      res.status(201).json({ order: newOrder, waypoints: safeWaypoints });
    } catch (error) {
      console.error("Помилка створення місії:", error);
      res.status(500).json({ error: "Помилка при створенні місії" });
    }
  }
);

app.patch("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order)
      return res.status(404).json({ error: "Замовлення не знайдено" });
    await order.update({ status });
    res.json({ message: "Статус замовлення оновлено", order });
  } catch (error) {
    console.error("Помилка оновлення замовлення:", error);
    res.status(500).json({ error: "Помилка оновлення статусу замовлення" });
  }
});

app.post(
  "/api/orders/:id/recall",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const order = await Order.findByPk(req.params.id, {
        include: [{ model: Mission }],
      });
      if (!order)
        return res.status(404).json({ error: "Замовлення не знайдено" });

      if (!["flying", "en_route", "delivering"].includes(order.status)) {
        return res
          .status(400)
          .json({
            error:
              "Місію неможливо скасувати — вона вже завершена або не активна",
          });
      }

      const mission = order.Mission;
      if (!mission) return res.status(404).json({ error: "Місію не знайдено" });

      if (activeFlightIntervals[order.id]) {
        clearInterval(activeFlightIntervals[order.id]);
        delete activeFlightIntervals[order.id];
      }

      await order.update({ status: "recalled" });
      await Drone.update(
        { status: "idle" },
        { where: { id: mission.drone_id } }
      );

      io.emit("mission_recalled", { orderId: order.id });

      await logEvent(
        "WARNING",
        `Місія #${String(order.id).substring(
          0,
          8
        )}: скасована оператором. БПЛА звільнено.`,
        "OPERATOR"
      );

      res.json({
        message: "Місію скасовано, дрон звільнено",
        orderId: order.id,
      });
    } catch (error) {
      console.error("Помилка відкликання дрона:", error);
      res.status(500).json({ error: "Помилка відкликання дрона" });
    }
  }
);

app.get("/api/drones", authMiddleware, async (req, res) => {
  try {
    const drones = await Drone.findAll({
      order: [["model_name", "ASC"]],
      include: [{ model: Restaurant, as: "base", attributes: ["id", "name"] }],
    });
    res.json(drones);
  } catch (error) {
    console.error("Помилка отримання авіапарку:", error);
    res.status(500).json({ error: "Помилка зчитування авіапарку БПЛА" });
  }
});

app.post(
  "/api/drones",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const { model_name, status, battery_level, restaurant_id } = req.body;

      if (restaurant_id) {
        const rest = await Restaurant.findByPk(restaurant_id);
        if (!rest)
          return res.status(404).json({ error: "Ресторан-базу не знайдено" });
      }

      const newDrone = await Drone.create({
        model_name: model_name || "DJI Matrice 300 RTK",
        status: status || "idle",
        battery_level: battery_level ?? 100,
        restaurant_id: restaurant_id || null,
      });
      res.status(201).json(newDrone);
    } catch (error) {
      console.error("Помилка додавання БПЛА:", error);
      res.status(500).json({ error: "Помилка додавання БПЛА до авіапарку" });
    }
  }
);

app.patch(
  "/api/drones/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const drone = await Drone.findByPk(req.params.id);
      if (!drone)
        return res
          .status(404)
          .json({ error: "Безпілотний апарат не знайдено" });

      if (drone.status === "flying")
        return res
          .status(400)
          .json({ error: "🚨 Заборонено змінювати БПЛА під час польоту!" });

      const { status, restaurant_id } = req.body;
      const updates = {};

      if (status !== undefined) updates.status = status;
      if (restaurant_id !== undefined) {
        // Дозволяємо null для відв'язки від бази
        if (restaurant_id !== null) {
          const rest = await Restaurant.findByPk(restaurant_id);
          if (!rest)
            return res.status(404).json({ error: "Ресторан-базу не знайдено" });
        }
        updates.restaurant_id = restaurant_id;
      }

      await drone.update(updates);
      const updated = await Drone.findByPk(drone.id, {
        include: [
          { model: Restaurant, as: "base", attributes: ["id", "name"] },
        ],
      });

      if (status !== undefined) {
        const levelMap = {
          retired: "WARNING",
          maintenance: "INFO",
          idle: "INFO",
        };
        await logEvent(
          levelMap[status] || "INFO",
          `БПЛА "${drone.model_name}" (борт ${String(drone.id).substring(
            0,
            8
          )}): статус змінено з "${drone.status}" на "${status}" оператором.`,
          "FLEET"
        );
      }

      res.json({ message: "БПЛА успішно оновлено", drone: updated });
    } catch (error) {
      console.error("Помилка оновлення БПЛА:", error);
      res
        .status(500)
        .json({ error: "Внутрішня помилка модуля диспетчеризації БПЛА" });
    }
  }
);

app.delete(
  "/api/drones/:id",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const drone = await Drone.findByPk(req.params.id);
      if (!drone) return res.status(404).json({ error: "БПЛА не знайдено" });
      if (drone.status === "flying")
        return res
          .status(400)
          .json({ error: "🚨 Неможливо видалити БПЛА під час польоту!" });

      await drone.destroy();
      await logEvent(
        "WARNING",
        `БПЛА "${drone.model_name}" (борт ${String(drone.id).substring(
          0,
          8
        )}): видалено з авіапарку оператором.`,
        "FLEET"
      );
      res.json({ message: "БПЛА успішно видалено" });
    } catch (error) {
      console.error("Помилка видалення БПЛА:", error);
      res.status(500).json({ error: "Помилка видалення БПЛА" });
    }
  }
);

// Фонова зарядка idle-дронів
setInterval(async () => {
  try {
    const chargingDrones = await Drone.findAll({
      where: { status: "idle", battery_level: { [Op.lt]: 100 } },
    });
    for (const drone of chargingDrones) {
      const newBattery = Math.min(100, drone.battery_level + 1);
      await drone.update({ battery_level: newBattery });
      io.emit("drone_battery_changed", {
        droneId: drone.id,
        battery_level: newBattery,
      });
    }
  } catch (error) {
    console.error("❌ Помилка підсистеми заряджання БПЛА:", error);
  }
}, 3000);

app.get(
  "/api/events",
  authMiddleware,
  roleCheck("operator"),
  async (req, res) => {
    try {
      const events = await EventLog.findAll({
        order: [["createdAt", "DESC"]],
        limit: 200,
      });
      res.json(events);
    } catch (error) {
      console.error("Помилка отримання журналу подій:", error);
      res.status(500).json({ error: "Помилка отримання журналу подій" });
    }
  }
);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("🔌 Базу даних PostgreSQL успішно підключено.");
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");

    // Сирий SQL для додавання нового значення в ENUM PostgreSQL без видалення таблиці
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
            WHERE pg_type.typname = 'enum_Drones_status'
            AND pg_enum.enumlabel = 'retired'
          ) THEN
            ALTER TYPE "enum_Drones_status" ADD VALUE 'retired';
          END IF;
        END$$;
      `);
      console.log("✓ ENUM enum_Drones_status перевірено (retired).");
    } catch (enumError) {
      console.warn("⚠️ ENUM вже актуальний:", enumError.message);
    }

    await sequelize.sync({ alter: true });
    await seedDatabase();
    server.listen(5001, () => {
      console.log("🚀 Сервер FoodSky запущено на порту 5001");
    });
  } catch (error) {
    console.error("❌ Не вдалося запустити сервер:", error);
  }
}

startServer();
