"use client";

import { memo } from "react";
import { UserAuthWrapper } from "@/layouts";

function SignupWrapper() {
	return <UserAuthWrapper type="signup" />;
}

export default memo(SignupWrapper);
