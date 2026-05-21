"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import styled, { keyframes } from "styled-components";

export type TToastKind = "info" | "success" | "warn";

export interface IToast {
	id: number;
	msg: string;
	type: TToastKind;
}

interface IToastContext {
	toasts: IToast[];
	push: (
		msg: string,
		opts?: { type?: TToastKind; duration?: number },
	) => void;
}

const ToastContext = createContext<IToastContext>({
	toasts: [],
	push: () => {},
});

let _idSeed = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<IToast[]>([]);

	const push = useCallback(
		(msg: string, opts: { type?: TToastKind; duration?: number } = {}) => {
			const id = ++_idSeed;
			const type: TToastKind = opts.type ?? "info";
			setToasts((prev) => [...prev, { id, msg, type }]);
			const duration = opts.duration ?? 2600;
			setTimeout(
				() => setToasts((prev) => prev.filter((t) => t.id !== id)),
				duration,
			);
		},
		[],
	);

	const value = useMemo(() => ({ toasts, push }), [toasts, push]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<ToastHost>
				{toasts.map((t) => {
					const icon =
						t.type === "success"
							? "✓"
							: t.type === "warn"
								? "!"
								: "•";
					return (
						<ToastItem key={t.id} $type={t.type}>
							<span className="icon">{icon}</span>
							<span>{t.msg}</span>
						</ToastItem>
					);
				})}
			</ToastHost>
		</ToastContext.Provider>
	);
}

export function useToast(): IToastContext {
	return useContext(ToastContext);
}

const toastIn = keyframes`
	from { opacity: 0; transform: translateY(8px); }
	to { opacity: 1; transform: translateY(0); }
`;

const ToastHost = styled.div`
	position: fixed;
	right: 20px;
	bottom: 20px;
	z-index: 10000;
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const ToastItem = styled.div<{ $type: TToastKind }>`
	background: var(--Surface-Card);
	border: 1px solid var(--Border-Subtle);
	border-radius: 8px;
	padding: 12px 16px;
	color: var(--Text-Primary);
	font-size: 14px;
	min-width: 260px;
	max-width: 360px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	gap: 10px;
	animation: ${toastIn} 0.25s ease;

	.icon {
		font-weight: 700;
		color: ${({ $type }) =>
			$type === "success"
				? "var(--Success-700)"
				: $type === "warn"
					? "var(--Error-600)"
					: "var(--Main-Blue)"};
	}
`;
