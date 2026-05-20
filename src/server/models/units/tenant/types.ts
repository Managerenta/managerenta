export interface IUnitTenant {
	tenantId: string;
	name: string;
	avatar?: string;
}

export interface IUnitTenantPopulated {
	_id: string;
	name: string;
	avatar: string | null;
}
