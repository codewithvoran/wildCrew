import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { storage } from "../firebase";

export const uploadImage = async (file, folder) => {
  const imageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);

  await uploadBytes(imageRef, file);

  return getDownloadURL(imageRef);
};
