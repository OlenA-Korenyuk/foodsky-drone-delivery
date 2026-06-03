const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
  }
);

const User = sequelize.define(
  "User",
  {
    username: { type: DataTypes.STRING },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Успішно підключено до БД!");

    const [updatedRows] = await User.update(
      { username: "operator_kyiv" },
      { where: { username: "operator_kiev" } }
    );

    console.log(`Готово! Оновлено записів: ${updatedRows}`);
  } catch (error) {
    console.error("Помилка:", error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

run();
