export interface IEnv {
	ENVIRONMENT: string;
	MAIN_SERVICE_URL: string;
	CDN_BASE_URL: string;
	CDN_ASSETS_VERSION: string;
	GOOGLE_ANALYTIC_TRACKING_ID: string;
}

export default function defaultEnvOptions(): IEnv {
	if (!process)
		return {
			ENVIRONMENT: "development",
			MAIN_SERVICE_URL: "",
			CDN_BASE_URL: "",
			CDN_ASSETS_VERSION: "",
			GOOGLE_ANALYTIC_TRACKING_ID: "",
		};

	const result: IEnv = {
		ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
		MAIN_SERVICE_URL: process.env?.NEXT_PUBLIC_MAIN_SERVICE_URL || "",
		CDN_BASE_URL: process.env?.NEXT_PUBLIC_CDN_BASE_URL || "",
		CDN_ASSETS_VERSION: process.env?.NEXT_PUBLIC_CDN_ASSETS_VERSION || "",
		GOOGLE_ANALYTIC_TRACKING_ID:
			process.env?.NEXT_PUBLIC_GOOGLE_ANALYTIC_TRACKING_ID || "",
	};

	return result;
}
