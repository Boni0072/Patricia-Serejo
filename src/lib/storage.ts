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

/** Baixa/abre um documento, seja data-URL base64 ou URL http(s). */
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

/**
 * Upload de documentos/fotos para o Firestore como base-64 (sem Firebase Storage).
 *
 * - Arquivos <= LIMITE_BASE64_BYTES (700KB): converte para data-URL base64 e
 *   devolve `data:...;base64,...`. O chamador salva essa string no campo
 *   `foto_url` do Firestore — funciona 100% sem Storage, sem CORS.
 * - Arquivos > LIMITE_BASE64_BYTES: rejeitados (Firestore tem ~1MB por campo;
 *   700KB viram ~933KB em base64, cabendo com folga).
 */
export async function uploadDocumento(caminho: string, file: File): Promise<string> {
  if (file.size > LIMITE_BASE64_BYTES) {
    throw new Error('Imagem muito grande. Máx. 700KB.');
  }
  return arquivoParaDataURL(file);
}

/**
 * Exclusão de arquivos.
 *
 * Devido ao armazenamento em base-64 no Firestore, não há arquivo no Storage
 * para apagar. A exclusão dos metadados é feita via update/delete do documento.
 */
export async function deleteDocumentoArquivo(url: string): Promise<void> {
  if (isDataURL(url)) return;
  // Sem Storage, não há caminho de download para apagar. Ignora.
}

export function caminhoDocumentoUpload(escopo: string, processoId: string, extensao: string): string {
  return `${escopo}/${processoId}/${Date.now()}.${extensao}`;
}