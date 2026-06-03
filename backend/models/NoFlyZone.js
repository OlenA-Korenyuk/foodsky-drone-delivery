const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const NoFlyZone = sequelize.define(
  "NoFlyZone",
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
    polygon: {
      type: DataTypes.GEOMETRY("POLYGON", 4326),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "no_fly_zones",
    timestamps: false,
  }
);

module.exports = NoFlyZone;
