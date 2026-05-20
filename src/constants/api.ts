import axios, { type AxiosRequestConfig } from "axios";

const axiosClient = axios.create({
	withCredentials: true,
});

axiosClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (typeof window !== "undefined" && error?.response?.status === 401) {
			if (window.location.pathname !== "/login") {
				window.location.href = "/login";
			}
		}
		return Promise.reject(error);
	},
);

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
