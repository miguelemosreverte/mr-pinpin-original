(() => {
  'use strict';
  const validPDF = value => value && typeof value.url === 'string' && value.url &&
    /^[a-f0-9]{64}$/i.test(value.sha256 || '') && Number.isSafeInteger(value.bytes) && value.bytes > 0;
  function safeURL(value) {
    const url = new URL(value, location.href);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === location.origin)) throw new Error('Unsupported download URL');
    return url.href;
  }
  async function download(pdf, {signal, onProgress, filename}) {
    if (!validPDF(pdf)) throw new Error('PDF unavailable');
    const response = await fetch(safeURL(pdf.url), {signal, mode:'cors', credentials:'omit'});
    if (!response.ok) throw new Error(`Download returned ${response.status}`);
    const chunks = [];
    let received = 0;
    if (response.body) {
      const reader = response.body.getReader();
      try {
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value); received += value.byteLength;
          if (received > pdf.bytes) throw new Error('Unexpected PDF size');
          onProgress({received, total:pdf.bytes, phase:'downloading'});
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    } else {
      const value = new Uint8Array(await response.arrayBuffer());
      chunks.push(value); received = value.byteLength;
    }
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (received !== pdf.bytes) throw new Error('Incomplete PDF');
    onProgress({received, total:pdf.bytes, phase:'checking'});
    const blob = new Blob(chunks, {type:'application/pdf'});
    const bytes = await blob.arrayBuffer();
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Not a PDF');
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
    if (digest !== pdf.sha256.toLowerCase()) throw new Error('PDF checksum mismatch');
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const objectURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectURL;
    link.download = (pdf.filename || filename).replace(/[^a-zA-Z0-9._-]/g, '-');
    link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
  }
  window.libraryDownload = {validPDF, download};
})();
