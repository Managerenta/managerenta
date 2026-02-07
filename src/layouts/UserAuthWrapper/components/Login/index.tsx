"use client";
import Link from "next/link";
import { type ReactNode, useMemo, useReducer } from "react";
import { FaLock, FaUser } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";
import { Box, Button, Input, Text } from "@/components";
import { LoginStyled } from "./styled";

interface LoginState {
	username: string;
	password: string;
}

type LoginAction =
	| { type: "SET_USERNAME"; payload: string }
	| { type: "SET_PASSWORD"; payload: string };

const initialState: LoginState = {
	username: "",
	password: "",
};

function loginReducer(state: LoginState, action: LoginAction): LoginState {
	switch (action.type) {
		case "SET_USERNAME":
			return { ...state, username: action.payload };
		case "SET_PASSWORD":
			return { ...state, password: action.payload };
		default:
			return state;
	}
}

export default function Login() {
	const [state, dispatch] = useReducer(loginReducer, initialState);

	const renderedInputFields = useMemo(() => {
		const inputs: {
			label: string;
			elem: ReactNode;
		}[] = [
			{
				label: "Username",
				elem: (
					<section>
						<FaUser />
						<Input
							type="text"
							placeholder="Enter your username"
							value={state.username}
							onChange={(e) =>
								dispatch({
									type: "SET_USERNAME",
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
	}, [state.username, state.password]);

	return (
		<LoginStyled>
			<header>
				<h1>Welcome Back</h1>
				<Text>Sign in to your account</Text>
			</header>

			<form>{renderedInputFields}</form>

			<Box className="options">
				<Box className="remember-me">
					<Input type="checkbox" id="rememberMe" />
					<label htmlFor="rememberMe">Remember me</label>
				</Box>
				<Box className="forgot-password">
					<Link href="#">Forgot password?</Link>
				</Box>
			</Box>

			<Button title="Sign In" />

			<Box className="or-separator">
				<hr />
				<Text>Or</Text>
				<hr />
			</Box>

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
