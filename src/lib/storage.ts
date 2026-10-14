import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './firebaseClient';

/**
 * Upload HÍBRIDO de documentos (sem depender de CORS do Storage).
 *
 * - Arquivos pequenos (<= LIMITE_BASE64 = 700KB): converte para data-URL
 *   base64 e devolve `data:...;base64,...`. O chamador salva essa string
 *   no campo `url` do documento no Firestore — funciona 100% sem Storage.
 * - Arquivos grandes: faz upload normal ao Firebase Storage (requer CORS
 *   configurado no bucket — ver cors.json).
 *
 * Limite: documentos do Firestore têm no máximo 1 MiB; 700KB de arquivo
 * viram ~933KB em base64, cabendo com folga junto dos metadados.
 */
export const LIMITE_BASE64_BYTES = 700 * 1024;

export function arquivoParaDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function isDataURL(url: string | null | undefined): boolean {
  return !!url && url.startsWith('data:');
}

/** Converte data-URL base64 em blob URL (melhor p/ exibir em img/iframe). */
export function dataURLParaObjectURL(dataUrl: string): string {
  const [cabecalho, base64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(cabecalho)?.[1] || 'application/octet-stream';
  const bin = atob(base64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/** Baixa/abre um documento, seja data-URL base64 ou URL http(s) do Storage. */
export function baixarDataURL(dataUrl: string, nomeArquivo: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function baixarDocumentoURL(url: string, nomeArquivo: string): Promise<void> {
  if (isDataURL(url)) {
    baixarDataURL(url, nomeArquivo);
    return;
  }
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(objUrl);
  } catch {
    window.open(url, '_blank');
  }
}

export async function uploadDocumento(caminho: string, file: File): Promise<string> {
  // Arquivo pequeno → base64 direto (sem Storage, sem CORS).
  if (file.size <= LIMITE_BASE64_BYTES) {
    return arquivoParaDataURL(file);
  }
  // Arquivo grande → Storage (exige CORS configurado no bucket).
  const storageRef = ref(storage, `documentos/${caminho}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteDocumentoArquivo(url: string): Promise<void> {
  // Base64 vive dentro do doc do Firestore — some junto com ele.
  if (isDataURL(url)) return;
  // Best-effort: tenta extrair o caminho do Storage a partir da URL de
  // download (formato .../o/<caminho>?...) e apaga. Qualquer falha é ignorada.
  try {
    const m = /\/o\/([^?]+)/.exec(url);
    const caminho = m ? decodeURIComponent(m[1]) : url;
    await deleteObject(ref(storage, caminho));
  } catch {
    // URL pode ser inválida ou já removida — ignora silenciosamente
  }
}

export function caminhoDocumentoUpload(escopo: string, processoId: string, extensao: string): string {
  return `${escopo}/${processoId}/${Date.now()}.${extensao}`;
}
