"use client";
import { useCallback, useEffect, useState } from "react";

const useClipboard = () => {
	const [isCopied, setIsCopied] = useState<boolean>(false);

	useEffect(() => {
		if (!isCopied) return;
		setTimeout(() => setIsCopied(false), 1_000);
	}, [isCopied]);

	const copy = useCallback((text: string) => {
		if ("clipboard" in navigator) navigator.clipboard.writeText(text);
		else document?.execCommand("copy", true, text);
		setIsCopied(true);
	}, []);

	return { copy, isCopied };
};

export default useClipboard;
