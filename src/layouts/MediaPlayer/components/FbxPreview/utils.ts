import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadObject = async (objectLink: string): Promise<any> => {
	const loader = new FBXLoader();

	return new Promise((resolve, reject) => {
		loader.load(
			objectLink,
			(gltf) => {
				resolve(gltf);
			},
			undefined,
			(err: unknown) => {
				void err;
				reject(err);
			},
		);
	});
};

export { loadObject };
