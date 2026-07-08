/**
 * Read-only diagnostic: list every platform operator in the database THIS app
 * is configured to use (same env resolution as the server), with the linked
 * user's email + status. Use it to debug "operator account redirects away from
 * /admin" — if your login email is not listed (or status is not `active`), that
 * is why `whoami` returns `operator:false`.
 *
 *   yarn iam:list-operators
 */
import mongoose from "mongoose";
import { connectMongoDB } from "../src/server/databases";
import { listIamOperatorsDB } from "../src/server/iam";
import { getUsersByIdsDB } from "../src/server/models";

/** Hide any credentials embedded in the connection string before printing. */
function redactUri(uri: string): string {
	return uri.replace(/\/\/[^@/]*@/, "//***@");
}

async function run(): Promise<void> {
	await connectMongoDB();

	const operators = await listIamOperatorsDB();
	if (operators.length === 0) {
		console.log("No platform operators exist in this database.");
	} else {
		const users = await getUsersByIdsDB({
			ids: operators.map((o) => o.userId.toString()),
			limit: operators.length,
			offset: 0,
		});
		const byId = new Map(users.map((u) => [u._id.toString(), u]));
		console.log(`Platform operators (${operators.length}):`);
		for (const op of operators) {
			const user = byId.get(op.userId.toString());
			console.log(
				`  - ${user?.email ?? "(no matching user)"}  ` +
					`status=${op.status}  userId=${op.userId.toString()}`,
			);
		}
	}

	console.log(
		`\nDatabase: ${process.env.DB_NAME || "(default from URI)"} @ ` +
			redactUri(process.env.MONGODB_URI || "(unset)"),
	);

	await mongoose.disconnect();
}

run()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(String(err?.message ?? err));
		process.exit(1);
	});
