import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import api from "@/server/constants/api";

// axios is a true external (network) — mock the whole module.
vi.mock("axios", () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
}));

const mockedAxios = vi.mocked(axios, true);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("api", () => {
	it("get delegates to axios.get with url and options and returns its response", async () => {
		const response = { status: 200, data: { ok: true } };
		mockedAxios.get.mockResolvedValueOnce(response);
		const options = { headers: { Authorization: "Bearer t" } };

		const result = await api().get("https://example.test/x", options);

		expect(mockedAxios.get).toHaveBeenCalledExactlyOnceWith(
			"https://example.test/x",
			options,
		);
		expect(result).toBe(response);
	});

	it("post forwards url, body and options", async () => {
		const response = { status: 201, data: { id: "1" } };
		mockedAxios.post.mockResolvedValueOnce(response);

		const result = await api().post("https://example.test/x", { a: 1 });

		expect(mockedAxios.post).toHaveBeenCalledExactlyOnceWith(
			"https://example.test/x",
			{ a: 1 },
			undefined,
		);
		expect(result).toBe(response);
	});

	it("patch forwards url, body and options", async () => {
		const response = { status: 200, data: {} };
		mockedAxios.patch.mockResolvedValueOnce(response);
		const options = { timeout: 5000 };

		const result = await api().patch(
			"https://example.test/x",
			{ b: 2 },
			options,
		);

		expect(mockedAxios.patch).toHaveBeenCalledExactlyOnceWith(
			"https://example.test/x",
			{ b: 2 },
			options,
		);
		expect(result).toBe(response);
	});

	it("delete delegates to axios.delete", async () => {
		const response = { status: 204, data: null };
		mockedAxios.delete.mockResolvedValueOnce(response);

		const result = await api().delete("https://example.test/x");

		expect(mockedAxios.delete).toHaveBeenCalledExactlyOnceWith(
			"https://example.test/x",
			undefined,
		);
		expect(result).toBe(response);
	});

	it("propagates axios rejections to the caller", async () => {
		const boom = new Error("network down");
		mockedAxios.get.mockRejectedValueOnce(boom);
		await expect(api().get("https://example.test/x")).rejects.toBe(boom);
	});
});
