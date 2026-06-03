const { DataTypes } = require("sequelize");

const sequelize = require("../db");

const Mission = sequelize.define("Mission", {
  id: {
    type: DataTypes.INTEGER,

    autoIncrement: true,

    primaryKey: true,
  },

  order_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },

  drone_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },

  route_geojson: {
    type: DataTypes.GEOMETRY("LINESTRING"),

    allowNull: false,
  },

  operating_altitude: {
    type: DataTypes.INTEGER,

    defaultValue: 90,
  },
});

module.exports = Mission;
