import { Sequelize } from "sequelize";

const DB = new Sequelize(
  "dify_auth",
  "postgres",
  "postgres",
  {
    host: "10.28.64.2",
    dialect: "postgres",
    port: 5434,
  }
);

export default DB;
