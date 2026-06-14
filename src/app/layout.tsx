import type { Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import {
	BodyWrapper,
	PwaRegistrar,
	StyledComponentsRegistry,
} from "@/components";
import { defaultEnvOptions } from "@/constants";

export const viewport: Viewport = {
	themeColor: "#1E3A5F",
};

export const dm_sans = DM_Sans({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700", "800"],
	variable: "--mr-font-sans-loaded",
	display: "swap",
});

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const cookieHeader = cookieStore.toString();

	const env = defaultEnvOptions();

	return (
		<html lang="en" className={dm_sans.variable}>
			<head>
				<link rel="manifest" href="/manifest.webmanifest" />
				<link rel="apple-touch-icon" href="/icons/icon-192.svg" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta
					name="apple-mobile-web-app-status-bar-style"
					content="default"
				/>
				<meta name="apple-mobile-web-app-title" content="Managerenta" />
				<style>{`html,body{background:#FAF8F4}[data-theme="dark"]{background:#14171C}`}</style>
			</head>
			<body className={dm_sans.className}>
				<div id="modal-popup"></div>
				<StyledComponentsRegistry>
					<BodyWrapper env={env} cookieHeader={cookieHeader}>
						{children}
					</BodyWrapper>
				</StyledComponentsRegistry>
				<PwaRegistrar />
			</body>
		</html>
	);
}
