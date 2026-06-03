const { Sequelize } = require("sequelize");
require("dotenv").config();

// Налаштування підключення до PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false, // щоб термінал не засмічувався SQL-запитами
  }
);

module.exports = sequelize;
