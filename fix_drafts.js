import DB from "./config/Database.js";
import ProjectModel from "./models/ProjectModel.js";
import sld_draft_name from "./models/sld_draft.js";

async function fixDrafts() {
    try {
        console.log("Starting draft repair...");
        const drafts = await sld_draft_name.findAll({
            where: { project_id: null }
        });

        console.log(`Found ${drafts.length} drafts with null project_id.`);

        for (const draft of drafts) {
            const project = await ProjectModel.findOne({
                where: { project_name: draft.project_name }
            });

            if (project) {
                await draft.update({ project_id: project.id });
                console.log(`Updated draft "${draft.draft_name}" with project ID ${project.id} (matched name: ${draft.project_name})`);
            } else {
                console.log(`Could not find project matching name: "${draft.project_name}" for draft "${draft.draft_name}"`);
            }
        }

        console.log("Draft repair completed.");
        process.exit(0);
    } catch (error) {
        console.error("Error during repair:", error);
        process.exit(1);
    }
}

fixDrafts();
