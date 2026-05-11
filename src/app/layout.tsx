import { GoogleAnalytics } from "@next/third-parties/google";
import { decodeJwt } from "jose";
import {
	DM_Sans,
	// Iceland,
	// Rajdhani,
	// Unbounded,
	// Ysabeau_Office,
	Roboto,
} from "next/font/google";
import { cookies } from "next/headers";
import { BodyWrapper } from "@/components";
import { defaultEnvOptions } from "@/constants";

const dm_sans = DM_Sans({
	subsets: ["latin"],
	weight: [
		"100",
		"200",
		"300",
		"400",
		"500",
		"600",
		"700",
		"800",
		"900",
		"1000",
	],
});

const roboto = Roboto({
	subsets: ["latin"],
	weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

// const unbounded = Unbounded({
// 	subsets: ["latin"],
// 	weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
// });

// const rajdhani = Rajdhani({
// 	subsets: ["latin"],
// 	weight: ["300", "400", "500", "600", "700"],
// });

// const iceland = Iceland({
// 	subsets: ["latin"],
// 	weight: ["400"],
// });

// const ysabeau_office = Ysabeau_Office({
// 	subsets: ["latin"],
// 	weight: ["400", "500", "600", "700", "800", "900"],
// });

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();

	const env = defaultEnvOptions();

	const accessToken = cookieStore.get("accessToken")?.value;
	let isUserSessionActive = false;
	let userName = "";

	if (accessToken) {
		try {
			decodeJwt(accessToken);
			isUserSessionActive = true;

			const cookieHeader = cookieStore.toString();
			const profileRes = await fetch(
				`${env.MAIN_SERVICE_URL}/api/users/user-profile`,
				{ headers: { Cookie: cookieHeader } },
			);
			if (profileRes.ok) {
				const body = await profileRes.json();
				userName = body?.data?.name ?? body?.name ?? "";
			}
		} catch {
			isUserSessionActive = false;
		}
	}

	// useReportWebVitals((metric) => {
	// 	// console.log(metric);
	// });

	return (
		<html lang="en">
			<head>
				<style>{`html,body{background:#ffffff}[data-theme="dark"]{background:#0f172a}`}</style>
			</head>
			<body className={`${dm_sans.className} ${roboto.className}`}>
				<div id="modal-popup"></div>
				<BodyWrapper
					env={env}
					isUserSessionActive={isUserSessionActive}
					userName={userName}
				>
					{children}
				</BodyWrapper>
			</body>

			<GoogleAnalytics gaId={env.GOOGLE_ANALYTIC_TRACKING_ID} />
		</html>
	);
}
