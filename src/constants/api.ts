import axios, { type AxiosRequestConfig } from "axios";

// Public pages that render without a user session. A background 401 (e.g. the
// app shell probing /api/users/user-profile while logged out) must NOT bounce
// visitors here to /login — each renders its own unauthenticated experience.
// The tenant portal (/portal/*) is token-authorised and likewise public.
const PUBLIC_PATHS = [
	"/login",
	"/signup",
	"/forgot-password",
	"/reset-password",
	"/verify-email",
];

function isPublicPath(path: string): boolean {
	return PUBLIC_PATHS.includes(path) || path.startsWith("/portal/");
}

const axiosClient = axios.create({
	withCredentials: true,
});

axiosClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (typeof window !== "undefined" && error?.response?.status === 401) {
			if (!isPublicPath(window.location.pathname)) {
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
