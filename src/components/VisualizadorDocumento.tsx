import { useEffect, useMemo } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { baixarDocumentoURL, dataURLParaObjectURL, isDataURL } from '../lib/storage';
import type { Documento } from '../types/database';

interface Props {
  doc: Documento | null;
  onClose: () => void;
}

const EXT_IMAGEM = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

function extensao(nome: string): string {
  return (nome.split('.').pop() || '').toLowerCase();
}

/**
 * Modal de leitura de documentos. Imagens e PDFs (base64 ou URL do Storage)
 * abrem para leitura dentro do app; outros formatos exibem fallback com
 * opção de baixar.
 */
export default function VisualizadorDocumento({ doc, onClose }: Props) {
  const ext = doc ? extensao(doc.nome_arquivo) : '';
  const ehImagem = !!doc && (EXT_IMAGEM.includes(ext) || doc.url.startsWith('data:image'));
  const ehPdf = !!doc && (ext === 'pdf' || doc.url.startsWith('data:application/pdf'));
  const usaBlob = !!doc && isDataURL(doc.url) && (ehImagem || ehPdf);

  // data-URL vira blob URL (uma vez por documento) para img/iframe lerem
  // sem travar com string gigante. Revogada ao trocar/fechar o documento.
  const srcLeitura = useMemo(
    () => (usaBlob && doc ? dataURLParaObjectURL(doc.url) : (doc?.url ?? '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc?.id, doc?.url],
  );

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      if (usaBlob) URL.revokeObjectURL(srcLeitura);
    };
  }, [onClose, srcLeitura, usaBlob]);

  if (!doc) return null;

  const podePreVisualizar = ehImagem || ehPdf;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-100">
          <FileText size={18} className="text-brand-700 shrink-0" />
          <p className="text-sm font-medium text-brand-900 truncate flex-1">{doc.nome_arquivo}</p>
          <button
            onClick={() => void baixarDocumentoURL(doc.url, doc.nome_arquivo)}
            className="btn-ghost text-sm"
            title="Baixar arquivo"
          >
            <Download size={16} /> Baixar
          </button>
          <button onClick={onClose} className="btn-ghost text-sm" title="Fechar (Esc)">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-ink-50 flex items-center justify-center p-4 min-h-[40vh]">
          {podePreVisualizar ? (
            ehImagem ? (
              <img src={srcLeitura} alt={doc.nome_arquivo} className="max-w-full max-h-[70vh] object-contain rounded" />
            ) : (
              <iframe src={srcLeitura} title={doc.nome_arquivo} className="w-full h-[70vh] bg-white rounded border border-ink-100" />
            )
          ) : (
            <div className="text-center py-10">
              <FileText size={40} className="text-ink-300 mx-auto mb-3" />
              <p className="text-sm text-ink-500 mb-4">
                Pré-visualização indisponível para este formato. Baixe o arquivo para ler.
              </p>
              <button
                onClick={() => void baixarDocumentoURL(doc.url, doc.nome_arquivo)}
                className="btn-primary text-sm"
              >
                <Download size={16} /> Baixar arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
