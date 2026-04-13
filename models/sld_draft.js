import { Sequelize } from "sequelize";
import DB from "../config/Database.js";

const { DataTypes } = Sequelize;

const sld_draft_name = DB.define(
  "sld_draft_name",
  {
    // name: {
    //   type: DataTypes.STRING,
    //   defaultValue: null,
    // },
    draft_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    project_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    project_id: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    is_priced: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    rekomendasi_box: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  },
  {
    freezeTableName: true,
    paranoid: true,
  },
);

export default sld_draft_name;
