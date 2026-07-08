// Public surface of the IAM subsystem. Route handlers import `authorize`, the
// `arn` builders, and the `Action` type from here.
export * from "./arn";
export {
	type AuthorizeOverrides,
	authorize,
	buildContext,
	decide,
	resourceScope,
} from "./authorize";
export {
	actionMatches,
	conditionMatches,
	evaluate,
	ipInCidr,
	resourceMatches,
} from "./engine";
export {
	type MigrationReport,
	migrateRolesToIam,
} from "./migrate/roles-to-iam";
export * from "./models";
export {
	bumpPolicyVersion,
	invalidatePrincipal,
	resolveEffectivePolicies,
} from "./resolve";
export {
	groupForRole,
	type OrgSystemGroups,
	orgAdminDocument,
	orgManagerDocument,
	orgViewerDocument,
	PLATFORM_POLICY_DOCUMENTS,
	seedOrgOwnerAdmin,
	seedOrgSystemGroups,
	seedPlatformSystemPolicies,
} from "./seed/system-policies";
export { syncOrgMemberRemoved, syncOrgMemberRole } from "./sync";
export type {
	ConditionBlock,
	ConditionContext,
	Decision,
	Effect,
	EvaluateInput,
	ManagedBy,
	NamedPolicy,
	Plane,
	PolicyDocument,
	PolicyStatement,
	PrincipalType,
} from "./types";
