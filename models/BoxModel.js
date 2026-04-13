import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const BoxModel = DB.define(
  "list_box",
  {
    // name: {
    //   type: DataTypes.STRING,
    //   defaultValue: null,
    // },
    nama_panel: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    ukuran_panel: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    harga_panel: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    harga_wiring: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    // status: {
    //   type: DataTypes.STRING,
    //   defaultValue: null,
    // },
    // department: {
    //   type: DataTypes.STRING,
    //   defaultValue: null,
    // },
  },
  {
    freezeTableName: true,
    paranoid: true,
  },
);

export default BoxModel;
