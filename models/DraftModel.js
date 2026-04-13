import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const sld_draft = DB.define(
  "sld_draft",
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
    description: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    brand_merk: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    project: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    draft_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    price: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    disc: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    jumlah: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    harga_rp: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    notes: {
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
  }
);

export default sld_draft;
