const jwt = require("jsonwebtoken");

// Секретний ключ для підпису токенів
const JWT_SECRET = "foodsky_super_secret_key_123";

// Фільтр авторизації: перевіряє, чи є в клієнта дійсний токен
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Очікуємо формат: "Bearer ТОКЕН"

  if (!token) {
    return res
      .status(401)
      .json({ error: "Доступ заборонено. Токен відсутній." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Записуємо розшифровані дані (id, role, username) в об'єкт запиту
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ error: "Недійсний або протермінований токен." });
  }
};

// Фільтр ролей: перевіряє, чи має користувач відповідний рівень доступу
const roleCheck = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        error: `🚨 Помилка доступу: Ця операція дозволена тільки для ролі [${requiredRole}]!`,
      });
    }
    next();
  };
};

module.exports = { authMiddleware, roleCheck, JWT_SECRET };
