import { GoogleAnalytics } from "@next/third-parties/google";
import {
	DM_Sans,
	Iceland,
	Rajdhani,
	Unbounded,
	Ysabeau_Office,
} from "next/font/google";
import { cookies } from "next/headers";
import { BodyWrapper } from "@/components";
import { defaultEnvOptions, verifyUserLogin } from "@/constants";

const unbounded = Unbounded({
	subsets: ["latin"],
	weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

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

const rajdhani = Rajdhani({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

const iceland = Iceland({
	subsets: ["latin"],
	weight: ["400"],
});

const ysabeau_office = Ysabeau_Office({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800", "900"],
});

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const cookieHeader = cookieStore.toString();

	const env = defaultEnvOptions();

	const url = `${env.MAIN_SERVICE_URL}/api/login/verify`;
	const isUserSessionActive = await verifyUserLogin({ url, cookieHeader });

	// useReportWebVitals((metric) => {
	// 	// console.log(metric);
	// });

	return (
		<html lang="en">
			<body
				className={`${unbounded.className} ${dm_sans.className} ${rajdhani.className} ${iceland.className} ${ysabeau_office.className}`}>
				<div id="modal-popup"></div>
				<BodyWrapper env={env} isUserSessionActive={isUserSessionActive}>
					{children}
				</BodyWrapper>
			</body>

			<GoogleAnalytics
				gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTIC_TRACKING_ID || ""}
			/>
		</html>
	);
}
