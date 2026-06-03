const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Telemetry = sequelize.define("Telemetry", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  drone_id: { type: DataTypes.UUID, allowNull: false },
  telemetry_data: { type: DataTypes.JSONB, allowNull: false },
});

module.exports = Telemetry;
