"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	memo,
	type ReactNode,
	useContext,
	useMemo,
	useReducer,
	useState,
} from "react";
import { FaLock, FaUser } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";
import { toast } from "react-toastify";
import { Box, Button, Input, Text } from "@/components";
import { getErrorMessage } from "@/constants";
import { AppContextProvider } from "@/hooks";
import AlternativeSeparator from "@/layouts/AlternativeSeparator";
import Header from "../Header";
import { LoginStyled } from "./styled";

interface LoginState {
	email: string;
	password: string;
}

type LoginAction =
	| { type: "SET_EMAIL"; payload: string }
	| { type: "SET_PASSWORD"; payload: string };

const initialState: LoginState = {
	email: "",
	password: "",
};

function loginReducer(state: LoginState, action: LoginAction): LoginState {
	switch (action.type) {
		case "SET_EMAIL":
			return { ...state, email: action.payload };
		case "SET_PASSWORD":
			return { ...state, password: action.payload };
		default:
			return state;
	}
}

function Login() {
	const [state, dispatch] = useReducer(loginReducer, initialState);
	const [isLoading, setIsLoading] = useState(false);

	const { reAuthenticateUserSession } = useContext(AppContextProvider);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!state.email || !state.password) {
			toast.error("Please fill in all fields");
			return;
		}

		setIsLoading(true);

		try {
			const res = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: state.email,
					password: state.password,
				}),
				credentials: "include",
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(
					data?.message || "Invalid username or password",
				);
			}

			await reAuthenticateUserSession();
			router.push("/dashboard");
			router.refresh();
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, "Invalid username or password"));
		} finally {
			setIsLoading(false);
		}
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

	return (
		<LoginStyled>
			<Header title="Welcome Back" subtext="Sign in to your account" />

			<form onSubmit={handleSubmit}>{renderedInputFields}</form>

			<Box className="options">
				<Box className="remember-me">
					<Input type="checkbox" id="rememberMe" />
					<label htmlFor="rememberMe">Remember me</label>
				</Box>
				<Box className="forgot-password">
					<Link href="#">Forgot password?</Link>
				</Box>
			</Box>

			<Button
				title={isLoading ? "Signing in..." : "Sign In"}
				type="submit"
				handleClick={handleSubmit}
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
