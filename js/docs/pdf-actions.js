import { saveDoc } from '../docs.js';
import { docsCtx } from './context.js';

export async function saveAndDownloadPDF() {
  const savedDoc = await saveDoc({ silent: true, keepEditor: true });
  if (!savedDoc || !savedDoc.id) return;
  const previewOpen = document.getElementById('modal-preview-pdf')?.classList.contains('open');
  let pdfOpts = {};
  const _APP = docsCtx.getAPP();
  const _DB = docsCtx.getDB();
  if (previewOpen && _APP.pdfPreview) {
    const bc = document.getElementById('preview-band-color');
    if (bc) _APP.pdfPreview.color = bc.value;
    pdfOpts = {
      tpl: _APP.pdfPreview.tpl || _DB.settings.pdfTemplate || 'classic',
      color: _APP.pdfPreview.color || _DB.settings.bandColor || '#1a6b3c',
    };
  }
  await downloadDocPDFById(savedDoc.id, pdfOpts);
  docsCtx.toast(`Document ${savedDoc.ref} sauvegardé + PDF téléchargé`, 'suc');
}
