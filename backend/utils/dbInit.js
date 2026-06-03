const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const NoFlyZone = require("../models/NoFlyZone");
const Drone = require("../models/Drone");

async function seedDatabase() {
  try {
    console.log("Перевірка наявності системних даних у базі даних...");

    // 1. Ініціалізація авіапарку БПЛА
    const droneCount = await Drone.count();
    if (droneCount === 0) {
      await Drone.bulkCreate([
        {
          model_name: "DJI Matrice 300 RTK - Борт №01",
          status: "idle",
          battery_level: 100,
        },
        {
          model_name: "DJI Matrice 300 RTK - Борт №02",
          status: "idle",
          battery_level: 95,
        },
        {
          model_name: "DJI Matrice 300 RTK - Борт №03",
          status: "idle",
          battery_level: 40,
        },
      ]);
      console.log("Авіапарк БПЛА (DJI Enterprise) ініціалізовано.");
    }

    // 2. Ініціалізація користувачів (якщо порожньо)
    const userCount = await User.count();
    if (userCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("password123", salt);

      await User.bulkCreate([
        {
          username: "operator_kiyv",
          email: "operator@foodsky.com",
          password_hash: hashedPassword,
          role: "operator",
          first_name: "Олексій",
          last_name: "Гончаренко",
          phone_number: "+380441112233",
        },
        {
          username: "olena_client",
          email: "olena@gmail.com",
          password_hash: hashedPassword,
          role: "client",
          first_name: "Олена",
          last_name: "Коренюк",
          phone_number: "+380991234567",
        },
      ]);
      console.log("Тестові профілі користувачів (RBAC) створено.");
    }

    // 3. Ініціалізація ресторанів-партнерів та їх меню
    const restaurantCount = await Restaurant.count();
    if (restaurantCount === 0) {
      const burgerSky = await Restaurant.create({
        name: "Burger Sky",
        location: { lat: 50.4501, lng: 30.5234 },
      });

      const sushiDrone = await Restaurant.create({
        name: "Sushi Drone",
        location: { lat: 50.4485, lng: 30.5135 }, // Безпечна зона
      });

      await MenuItem.bulkCreate([
        {
          restaurant_id: burgerSky.id,
          name: "Чизбургер XL",
          price: 120.0,
          weight_grams: 300,
        },
        {
          restaurant_id: burgerSky.id,
          name: "Картопля фрі",
          price: 60.0,
          weight_grams: 150,
        },
        {
          restaurant_id: sushiDrone.id,
          name: "Сет Філадельфія",
          price: 450.0,
          weight_grams: 800,
        },
        {
          restaurant_id: sushiDrone.id,
          name: "Місо суп",
          price: 90.0,
          weight_grams: 350,
        },
      ]);
      console.log("Мережу ресторанів та вагові параметри страв завантажено.");
    }

    // 4. Ініціалізація просторових зон заборони польотів PostGIS
    const nfzCount = await NoFlyZone.count();
    if (nfzCount === 0) {
      await NoFlyZone.bulkCreate([
        {
          name: "Урядовий квартал (Печерськ) - Зона А",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [30.523, 50.447],
                [30.539, 50.447],
                [30.539, 50.44],
                [30.523, 50.44],
                [30.523, 50.447],
              ],
            ],
          },
        },
        {
          name: "Охоронна зона Володимирська гірка - Зона Б",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [30.52, 50.458],
                [30.533, 50.458],
                [30.533, 50.452],
                [30.52, 50.452],
                [30.52, 50.458],
              ],
            ],
          },
        },
        {
          name: "Посольський квартал",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [30.518, 50.451],
                [30.522, 50.451],
                [30.522, 50.445],
                [30.518, 50.445],
                [30.518, 50.451],
              ],
            ],
          },
        },
        {
          name: "ТЕЦ-5 (Критична інфраструктура)",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [30.55, 50.41],
                [30.57, 50.41],
                [30.57, 50.39],
                [30.55, 50.39],
                [30.55, 50.41],
              ],
            ],
          },
        },
      ]);
      console.log("Просторові бар'єри No-Fly Zones імпортовано в PostGIS.");
    }
  } catch (error) {
    console.error("Помилка заповнення бази даних:", error.message);
  }
}

module.exports = { seedDatabase };
