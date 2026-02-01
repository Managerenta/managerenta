"use client";
import { memo } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Toast() {
	return (
		<ToastContainer
			closeOnClick
			draggable
			pauseOnHover={false}
			position="bottom-right"
			pauseOnFocusLoss={false}
			limit={3}
			autoClose={5000}
			style={{
				color: "var(--Black)",
			}}
		/>
	);
}

export default memo(Toast);
