const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Drone = sequelize.define("Drone", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  model_name: {
    type: DataTypes.STRING,
    defaultValue: "DJI Matrice 300 RTK",
  },
  status: {
    type: DataTypes.ENUM("idle", "flying", "maintenance", "retired"),
    defaultValue: "idle",
  },
  battery_level: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },
  max_payload_g: {
    type: DataTypes.INTEGER,
    defaultValue: 2000,
  },
  // Ресторан-база — звідси дрон злітає і туди повертається
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: true, // null = "Без бази" (не призначено)
  },
});

module.exports = Drone;
