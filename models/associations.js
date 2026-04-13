/**
 * Model associations - loaded after models to avoid circular dependency.
 */
import ProjectModel from "./ProjectModel.js";
import sld_draft_name from "./sld_draft.js";
import sld_draft from "./DraftModel.js";
import Users from "./UserModel.js";
import invoice from "./invoiceModel.js";
import transaction from "./transactionModel.js";
import APIUsageGroup from "./api_ussage_group.js";
import APIUsageIndividual from "./api_ussage_individual.js";

sld_draft_name.belongsTo(ProjectModel, { foreignKey: "project_id" });
ProjectModel.hasMany(sld_draft_name, { foreignKey: "project_id" });

// TODO: Add draft_id foreign key once the column is added to sld_draft table
// sld_draft.belongsTo(sld_draft_name, { foreignKey: "draft_id" });
// sld_draft_name.hasMany(sld_draft, { foreignKey: "draft_id" });

invoice.belongsTo(Users, { foreignKey: "id_user" });
Users.hasMany(invoice, { foreignKey: "id_user" });

transaction.belongsTo(invoice, { foreignKey: "invoice_id" });
invoice.hasMany(transaction, { foreignKey: "invoice_id" });

APIUsageIndividual.belongsTo(APIUsageGroup, { foreignKey: "id_api_group" });
APIUsageGroup.hasMany(APIUsageIndividual, { foreignKey: "id_api_group" });
