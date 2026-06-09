import { seedRoles } from "./roles";
import { seedAuditLogs } from "./audit-logs";

async function runAll() {
  console.log("Running seeds...");
  await seedRoles();
  await seedAuditLogs();
  console.log("All seeds complete");
}

runAll().catch(console.error);
