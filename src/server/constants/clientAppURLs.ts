// Used by isOriginAllowed for the "trusted origin" rate-limit bonus. Keep this
// list narrow — the matcher collapses to the last two domain labels, so each
// entry effectively whitelists every subdomain of that eTLD+1.
const clientAppURLs: { url: string }[] = [
	{ url: "localhost" },
	{ url: "managerenta.com" },
];

export default clientAppURLs;
