import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loadObject = async (objectLink: string): Promise<GLTF> => {
	const loader = new GLTFLoader();

	return new Promise((resolve, reject) => {
		loader.load(
			objectLink,
			(gltf: GLTF) => {
				resolve(gltf);
			},
			undefined,
			(err: unknown) => {
				console.log("error occurred: ", err);
				reject(err);
			},
		);
	});
};

export { loadObject };
