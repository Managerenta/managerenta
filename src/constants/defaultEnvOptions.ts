export interface IEnv {
	ENVIRONMENT: string;
	CDN_BASE_URL: string;
	CDN_ASSETS_VERSION: string;
}

export default function defaultEnvOptions(): IEnv {
	if (!process)
		return {
			ENVIRONMENT: "development",
			CDN_BASE_URL: "",
			CDN_ASSETS_VERSION: "",
		};

	const result: IEnv = {
		ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
		CDN_BASE_URL: process.env?.NEXT_PUBLIC_CDN_BASE_URL || "",
		CDN_ASSETS_VERSION: process.env?.NEXT_PUBLIC_CDN_ASSETS_VERSION || "",
	};

	return result;
}
