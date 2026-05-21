"use client";
import { memo, type ReactNode } from "react";
import { ToastProvider } from "@/hooks";

interface IProps {
	children: ReactNode;
}

function Toast({ children }: IProps) {
	return <ToastProvider>{children}</ToastProvider>;
}

export default memo(Toast);
