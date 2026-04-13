import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const Pricelist = DB.define(
  "pricelist",
  {
    // name: {
    //   type: DataTypes.STRING,
    //   defaultValue: null,
    // },
    qty: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    unit: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    deskripsi: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    tipe: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    merk: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    harga_before_disc: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    disc: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    harga: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    disc_: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    created_by: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    updated_by: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    additional_accessories: {
      type: DataTypes.STRING,
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

export default Pricelist;
