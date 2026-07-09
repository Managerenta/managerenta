import mongoose from "mongoose";

// Runs ONCE in the main vitest process — before any worker spawns, and again
// after the whole run finishes.
//
// The per-file afterAll in tests/setup.ts drops each worker's scratch DB on
// the happy path, but that net has holes: a worker killed between files, a DB
// recreated by a later file after an earlier drop, or a test that opens its
// own connection all leave `managerenta-vitest-*` databases behind. Over many
// runs they pile up (we cleaned out 400+ once).
//
// This is the guaranteed backstop. We stamp every scratch DB this run creates
// with a per-run id (the main process pid — unique per `vitest run`, inherited
// by forked workers via the environment) and, on teardown, drop every database
// that carries THIS run's id. Scoping to the run id — instead of a blanket
// "drop all managerenta-vitest-*" — keeps concurrent runs (parallel CI shards,
// multiple agents) from wiping each other's live test data.
export default function setup(): () => Promise<void> {
	const runId = String(process.pid);
	// Forked workers inherit this, so tests/setup.ts can embed it in DB_NAME.
	process.env.VITEST_RUN_ID = runId;

	return async () => {
		const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
		const prefix = `managerenta-vitest-${runId}-`;

		const conn = await mongoose.createConnection(uri).asPromise();
		try {
			const admin = conn.getClient().db().admin();
			const { databases } = await admin.listDatabases({
				nameOnly: true,
			});
			const targets = databases
				.map((d) => d.name)
				.filter((name) => name.startsWith(prefix));

			await Promise.all(
				targets.map((name) =>
					conn
						.useDb(name)
						.dropDatabase()
						.catch(() => {}),
				),
			);

			if (targets.length) {
				console.log(
					`[globalTeardown] dropped ${targets.length} scratch DB(s) for run ${runId}`,
				);
			}
		} finally {
			await conn.close();
		}
	};
}
