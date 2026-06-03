const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const EventLog = sequelize.define("EventLog", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  level: { type: DataTypes.STRING, defaultValue: "INFO" }, // INFO, WARNING, ERROR, CRITICAL
  message: { type: DataTypes.TEXT, allowNull: false },
  component: { type: DataTypes.STRING, defaultValue: "AUTOPILOT" },
});

module.exports = EventLog;
