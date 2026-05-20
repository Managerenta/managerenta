import axios, { type AxiosRequestConfig } from "axios";
import { ADMIN_API_KEY } from "./environments";
import isOriginAllowed from "./isOriginAllowed";

export default function api() {
	const baseOptions: AxiosRequestConfig = {};

	const addAuthHeaders = (url: string, options?: AxiosRequestConfig) => {
		const isClientApp = isOriginAllowed(`https://${new URL(url).hostname}`);

		return {
			...options,
			headers: {
				...baseOptions.headers,
				...options?.headers,
				...(isClientApp && { "x-api-key": ADMIN_API_KEY }),
			},
		};
	};

	return {
		get: async (url: string, options?: AxiosRequestConfig) => {
			const config = addAuthHeaders(url, options);
			return await axios.get(url, config);
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		post: async (url: string, data?: any, options?: AxiosRequestConfig) => {
			const config = addAuthHeaders(url, options);
			return await axios.post(url, data, config);
		},
		patch: async (
			url: string,
			data?: unknown,
			options?: AxiosRequestConfig,
		) => {
			const config = addAuthHeaders(url, options);
			return await axios.patch(url, data, config);
		},
		delete: async (url: string, options?: AxiosRequestConfig) => {
			const config = addAuthHeaders(url, options);
			return await axios.delete(url, config);
		},
	};
}
