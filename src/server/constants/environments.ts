export const PORT = process.env.PORT ?? "8080";
export const MAX_LIMIT = 50;

export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "";
export const NODE_ENV = process.env.NODE_ENV ?? "development";

export const MONGODB_URI = process.env.MONGODB_URI ?? "";
export const DB_NAME = process.env.DB_NAME ?? "";
export const REDIS_URI = process.env.REDIS_URI ?? "";
export const CLOUDFRONT_CDN_URL = process.env.CLOUDFRONT_CDN_URL ?? "";

export const S3_REGION = process.env.S3_REGION ?? "";
export const S3_BUCKET = process.env.S3_BUCKET ?? "";
export const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? "";

export const JWT_ACCESS_TOKEN_SECRET =
	process.env.JWT_ACCESS_TOKEN_SECRET ?? "";
export const JWT_REFRESH_TOKEN_SECRET =
	process.env.JWT_REFRESH_TOKEN_SECRET ?? "";

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60 * 30; // 30 days
