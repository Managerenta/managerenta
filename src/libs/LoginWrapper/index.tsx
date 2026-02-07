"use client";

import { memo } from "react";
import { UserAuthWrapper } from "@/layouts";

function LoginWrapper() {
	return <UserAuthWrapper type="login" />;
}

export default memo(LoginWrapper);
