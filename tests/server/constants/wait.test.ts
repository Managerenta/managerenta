import { afterEach, describe, expect, it, vi } from "vitest";
import wait from "@/server/constants/wait";

afterEach(() => {
	vi.useRealTimers();
});

describe("wait", () => {
	it("resolves only after the requested number of seconds", async () => {
		vi.useFakeTimers();
		let resolved = false;
		const p = wait(2).then(() => {
			resolved = true;
		});

		await vi.advanceTimersByTimeAsync(1999);
		expect(resolved).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		await p;
		expect(resolved).toBe(true);
	});

	it("converts seconds to milliseconds (0.5s -> 500ms)", async () => {
		vi.useFakeTimers();
		let resolved = false;
		const p = wait(0.5).then(() => {
			resolved = true;
		});

		await vi.advanceTimersByTimeAsync(499);
		expect(resolved).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await p;
		expect(resolved).toBe(true);
	});

	it("resolves immediately for zero seconds", async () => {
		vi.useFakeTimers();
		let resolved = false;
		const p = wait(0).then(() => {
			resolved = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		await p;
		expect(resolved).toBe(true);
	});
});
