import client, { collectDefaultMetrics } from "prom-client";

declare global {
	// eslint-disable-next-line no-var
	var __managerentaMetricsInit: boolean | undefined;
	// eslint-disable-next-line no-var
	var __managerentaRestHistogram: client.Histogram<string> | undefined;
	// eslint-disable-next-line no-var
	var __managerentaDbHistogram: client.Histogram<string> | undefined;
}

if (!global.__managerentaMetricsInit) {
	collectDefaultMetrics();
	global.__managerentaMetricsInit = true;
}

export const restResponseTimeHistogram: client.Histogram<string> =
	global.__managerentaRestHistogram ??
	new client.Histogram({
		name: "http_request_duration_seconds",
		help: "Duration of HTTP requests in seconds",
		labelNames: ["ip", "method", "route", "status_code"],
	});

if (!global.__managerentaRestHistogram) {
	global.__managerentaRestHistogram = restResponseTimeHistogram;
}

export const databaseResponseTimeHistogram: client.Histogram<string> =
	global.__managerentaDbHistogram ??
	new client.Histogram({
		name: "database_request_duration_seconds",
		help: "Duration of database requests in seconds",
		labelNames: ["operation", "collection", "method", "success"],
	});

if (!global.__managerentaDbHistogram) {
	global.__managerentaDbHistogram = databaseResponseTimeHistogram;
}

export async function renderMetrics(): Promise<{
	contentType: string;
	body: string;
}> {
	return {
		contentType: client.register.contentType,
		body: await client.register.metrics(),
	};
}
