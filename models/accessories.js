import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const Accessories = DB.define(
  "accessories",
  {
    // name: {
    //   type: DataTypes.STRING,
    //   defaultValue: null,
    // },
    accessories_type: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    accessories_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  },
  {
    freezeTableName: true,
    paranoid: true,
  },
);

export default Accessories;
