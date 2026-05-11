import { GoogleAnalytics } from "@next/third-parties/google";
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

export const dm_sans = DM_Sans({
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

export const roboto = Roboto({
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
	const cookieHeader = cookieStore.toString();

	const env = defaultEnvOptions();

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
				<BodyWrapper env={env} cookieHeader={cookieHeader}>
					{children}
				</BodyWrapper>
			</body>

			<GoogleAnalytics gaId={env.GOOGLE_ANALYTIC_TRACKING_ID} />
		</html>
	);
}
