import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const invoice = DB.define(
    "invoice",
    {
        nama_invoice: {
            type: DataTypes.STRING,
            defaultValue: null,
        },
        id_user: {
            type: DataTypes.INTEGER,
            defaultValue: null,
        },
        tanggal_upload: {
            type: DataTypes.DATE,
            defaultValue: null,
        },
        total_harga: {
            type: DataTypes.INTEGER,
            defaultValue: null
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: null
        },
    },
    {
        freezeTableName: true,
        paranoid: true,
    }
);

export default invoice;
