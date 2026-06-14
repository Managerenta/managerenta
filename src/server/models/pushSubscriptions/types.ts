export interface IPushSubscriptionCreateInput {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	userAgent?: string;
}

export interface IPushSubscription extends IPushSubscriptionCreateInput {
	id: string;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
