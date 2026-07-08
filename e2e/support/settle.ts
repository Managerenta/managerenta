import type { Page } from "@playwright/test";

/**
 * Wait until the page has no in-flight `/api/*` requests for a short quiet
 * window.
 *
 * After login the app shell (BodyWrapper, Navbar, sidebar, dashboard) fires a
 * burst of authenticated GETs. Every authenticated request resolves the user
 * via `resolveOrgScope` → `getUserById`, which populates a shared cache. If a
 * test mutates the user while one of those reads is still in flight, the slow
 * read can write its pre-mutation snapshot back into the cache *after* the
 * mutation invalidated it — so a subsequent profile read sees stale data.
 *
 * Draining those background reads before the test mutates closes that window
 * deterministically. `networkidle` is unreliable under Next dev because the
 * HMR socket keeps the connection busy, so we track `/api/` requests
 * ourselves.
 */
export async function waitForApiIdle(
	page: Page,
	{ quietMs = 600, timeoutMs = 15_000 }: { quietMs?: number; timeoutMs?: number } = {},
): Promise<void> {
	let inFlight = 0;
	let lastActivity = Date.now();

	const onRequest = (req: import("@playwright/test").Request) => {
		if (req.url().includes("/api/")) {
			inFlight += 1;
			lastActivity = Date.now();
		}
	};
	const onSettled = (req: import("@playwright/test").Request) => {
		if (req.url().includes("/api/")) {
			inFlight = Math.max(0, inFlight - 1);
			lastActivity = Date.now();
		}
	};

	page.on("request", onRequest);
	page.on("requestfinished", onSettled);
	page.on("requestfailed", onSettled);

	try {
		const deadline = Date.now() + timeoutMs;
		// Poll until we've seen `quietMs` with zero in-flight requests.
		while (Date.now() < deadline) {
			if (inFlight === 0 && Date.now() - lastActivity >= quietMs) return;
			await page.waitForTimeout(100);
		}
	} finally {
		page.off("request", onRequest);
		page.off("requestfinished", onSettled);
		page.off("requestfailed", onSettled);
	}
}
