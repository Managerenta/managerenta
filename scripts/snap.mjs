/**
 * Quick screenshot capture for design review.
 *   node scripts/snap.mjs [label]
 * Saves PNGs under .design-snaps/<label>/<page>.png
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.SNAP_BASE_URL ?? "http://localhost:3000";
const LABEL = process.argv[2] ?? "snapshot";
const OUT = join(process.cwd(), ".design-snaps", LABEL);
const VIEWPORT = { width: 1440, height: 900 };

const PUBLIC_PAGES = [
	{ name: "01-landing", path: "/" },
	{ name: "02-login", path: "/login" },
	{ name: "03-signup", path: "/signup" },
	{ name: "04-forgot", path: "/forgot-password" },
	{ name: "05-reset", path: "/reset-password" },
];

const AUTHED_PAGES = [
	{ name: "10-dashboard", path: "/dashboard" },
	{ name: "11-properties", path: "/properties" },
	{ name: "12-tenants", path: "/tenants" },
	{ name: "13-notifications", path: "/notifications" },
	{ name: "14-settings", path: "/settings" },
];

const CREDS = {
	email: process.env.SNAP_EMAIL ?? "abdullah@example.com",
	password: process.env.SNAP_PASSWORD ?? "password123",
};

mkdirSync(OUT, { recursive: true });
console.log(`→ snapping into ${OUT}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: VIEWPORT,
	deviceScaleFactor: 2,
});
const page = await ctx.newPage();

async function snap(name, path, { waitForSelector } = {}) {
	const url = `${BASE}${path}`;
	process.stdout.write(`  ${name.padEnd(20)} ${url} `);
	try {
		const res = await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		if (waitForSelector) {
			await page
				.waitForSelector(waitForSelector, { timeout: 10000 })
				.catch(() => {});
		}
		await page.waitForTimeout(1200); // allow fonts + transitions
		await page.screenshot({
			path: join(OUT, `${name}.png`),
			fullPage: true,
		});
		console.log(`✓ ${res?.status() ?? "?"}`);
	} catch (err) {
		console.log(`✗ ${err.message.split("\n")[0]}`);
	}
}

for (const p of PUBLIC_PAGES) {
	await snap(p.name, p.path);
}

// Try to log in
try {
	console.log("  logging in…");
	await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
	await page.fill('input[type="email"], input[name="email"]', CREDS.email);
	await page.fill(
		'input[type="password"], input[name="password"]',
		CREDS.password,
	);
	await Promise.all([
		page
			.waitForURL(/\/dashboard|\/properties|\/$/, { timeout: 15000 })
			.catch(() => {}),
		page.click('button[type="submit"]'),
	]);
	await page.waitForTimeout(1500);
	const url = page.url();
	if (url.includes("/login")) {
		console.log("  ✗ login appears to have failed — skipping authed pages");
	} else {
		console.log(`  ✓ logged in (${url})`);
		for (const p of AUTHED_PAGES) {
			await snap(p.name, p.path);
		}
	}
} catch (err) {
	console.log(`  ✗ login error: ${err.message.split("\n")[0]}`);
}

await browser.close();
console.log("done.");
