import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const Users = DB.define(
  "users",
  {
    name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    email: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    password: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    nik: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    android_id: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    department: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  },
  {
    freezeTableName: true,
    paranoid: true,
  }
);

export default Users;
