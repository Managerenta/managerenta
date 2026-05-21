"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
	memo,
	type ReactNode,
	useContext,
	useMemo,
	useReducer,
	useState,
} from "react";
import { FaLock, FaShieldAlt, FaUser } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";
import { Box, Button, Input, Loader, Text } from "@/components";
import { api, getErrorMessage, safeRedirect } from "@/constants";
import { AppContextProvider, useToast } from "@/hooks";
import AlternativeSeparator from "@/layouts/AlternativeSeparator";
import Header from "../Header";
import { LoginStyled } from "./styled";

type Step = "credentials" | "two-factor";

interface LoginState {
	email: string;
	password: string;
	code: string;
	useRecovery: boolean;
}

type LoginAction =
	| { type: "SET_EMAIL"; payload: string }
	| { type: "SET_PASSWORD"; payload: string }
	| { type: "SET_CODE"; payload: string }
	| { type: "TOGGLE_RECOVERY" }
	| { type: "RESET_TWO_FACTOR" };

const initialState: LoginState = {
	email: "",
	password: "",
	code: "",
	useRecovery: false,
};

function loginReducer(state: LoginState, action: LoginAction): LoginState {
	switch (action.type) {
		case "SET_EMAIL":
			return { ...state, email: action.payload };
		case "SET_PASSWORD":
			return { ...state, password: action.payload };
		case "SET_CODE":
			return { ...state, code: action.payload };
		case "TOGGLE_RECOVERY":
			return { ...state, useRecovery: !state.useRecovery, code: "" };
		case "RESET_TWO_FACTOR":
			return { ...state, code: "", useRecovery: false };
		default:
			return state;
	}
}

function Login() {
	const toast = useToast();
	const [state, dispatch] = useReducer(loginReducer, initialState);
	const [isLoading, setIsLoading] = useState(false);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [step, setStep] = useState<Step>("credentials");
	const [twoFactorTicket, setTwoFactorTicket] = useState<string | null>(null);

	const { reAuthenticateUserSession } = useContext(AppContextProvider);
	const router = useRouter();
	const searchParams = useSearchParams();
	const nextDestination = safeRedirect(searchParams.get("next"));

	const completeLogin = async () => {
		setIsRedirecting(true);
		await reAuthenticateUserSession();
		router.replace(nextDestination);
		router.refresh();
	};

	const handleCredentialsSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!state.email || !state.password) {
			toast.push("Please fill in all fields", { type: "warn" });
			return;
		}

		setIsLoading(true);

		try {
			const res = await api().post(
				"/api/auth/login",
				{ email: state.email, password: state.password },
				{ baseURL: "" },
			);

			const data = res.data?.data;
			if (data?.twoFactorRequired && data?.ticket) {
				setTwoFactorTicket(data.ticket);
				setStep("two-factor");
				setIsLoading(false);
				return;
			}

			await completeLogin();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err, "Invalid username or password"), {
				type: "warn",
			});
			setIsLoading(false);
		}
	};

	const handleTwoFactorSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!twoFactorTicket) {
			toast.push("Session expired — please sign in again.", {
				type: "warn",
			});
			setStep("credentials");
			return;
		}

		const trimmed = state.code.trim();
		if (!trimmed) {
			toast.push(
				state.useRecovery
					? "Enter a recovery code"
					: "Enter the 6-digit code from your authenticator",
				{ type: "warn" },
			);
			return;
		}

		setIsLoading(true);
		try {
			const body: Record<string, string> = { ticket: twoFactorTicket };
			if (state.useRecovery) body.recoveryCode = trimmed;
			else body.totpToken = trimmed;

			await api().post("/api/auth/login/2fa", body, { baseURL: "" });
			await completeLogin();
		} catch (err: unknown) {
			toast.push(getErrorMessage(err, "Invalid code"), { type: "warn" });
			setIsLoading(false);
		}
	};

	const handleCancelTwoFactor = () => {
		setTwoFactorTicket(null);
		setStep("credentials");
		dispatch({ type: "RESET_TWO_FACTOR" });
	};

	const renderedInputFields = useMemo(() => {
		const inputs: {
			label: string;
			elem: ReactNode;
		}[] = [
			{
				label: "Email",
				elem: (
					<section>
						<FaUser />
						<Input
							type="email"
							placeholder="Enter your email"
							value={state.email}
							onChange={(e) =>
								dispatch({
									type: "SET_EMAIL",
									payload: e.target.value,
								})
							}
						/>
					</section>
				),
			},
			{
				label: "Password",
				elem: (
					<section>
						<FaLock />
						<Input
							type="password"
							placeholder="Enter your password"
							value={state.password}
							onChange={(e) =>
								dispatch({
									type: "SET_PASSWORD",
									payload: e.target.value,
								})
							}
						/>
					</section>
				),
			},
		];
		return inputs.map((item, index) => {
			return (
				<Box key={index} className="form-field">
					<label htmlFor={item.label.toLowerCase()}>
						{item.label}
					</label>
					{item.elem}
				</Box>
			);
		});
	}, [state.email, state.password]);

	if (isRedirecting) {
		return (
			<LoginStyled>
				<Box $grid $centerH $centerV $w="100%" $h="100%" $minH="500px">
					<Loader loader="moonLoader" color="var(--Brand-Primary)" />
					<Text>Signing you in…</Text>
				</Box>
			</LoginStyled>
		);
	}

	if (step === "two-factor") {
		return (
			<LoginStyled>
				<Header
					title="Two-factor authentication"
					subtext={
						state.useRecovery
							? "Enter one of the recovery codes you saved when you enabled 2FA."
							: "Enter the 6-digit code from your authenticator app."
					}
				/>

				<form onSubmit={handleTwoFactorSubmit}>
					<Box className="form-field">
						<label htmlFor="code">
							{state.useRecovery
								? "Recovery code"
								: "Authenticator code"}
						</label>
						<section>
							<FaShieldAlt />
							<Input
								type="text"
								inputMode={
									state.useRecovery ? "text" : "numeric"
								}
								autoComplete="one-time-code"
								placeholder={
									state.useRecovery ? "xxxxx-xxxxx" : "123456"
								}
								value={state.code}
								onChange={(e) =>
									dispatch({
										type: "SET_CODE",
										payload: e.target.value,
									})
								}
							/>
						</section>
					</Box>

					<Button
						title={isLoading ? "Verifying..." : "Verify"}
						type="submit"
						handleClick={handleTwoFactorSubmit}
						disabled={isLoading}
					/>
				</form>

				<Box className="options">
					<Box
						className="forgot-password"
						onClick={() => dispatch({ type: "TOGGLE_RECOVERY" })}
						style={{ cursor: "pointer" }}
					>
						<Text>
							{state.useRecovery
								? "Use authenticator code instead"
								: "Use a recovery code"}
						</Text>
					</Box>
					<Box
						className="forgot-password"
						onClick={handleCancelTwoFactor}
						style={{ cursor: "pointer" }}
					>
						<Text>Back</Text>
					</Box>
				</Box>
			</LoginStyled>
		);
	}

	return (
		<LoginStyled>
			<Header title="Welcome Back" subtext="Sign in to your account" />

			<form onSubmit={handleCredentialsSubmit}>
				{renderedInputFields}
			</form>

			<Box className="options">
				<Box className="remember-me">
					<Input type="checkbox" id="rememberMe" />
					<label htmlFor="rememberMe">Remember me</label>
				</Box>
				<Box className="forgot-password">
					<Link href="/forgot-password">Forgot password?</Link>
				</Box>
			</Box>

			<Button
				title={isLoading ? "Signing in..." : "Sign In"}
				type="submit"
				handleClick={handleCredentialsSubmit}
				disabled={isLoading}
			/>

			<AlternativeSeparator />

			<Box className="register">
				<Text>Don't have an account?</Text>
				<Link href="/signup">Sign Up</Link>
			</Box>

			<Box className="privacy-wrapper">
				<Box className="privacy-terms">
					<Link href="/privacy-policy">Privacy Policy</Link>
					<span>|</span>
					<Link href="/terms-of-service">Terms of Service</Link>
				</Box>

				<Box className="ssl-secure">
					<GrSecure />
					<Text>Secured by 256-bit SSL encryption</Text>
				</Box>
			</Box>
		</LoginStyled>
	);
}

export default memo(Login);
