import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const selectedBox = DB.define(
    "selected_box",
    {
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
        total_harga: {
            type: DataTypes.INTEGER,
            defaultValue: null,
        },
        draft_id: {
            type: DataTypes.INTEGER,
            defaultValue: null,
        },
    },
    {
        freezeTableName: true,
        paranoid: true,
    },
);

export default selectedBox;
