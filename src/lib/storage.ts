import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './firebaseClient';

export async function uploadDocumento(caminho: string, file: File): Promise<string> {
  const storageRef = ref(storage, `documentos/${caminho}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteDocumentoArquivo(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // URL pode ser inválida ou já removida — ignora silenciosamente
  }
}

export function caminhoDocumentoUpload(escopo: string, processoId: string, extensao: string): string {
  return `${escopo}/${processoId}/${Date.now()}.${extensao}`;
}
