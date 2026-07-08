/**
 * Run the one-time org role → IAM membership migration.
 *
 * Safe to re-run (memberships upsert). Pass `--dry-run` to report what would be
 * written without touching the IAM collections — do this first and eyeball the
 * counts before committing.
 *
 * Usage:
 *   yarn iam:migrate --dry-run
 *   yarn iam:migrate
 */
import mongoose from "mongoose";
import { connectMongoDB } from "../src/server/databases";
import { migrateRolesToIam } from "../src/server/iam";

async function run(): Promise<void> {
	const dryRun = process.argv.slice(2).includes("--dry-run");

	console.log(
		dryRun
			? "Connecting to MongoDB (DRY RUN — no writes)…"
			: "Connecting to MongoDB…",
	);
	await connectMongoDB();

	const report = await migrateRolesToIam({ dryRun });

	console.log("\nMigration report:");
	console.log(`  organizations: ${report.organizations}`);
	console.log(`  owners joined OrgAdmin: ${report.owners}`);
	console.log(`  members mapped: ${report.members}`);
	console.log(`  skipped: ${report.skipped}`);
	console.log(`  dryRun: ${report.dryRun}`);

	await mongoose.disconnect();
}

run()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(String(err?.message ?? err));
		process.exit(1);
	});
