import { Sequelize } from "sequelize";
import DB from "../config/Database.js";
import Users from "./UserModel.js";


const { DataTypes } = Sequelize;

const Presensi = DB.define(
  "presensi",
  {
    id_kelas: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    id_siswa: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    tanggal: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    foto: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    email: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    timestamp: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    latitude: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    longitude: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    accuracy: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    photo: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    id_user: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    caption: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    job_type: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  },
  {
    freezeTableName: true,
    paranoid: true,
  }
);

// Siswa.hasMany(Presensi);
// Presensi.belongsTo(Siswa);
// Kelas.hasMany(Presensi);
// Presensi.belongsTo(Kelas);

Presensi.belongsTo(Users, { foreignKey: "id_user" });


export default Presensi;
