import axios, { type AxiosRequestConfig } from "axios";

export default function api() {
	return {
		get: async (url: string, options?: AxiosRequestConfig) => {
			return await axios.get(url, options);
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		post: async (url: string, data?: any, options?: AxiosRequestConfig) => {
			return await axios.post(url, data, options);
		},
		patch: async (
			url: string,
			data?: unknown,
			options?: AxiosRequestConfig,
		) => {
			return await axios.patch(url, data, options);
		},
		delete: async (url: string, options?: AxiosRequestConfig) => {
			return await axios.delete(url, options);
		},
	};
}
