import axios, { type AxiosRequestConfig } from "axios";

const axiosClient = axios.create({
	withCredentials: true,
});

// axiosClient.defaults.headers.common["Accept"] = "application/json";
// axiosClient.defaults.headers.common["Content-Type"] = "application/json";
// axiosClient.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
// axiosClient.defaults.headers.common["X-Requested-Store"] = "default";

const api = () => {
	return {
		get: async (url: string, options?: AxiosRequestConfig) => {
			return await axiosClient.get(url, options);
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		post: async (url: string, data?: any, options?: AxiosRequestConfig) => {
			return await axiosClient.post(url, data, options);
		},
		patch: async (
			url: string,
			data?: unknown,
			options?: AxiosRequestConfig,
		) => {
			return await axiosClient.patch(url, data, options);
		},
		delete: async (url: string, options?: AxiosRequestConfig) => {
			return await axiosClient.delete(url, options);
		},
	};
};

export default api;
