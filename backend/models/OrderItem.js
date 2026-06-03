const { DataTypes } = require("sequelize");

const sequelize = require("../db");

const Order = sequelize.define(
  "Order",

  {
    id: {
      type: DataTypes.UUID,

      defaultValue: DataTypes.UUIDV4,

      primaryKey: true,
    },

    delivery_lat: {
      type: DataTypes.FLOAT,

      allowNull: false,
    },

    delivery_lng: {
      type: DataTypes.FLOAT,

      allowNull: false,
    },

    total_price: {
      type: DataTypes.DECIMAL(10, 2),

      allowNull: false,
    },

    total_weight: {
      type: DataTypes.INTEGER,

      allowNull: false,
    },

    status: {
      type: DataTypes.STRING(50),

      defaultValue: "pending", // Статуси: pending , flying , delivered
    },
  },

  {
    tableName: "orders",

    timestamps: true,
  }
);

module.exports = Order;
