const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const MenuItem = sequelize.define(
  "MenuItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    weight_grams: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "menu_items",
    timestamps: true,
  }
);

module.exports = MenuItem;
