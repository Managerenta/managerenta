"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	type ReactNode,
	useContext,
	useMemo,
	useReducer,
	useState,
} from "react";
import { FaLock, FaUser } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import { toast } from "react-toastify";
import { Box, Button, Input, Text } from "@/components";
import { api } from "@/constants";
import { AppContextProvider } from "@/hooks";
import { AlternativeSeparator } from "@/layouts";
import Header from "../Header";
import { SignupStyled } from "./styled";

interface SignupState {
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	createPassword: string;
	confirmPassword: string;
}

type SignupAction =
	| { type: "SET_FIRST_NAME"; payload: string }
	| { type: "SET_LAST_NAME"; payload: string }
	| { type: "SET_CREATE_PASSWORD"; payload: string }
	| { type: "SET_EMAIL"; payload: string }
	| { type: "SET_USERNAME"; payload: string }
	| { type: "SET_CONFIRM_PASSWORD"; payload: string };

const initialState: SignupState = {
	firstName: "",
	lastName: "",
	email: "",
	username: "",
	createPassword: "",
	confirmPassword: "",
};

function signupReducer(state: SignupState, action: SignupAction): SignupState {
	switch (action.type) {
		case "SET_FIRST_NAME":
			return { ...state, firstName: action.payload };
		case "SET_LAST_NAME":
			return { ...state, lastName: action.payload };
		case "SET_USERNAME":
			return { ...state, username: action.payload };
		case "SET_EMAIL":
			return { ...state, email: action.payload };
		case "SET_CREATE_PASSWORD":
			return { ...state, createPassword: action.payload };
		case "SET_CONFIRM_PASSWORD":
			return { ...state, confirmPassword: action.payload };
		default:
			return state;
	}
}

export default function Signup() {
	const [state, dispatch] = useReducer(signupReducer, initialState);
	const [isLoading, setIsLoading] = useState(false);

	const { env } = useContext(AppContextProvider);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (state.createPassword !== state.confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		setIsLoading(true);

		try {
			const formData = new FormData();
			formData.append("name", `${state.firstName} ${state.lastName}`.trim());
			formData.append("username", state.username);
			formData.append("email", state.email);
			formData.append("password", state.createPassword);

			await api().post(`${env.MAIN_SERVICE_URL}/api/auth/signup`, formData);

			toast.success("Account created! Please sign in.");
			router.push("/login");
		} catch (err: unknown) {
			const message =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message ?? "Failed to create account";
			toast.error(message);
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
				label: "First Name",
				elem: (
					<section>
						<FaUser />
						<Input
							type="text"
							placeholder="Enter your first name"
							value={state.firstName}
							onChange={(e) =>
								dispatch({ type: "SET_FIRST_NAME", payload: e.target.value })
							}
						/>
					</section>
				),
			},
			{
				label: "Last Name",
				elem: (
					<section>
						<FaUser />
						<Input
							type="text"
							placeholder="Enter your last name"
							value={state.lastName}
							onChange={(e) =>
								dispatch({ type: "SET_LAST_NAME", payload: e.target.value })
							}
						/>
					</section>
				),
			},
			{
				label: "Email",
				elem: (
					<section>
						<HiOutlineMail />
						<Input
							type="email"
							placeholder="Enter your email"
							value={state.email}
							onChange={(e) =>
								dispatch({ type: "SET_EMAIL", payload: e.target.value })
							}
						/>
					</section>
				),
			},
			{
				label: "Username",
				elem: (
					<section>
						<FaRegCircleUser />
						<Input
							type="text"
							placeholder="Enter your username"
							value={state.username}
							onChange={(e) =>
								dispatch({ type: "SET_USERNAME", payload: e.target.value })
							}
						/>
					</section>
				),
			},
			{
				label: "Create Password",
				elem: (
					<section>
						<FaLock />
						<Input
							type="password"
							placeholder="Create a strong password"
							value={state.createPassword}
							onChange={(e) =>
								dispatch({
									type: "SET_CREATE_PASSWORD",
									payload: e.target.value,
								})
							}
						/>
					</section>
				),
			},
			{
				label: "Confirm Password",
				elem: (
					<section>
						<FaLock />
						<Input
							type="password"
							placeholder="Re-enter your password"
							value={state.confirmPassword}
							onChange={(e) =>
								dispatch({
									type: "SET_CONFIRM_PASSWORD",
									payload: e.target.value,
								})
							}
						/>
					</section>
				),
			},
		];
		return inputs.map((item, index) => (
			<Box key={index} className="form-field">
				<label htmlFor={item.label.toLowerCase().replaceAll(" ", "-")}>
					{item.label}
				</label>
				{item.elem}
			</Box>
		));
	}, [
		state.firstName,
		state.lastName,
		state.username,
		state.createPassword,
		state.confirmPassword,
		state.email,
	]);

	return (
		<SignupStyled>
			<Header
				title="Create Your Account"
				subtext="Get started in less than 2 minutes"
			/>

			<form onSubmit={handleSubmit}>{renderedInputFields}</form>

			<Box className="options">
				<Box className="privacy-terms">
					<Input type="checkbox" id="check-me" />
					<label htmlFor="check-me">
						I agree to PropertyTrack's{" "}
						<Link href="/terms-of-service">Terms of Service</Link> and{" "}
						<Link href="/privacy-policy">Privacy Policy</Link>
					</label>
				</Box>
			</Box>

			<Button
				title={isLoading ? "Creating account..." : "Create Account"}
				type="submit"
				handleClick={handleSubmit}
				disabled={isLoading}
			/>

			<AlternativeSeparator />

			<Box className="register">
				<Text>Already have an account?</Text>
				<Link href="/login">Sign In</Link>
			</Box>
		</SignupStyled>
	);
}
