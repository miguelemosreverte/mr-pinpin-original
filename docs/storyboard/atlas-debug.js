const desktopQuery = '(min-width: 768px) and (hover: hover) and (pointer: fine)';
const interactiveSelector = 'a[href], button, input, select, textarea, summary, iframe, audio[controls], video[controls], [tabindex], [role="button"], [role="link"], [role="slider"], [role="textbox"], [role="combobox"], [role="menuitem"]';
let nextId = 0;

function strengthValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(4, value)) : 1;
}

export function createAtlasDebug({ onStrengthChange = () => {}, getStrength, onLensChange, getLens,
  spriteTrial=false,getSpriteSet,onSpriteSetChange,getWalkMode,onWalkModeChange } = {}) {
  const desktop = window.matchMedia(desktopQuery);
  const panel = document.createElement('section');
  panel.className = 'atlas-debug';
  panel.setAttribute('aria-label', 'Atlas debug');
  panel.tabIndex = -1;
  panel.hidden = true;
  const row = document.createElement('div');
  row.className = 'atlas-debug-row';
  const label = document.createElement('label');
  const range = document.createElement('input');
  const output = document.createElement('output');
  const status = document.createElement('p');
  status.className = 'atlas-debug-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Waiting for WebGPU';
  range.id = `atlas-debug-strength-${++nextId}`;
  range.type = 'range';
  range.min = '0';
  range.max = '4';
  range.step = '0.01';
  range.disabled = true;
  label.htmlFor = range.id;
  label.textContent = 'Bokeh strength';
  output.htmlFor = range.id;
  row.append(label, output);
  panel.append(row, range, status);
  let spriteSelect=null,trigger=null;
  if(spriteTrial) {
    panel.classList.add('atlas-debug-trial');
    const spriteLabel=document.createElement('label');
    spriteSelect=document.createElement('select');spriteSelect.id=`atlas-debug-sprites-${nextId}`;
    spriteLabel.htmlFor=spriteSelect.id;spriteLabel.textContent='Sprites';
    for(const [value,text] of [['original','Original'],['video','Video trial']]) {
      const option=document.createElement('option');option.value=value;option.textContent=text;spriteSelect.append(option);
    }
    spriteSelect.addEventListener('change',()=>{onSpriteSetChange?.(spriteSelect.value);spriteSelect.value=getSpriteSet?.() || 'original';});
    panel.prepend(spriteLabel,spriteSelect);
    // Sandbox only: switch between soft steering, the walkable-area planner and freeform walking.
    if(getWalkMode?.()) {
      const walkLabel=document.createElement('label'),walkSelect=document.createElement('select');
      walkSelect.id=`atlas-debug-walk-${nextId}`;walkLabel.htmlFor=walkSelect.id;walkLabel.textContent='Walk';
      for(const [value,text] of [['steer','Steer (soft)'],['field','Walkable area'],['free','Freeform']]) {
        const option=document.createElement('option');option.value=value;option.textContent=text;walkSelect.append(option);
      }
      walkSelect.value=getWalkMode();
      walkSelect.addEventListener('change',()=>{onWalkModeChange?.(walkSelect.value);walkSelect.value=getWalkMode() || 'steer';});
      spriteSelect.after(walkLabel,walkSelect);
    }
    trigger=document.createElement('button');trigger.type='button';trigger.className='atlas-debug-trigger';
    trigger.title='Atlas settings';trigger.setAttribute('aria-label','Atlas settings');trigger.setAttribute('aria-expanded','false');
    const icon=document.createElement('i');icon.dataset.lucide='sliders-horizontal';icon.setAttribute('aria-hidden','true');trigger.append(icon);
    trigger.addEventListener('click',()=>panel.hidden ? open() : close({restore:true}));
    document.body.append(trigger);
    window.lucide?.createIcons();
  }
  const lensControls=[];
  if (onLensChange) for (const spec of [
    {key:'focusOffset',name:'Focus offset',min:-0.25,max:0.25,step:0.005,value:0},
    {key:'highlights',name:'Highlights',min:0,max:2,step:0.05,value:1}
  ]) {
    const line=document.createElement('div'), title=document.createElement('label');
    const input=document.createElement('input'), value=document.createElement('output');
    line.className='atlas-debug-row'; input.type='range'; input.id=`atlas-debug-${spec.key}-${nextId}`;
    input.min=String(spec.min); input.max=String(spec.max); input.step=String(spec.step); input.disabled=true;
    title.htmlFor=input.id; title.textContent=spec.name; value.htmlFor=input.id;
    line.append(title,value); panel.append(line,input);
    const control={...spec,input,output:value,timer:null,pending:null}; lensControls.push(control);
    const update=() => {
      value.value=Number(input.value).toFixed(2); input.setAttribute('aria-valuetext',value.value);
    };
    const commit=() => {
      clearTimeout(control.timer); control.timer=null;
      if (control.pending===null || destroyed || !available || !desktop.matches) return;
      onLensChange({[spec.key]:control.pending}); control.pending=null;
    };
    input.addEventListener('input',() => {
      if (!available || !desktop.matches || panel.hidden) return;
      update(); control.pending=Number(input.value); clearTimeout(control.timer); control.timer=setTimeout(commit,120);
    });
    input.addEventListener('change',() => {
      if (!available || !desktop.matches || panel.hidden) return;
      update(); control.pending=Number(input.value); commit();
    });
    control.commit=commit; control.update=update;
  }
  document.body.append(panel);

  let available = false, destroyed = false, timer = null, pending = null;
  let committed = strengthValue(getStrength?.());
  let previousFocus = null;

  function display(value) {
    range.value = String(value);
    output.value = `${Math.round(Number(range.value) * 100)}%`;
    range.setAttribute('aria-valuetext', output.value);
  }
  display(committed);

  function cancelPending() {
    clearTimeout(timer);
    timer = null;
    pending = null;
  }

  function resetLens(cancel=false) {
    for (const control of lensControls) {
      if (cancel) { clearTimeout(control.timer); control.timer=null; control.pending=null; }
      const value=getLens?.()?.[control.key];
      control.input.value=String(Number.isFinite(value) ? value : control.value); control.update();
    }
  }
  resetLens();

  function commit() {
    const value = pending;
    cancelPending();
    if (value === null || value === committed || destroyed || !available || !desktop.matches) return;
    committed = value;
    onStrengthChange(value);
  }

  function close({ cancel = false, restore = false } = {}) {
    if (cancel) cancelPending();
    else commit();
    if (cancel) resetLens(true);
    else for (const control of lensControls) control.commit();
    panel.hidden = true;
    trigger?.setAttribute('aria-expanded','false');
    if (restore && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }

  function open() {
    committed = strengthValue(getStrength ? getStrength() : committed);
    display(committed);
    resetLens();
    previousFocus = document.activeElement;
    panel.hidden = false;
    if(spriteSelect)spriteSelect.value=getSpriteSet?.() || 'original';
    trigger?.setAttribute('aria-expanded','true');
    (spriteSelect || (range.disabled ? panel : range)).focus({ preventScroll: true });
  }

  function popupOpen() {
    return document.querySelector('dialog[open], #atlas-languages:not([hidden])') !== null;
  }

  function keydown(event) {
    if (destroyed || (!desktop.matches && !spriteTrial) || event.defaultPrevented || event.isComposing || popupOpen()) return;
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      close({ restore: true });
      return;
    }
    if (!desktop.matches || event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || panel.contains(target) || target.isContentEditable || target.closest('[inert], dialog, #atlas-languages')) return;
    // The map is focusable for camera keys, but still owns the debug shortcut.
    if (target !== document.body && target !== document.documentElement && target.id !== 'world-canvas' && target.closest(interactiveSelector)) return;
    event.preventDefault();
    if (panel.hidden) open();
    else close({ restore: true });
  }

  function input() {
    if (destroyed || !available || !desktop.matches || panel.hidden) return;
    display(Number(range.value));
    pending = Number(range.value);
    clearTimeout(timer);
    timer = setTimeout(commit, 120);
  }

  function change() {
    if (destroyed || !available || !desktop.matches || panel.hidden) return;
    display(Number(range.value));
    pending = Number(range.value);
    commit();
  }

  function mediaChange() {
    range.disabled = !available || !desktop.matches;
    for (const control of lensControls) control.input.disabled=range.disabled;
    if (!desktop.matches && !spriteTrial) close({ cancel: true, restore: panel.contains(document.activeElement) });
  }

  document.addEventListener('keydown', keydown);
  desktop.addEventListener('change', mediaChange);
  range.addEventListener('input', input);
  range.addEventListener('change', change);

  return {
    setAvailable(value) {
      if (destroyed) return;
      available = Boolean(value);
      range.disabled = !available || !desktop.matches;
      for (const control of lensControls) control.input.disabled=range.disabled;
      status.hidden = available;
      status.textContent = available ? '' : 'WebGPU unavailable';
      if (!available) {
        cancelPending();
        resetLens(true);
        display(committed);
        if (!panel.hidden && document.activeElement === range) panel.focus({ preventScroll: true });
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      close({ cancel: true, restore: panel.contains(document.activeElement) });
      document.removeEventListener('keydown', keydown);
      desktop.removeEventListener('change', mediaChange);
      range.removeEventListener('input', input);
      range.removeEventListener('change', change);
      panel.remove();
      trigger?.remove();
    }
  };
}
