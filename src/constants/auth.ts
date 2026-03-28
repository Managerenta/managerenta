import api from "./api";
import defaultEnvOptions from "./defaultEnvOptions";

const getBaseUrl = () => defaultEnvOptions().MAIN_SERVICE_URL;

export async function loginUser(email: string, password: string) {
	return await api().post(`${getBaseUrl()}/api/auth/login`, { email, password });
}

export async function signupUser(payload: {
	firstName: string;
	lastName: string;
	email: string;
	username: string;
	createPassword: string;
}) {
	const formData = new FormData();
	formData.append("name", `${payload.firstName} ${payload.lastName}`.trim());
	formData.append("username", payload.username);
	formData.append("email", payload.email);
	formData.append("password", payload.createPassword);

	return await api().post(`${getBaseUrl()}/api/auth/signup`, formData);
}

export async function logoutUser() {
	return await api().post("/api/logout");
}