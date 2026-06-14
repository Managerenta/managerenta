/* Managerenta service worker: web-push delivery + PWA installability. */

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
	let payload = { title: "Managerenta", body: "", url: "/notifications" };
	try {
		if (event.data) payload = { ...payload, ...event.data.json() };
	} catch (_e) {
		if (event.data) payload.body = event.data.text();
	}

	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: "/icons/icon-192.svg",
			badge: "/icons/icon-192.svg",
			data: { url: payload.url || "/notifications" },
			tag: payload.tag || undefined,
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = event.notification.data?.url || "/";
	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clients) => {
				for (const client of clients) {
					if ("focus" in client) {
						client.navigate(url);
						return client.focus();
					}
				}
				if (self.clients.openWindow)
					return self.clients.openWindow(url);
			}),
	);
});
