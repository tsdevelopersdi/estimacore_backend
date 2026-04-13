import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const APIUsageGroup = DB.define(
    "api_usage_group",
    {
        group_name: {
            type: DataTypes.STRING,
            defaultValue: null,
        },
        api_usage_total_SLD: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        api_usage_total_Prices: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        api_usage_total_Box: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        api_limit_SLD: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        api_limit_Prices: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        api_limit_Box: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    },
    {
        freezeTableName: true,
        paranoid: true,
    },
);

export default APIUsageGroup;
