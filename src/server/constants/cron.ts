import { CronJob } from "cron";
import { removeExpiredUsersTokens } from "../services";

declare global {
	// eslint-disable-next-line no-var
	var __managerentaCronInit: boolean | undefined;
}

export default async function cron(): Promise<void> {
	if (global.__managerentaCronInit) return;
	global.__managerentaCronInit = true;
	try {
		const thirtyMinutesJobs = new CronJob(
			"*/30 * * * *", // 30 minutes
			async () => {},
			null,
			true,
		);

		const fifteenMinutesJobs = new CronJob(
			"*/15 * * * *", // 15 minutes
			async () => {},
			null,
			true,
		);

		const fiveMinutesJobs = new CronJob(
			"*/5 * * * *", // 5 minutes
			async () => {},
			null,
			true,
		);

		const oneMinuteJobs = new CronJob(
			"*/1 * * * *", // 1 minutes
			async () => {
				removeExpiredUsersTokens();
			},
			null,
			true,
		);

		const tenSecondsJobs = new CronJob(
			"*/10 * * * * *", // 10 seconds
			async () => {},
			null,
			true,
		);

		thirtyMinutesJobs.start();
		fifteenMinutesJobs.start();
		fiveMinutesJobs.start();
		oneMinuteJobs.start();
		tenSecondsJobs.start();
	} catch (_error) {
		return;
	}
}
