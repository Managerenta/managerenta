import "server-only";
import cron from "../constants/cron";
import { connectMongoDB, disconnectMongoDB } from "../databases";
import { disconnectRedis } from "../databases/redis";

declare global {
	// eslint-disable-next-line no-var
	var __managerentaBootstrapped: boolean | undefined;
}

export async function bootstrap(): Promise<void> {
	if (global.__managerentaBootstrapped) return;
	global.__managerentaBootstrapped = true;

	try {
		await connectMongoDB();
	} catch (error) {
		console.error("[bootstrap] MongoDB connect failed:", error);
	}

	try {
		await cron();
	} catch (error) {
		console.error("[bootstrap] Cron init failed:", error);
	}

	const shutdown = async () => {
		try {
			await disconnectMongoDB();
		} catch {
			// no-op
		}
		try {
			await disconnectRedis();
		} catch {
			// no-op
		}
	};

	process.once("SIGINT", () => {
		shutdown().finally(() => process.exit(0));
	});
	process.once("SIGTERM", () => {
		shutdown().finally(() => process.exit(0));
	});
}
