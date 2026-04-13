import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const transaction = DB.define(
  "transactions",
  {
    invoice_id: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    id_user: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    tanggal: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    merchant: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    kategori: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    jumlah: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
  },
  {
    freezeTableName: true,
    paranoid: true,
  }
);

export default transaction;
