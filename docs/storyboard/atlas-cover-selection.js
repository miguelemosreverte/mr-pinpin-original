// Feed samples from PinPin's actual normalized position. A timer completes the
// candidate's dwell even when movement stops; it never samples the image.
export function createCoverSelection({onChange,delayMs=160,minConfidence=20,
  setTimeout: schedule=globalThis.setTimeout,clearTimeout: cancel=globalThis.clearTimeout}={}) {
  let selected=null,candidate=null,timer=null,destroyed=false;
  function clearPending() {
    if (timer!==null) cancel(timer);
    timer=null; candidate=null;
  }
  function select(id) {
    selected=id;
    onChange?.(id);
  }
  return {
    update(sample) {
      if (destroyed) return selected;
      const id=sample?.id,confidence=sample?.confidence;
      // Unknown samples hold the current selection and invalidate pending dwell.
      if (typeof id!=='string' || !id || !Number.isFinite(confidence) || confidence<0 || confidence>100) {
        clearPending();
      } else if (selected===null) {
        select(id);
      } else if (id===selected || confidence<minConfidence) {
        clearPending();
      } else if (id!==candidate) {
        clearPending(); candidate=id;
        timer=schedule(() => {
          timer=null;
          const next=candidate; candidate=null;
          if (!destroyed && next!==null) select(next);
        },delayMs);
      }
      return selected;
    },
    get selected() { return selected; },
    destroy() { destroyed=true; clearPending(); }
  };
}
