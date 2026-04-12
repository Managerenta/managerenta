import axios, { type AxiosRequestConfig } from "axios";

const axiosClient = axios.create({
	baseURL: process.env.NEXT_PUBLIC_MAIN_SERVICE_URL || "",
	withCredentials: true,
});

// Normalize auth errors: on 401 from protected routes, bounce to /login.
// Auth endpoints themselves should handle their own 401 (wrong credentials).
axiosClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (typeof window !== "undefined" && error?.response?.status === 401) {
			const requestUrl: string = error?.config?.url ?? "";
			const isAuthRoute = requestUrl.includes("/api/auth/");
			if (!isAuthRoute && window.location.pathname !== "/login") {
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
