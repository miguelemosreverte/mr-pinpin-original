(() => {
  const MAX_TILT = 2, radians = degrees => degrees * Math.PI / 180;
  const rect = value => Array.isArray(value) && value.length === 4 && value.every(Number.isInteger) &&
    value[0] >= 0 && value[1] >= 0 && value[2] > 0 && value[3] > 0;
  const contains = (outer, inner, pad = 0) => inner[0] >= outer[0] + pad && inner[1] >= outer[1] + pad &&
    inner[0] + inner[2] <= outer[0] + outer[2] - pad && inner[1] + inner[3] <= outer[1] + outer[3] - pad;
  const size = image => [image?.naturalWidth || image?.width || 0, image?.naturalHeight || image?.height || 0];
  const validSource = (image, crop) => rect(crop) && contains([0, 0, ...size(image)], crop);

  function create({ maxEntries = 12, maxBytes = 16 * 1024 * 1024,
    resolveImage = () => null, createCanvas = () => document.createElement('canvas') } = {}) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || !Number.isFinite(maxBytes) || maxBytes < 4) {
      throw new RangeError('Face cache requires positive entry and byte limits');
    }
    const cache = new Map();
    let bytes = 0, allocations = 0, hits = 0;
    function surface(entry, width, height) {
      const cost = width * height * 4;
      if (entry.bytes + cost > maxBytes) throw Error('budget');
      while (cache.size && bytes + entry.bytes + cost > maxBytes) remove(cache.keys().next().value);
      const canvas = createCanvas(); canvas.width = width; canvas.height = height;
      entry.surfaces.push(canvas); entry.bytes += cost; allocations++;
      return canvas;
    }
    function release(entry) {
      for (const canvas of entry.surfaces) canvas.width = canvas.height = 1;
      entry.surfaces.length = 0; entry.bytes = 0; entry.disposed = true;
    }
    function remove(frame) {
      const entry = cache.get(frame);
      if (!entry) return;
      bytes -= entry.bytes; cache.delete(frame); release(entry);
    }
    function opaque(pixels, width, bounds) {
      const [x, y, w, h] = bounds;
      for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
        if (pixels[(row * width + col) * 4 + 3] < 245) return false;
      }
      return true;
    }
    function mask(entry, bounds, feather) {
      const canvas = surface(entry, bounds[2], bounds[3]), ctx = canvas.getContext('2d');
      const image = ctx.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const distance = Math.min(x, y, canvas.width - 1 - x, canvas.height - 1 - y);
        const t = Math.max(0, Math.min(1, distance / feather));
        image.data[(y * canvas.width + x) * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
      }
      ctx.putImageData(image, 0, 0);
      return canvas;
    }
    function variant(entry, asset, eye, pixels, width, height, label) {
      if (!asset) return null;
      const diagnostic = { label, accepted: false, reason: null, meanError: null, maxError: null, samples: 0,
        tolerance: { meanError: asset.registrationTolerance?.meanError ?? 0, maxError: asset.registrationTolerance?.maxError ?? 0 } };
      entry.diagnostics.push(diagnostic);
      let candidate;
      const reject = reason => {
        if (candidate) {
          entry.surfaces.pop(); entry.bytes -= candidate.width * candidate.height * 4;
          candidate.width = candidate.height = 1;
        }
        diagnostic.reason = reason; return null;
      };
      const limits = diagnostic.tolerance;
      if (!Number.isFinite(limits.meanError) || !Number.isFinite(limits.maxError) || limits.meanError < 0 ||
        limits.meanError > 12 || limits.maxError < limits.meanError || limits.maxError > 60) return reject('invalid-registration-tolerance');
      if (asset.registration !== entry.frame.id) return reject('registration');
      try {
        const image = asset.image || resolveImage(asset.src);
        if (!validSource(image, asset.rect) || asset.rect[2] !== width || asset.rect[3] !== height) return reject('source-dimensions');
        const [x, y, w, h] = eye.bounds;
        const canvas = surface(entry, w, h), ctx = canvas.getContext('2d');
        candidate = canvas;
        ctx.drawImage(image, asset.rect[0] + x, asset.rect[1] + y, w, h, 0, 0, w, h);
        const overlayImage = ctx.getImageData(0, 0, w, h), overlay = overlayImage.data;
        if (!opaque(overlay, w, [0, 0, w, h])) return reject('transparent-eye-boundary');
        // Tolerance is opt-in for reviewed matching art; defaults remain exact.
        let total = 0, maximum = 0, samples = 0;
        for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
          if (Math.min(col, row, w - 1 - col, h - 1 - row) > eye.feather) continue;
          for (let channel = 0; channel < 3; channel++) {
            const error = Math.abs(overlay[(row * w + col) * 4 + channel] - pixels[((row + y) * width + col + x) * 4 + channel]);
            total += error; maximum = Math.max(maximum, error); samples++;
          }
        }
        diagnostic.samples = samples; diagnostic.meanError = total / samples; diagnostic.maxError = maximum;
        if (diagnostic.meanError > limits.meanError || maximum > limits.maxError) return reject('feather-band-mismatch');
        for (let i = 3; i < overlay.length; i += 4) overlay[i] = 255;
        ctx.putImageData(overlayImage, 0, 0);
        ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(eye.mask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        diagnostic.accepted = true;
        return canvas;
      } catch (error) { return reject(error.message || 'unreadable-eye-source'); }
    }
    function prepare({ image, frame, face = frame?.face } = {}) {
      if (!frame || !validSource(image, frame.rect) || !Array.isArray(frame.anchor) ||
        frame.anchor.length !== 2 || !frame.anchor.every(Number.isFinite)) throw new TypeError('Valid source frame and anchor required');
      const previous = cache.get(frame);
      if (previous && previous.image === image && previous.face === face && previous.revision === frame.revision) {
        cache.delete(frame); cache.set(frame, previous); hits++; return previous;
      }
      remove(frame);
      const entry = { image, frame, face, revision: frame.revision, enabled: false, reason: 'unconfigured',
        surfaces: [], bytes: 0, disposed: false, eyes: [], diagnostics: [], tilt: 0, headReason: 'unconfigured',
        capabilities: { headTilt: false, blink: false, gaze: false, yaw: false } };
      try {
        if (face?.enabled === true) {
          const width = frame.rect[2], height = frame.rect[3], crop = [0, 0, width, height];
          if (typeof frame.id !== 'string' || !frame.id || face.registration !== frame.id) throw Error('registration');
          entry.source = surface(entry, width, height);
          const ctx = entry.source.getContext('2d');
          ctx.drawImage(image, ...frame.rect, 0, 0, width, height);
          const sourcePixels = ctx.getImageData(0, 0, width, height), pixels = sourcePixels.data;
          // Valid near-opaque samples fully replace old facial features. The
          // final source-atop pass retains the original body's alpha exactly.
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i] >= 245) pixels[i] = 255;
          ctx.putImageData(sourcePixels, 0, 0);
          const eyeSpecs = Array.isArray(face.eyes) ? face.eyes : [];
          const tilt = Number.isFinite(face.maxTiltDegrees) ? Math.max(0, Math.min(MAX_TILT, face.maxTiltDegrees)) : MAX_TILT;
          entry.headReason = 'disabled';
          if (tilt > 0) try {
            const feather = face.feather ?? 4;
            if (!rect(face.bounds) || !contains(crop, face.bounds) || !rect(face.features) ||
              !Number.isInteger(feather) || feather < 1 ||
              !contains(face.bounds, face.features, feather + 2) ||
              !Array.isArray(face.pivot) || face.pivot.length !== 2 || !face.pivot.every(Number.isFinite)) throw Error('landmarks');
            const [fx, fy, fw, fh] = face.bounds, [px, py] = face.pivot;
            if (px < fx || px > fx + fw || py < fy || py > fy + fh) throw Error('pivot');
            const radius = Math.max(...[[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]]
              .map(([x, y]) => Math.hypot(x - px, y - py)));
            const margin = Math.ceil(radius * radians(tilt)) + 2;
            const guard = [fx - margin, fy - margin, fw + margin * 2, fh + margin * 2];
            if (!contains(crop, guard) || !contains(face.bounds, face.features, feather + margin)) throw Error('tilt-guard');
            if (!opaque(pixels, width, guard)) throw Error('transparent-face-boundary');
            if (eyeSpecs.some(eye => rect(eye?.bounds) && !contains(face.features, eye.bounds))) throw Error('eyes-outside-head-guard');
            if (entry.bytes + fw * fh * 8 + width * height * 4 > maxBytes) throw Error('budget');
            entry.mask = mask(entry, face.bounds, feather); entry.patch = surface(entry, fw, fh);
            entry.tilt = tilt; entry.headReason = null;
          } catch (error) { entry.headReason = error.message; }
          for (const [index, spec] of eyeSpecs.entries()) {
            const eyeFeather = spec?.feather ?? 2;
            if (!rect(spec?.bounds) || !contains(crop, spec.bounds) ||
              !Number.isInteger(eyeFeather) || eyeFeather < 1 || Math.min(spec.bounds[2], spec.bounds[3]) <= eyeFeather * 2 + 2 ||
              !opaque(pixels, width, spec.bounds)) {
              entry.diagnostics.push({ label: `eyes[${index}]`, accepted: false, reason: 'eye-bounds-or-opacity' });
              continue;
            }
            const eye = { bounds: spec.bounds, feather: eyeFeather, gaze: Object.create(null) };
            eye.mask = mask(entry, eye.bounds, eyeFeather);
            eye.blink = variant(entry, spec.blink, eye, pixels, width, height, `eyes[${index}].blink`);
            for (const [name, asset] of Object.entries(spec.gaze || {})) {
              const value = variant(entry, asset, eye, pixels, width, height, `eyes[${index}].gaze.${name}`);
              if (value) eye.gaze[name] = value;
            }
            if (eye.blink || Object.keys(eye.gaze).length) entry.eyes.push(eye);
          }
          const acceptedBlinks = entry.eyes.filter(eye => eye.blink).length;
          const expected = face.expectedEyes;
          const allRequired = face.requireAllEyes === true;
          const validExpected = expected === undefined || Number.isInteger(expected) && expected >= 1;
          const complete = acceptedBlinks === eyeSpecs.length && validExpected && (expected === undefined || acceptedBlinks >= expected);
          const canBlink = acceptedBlinks > 0 && (!allRequired || complete);
          const canGaze = entry.eyes.some(eye => Object.keys(eye.gaze).length > 0);
          entry.blinkCoverage = { requireAllEyes: allRequired, authored: eyeSpecs.length, accepted: acceptedBlinks, expected: expected ?? null };
          entry.blinkReason = canBlink ? null : allRequired && !validExpected ? 'invalid-expected-eyes' :
            acceptedBlinks ? 'incomplete-eye-coverage' : 'no-registered-blink';
          entry.enabled = entry.tilt > 0 || canBlink || canGaze;
          entry.reason = entry.enabled ? null : entry.headReason || 'no-registered-layers';
          if (entry.enabled) entry.output = surface(entry, width, height);
          else { release(entry); entry.disposed = false; }
          entry.capabilities.headTilt = entry.tilt > 0;
          entry.capabilities.blink = canBlink;
          entry.capabilities.gaze = canGaze;
        }
      } catch (error) {
        release(entry); entry.disposed = false; entry.enabled = false;
        entry.reason = error.message || 'unreadable-source';
      }
      while (cache.size >= maxEntries || bytes + entry.bytes > maxBytes) remove(cache.keys().next().value);
      cache.set(frame, entry); bytes += entry.bytes;
      return entry;
    }
    function draw(ctx, entry, { scale = 1, lift = 0, tiltDegrees = 0, blink = false, gaze = null } = {}) {
      if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(lift)) throw new RangeError('Positive scale and finite lift required');
      const { image, frame } = entry;
      const x = -frame.anchor[0] * scale, y = -frame.anchor[1] * scale - lift;
      if (!entry.enabled || entry.disposed) {
        ctx.drawImage(image, ...frame.rect, x, y, frame.rect[2] * scale, frame.rect[3] * scale);
        return false;
      }
      const tilt = Number.isFinite(tiltDegrees) ? Math.max(-entry.tilt, Math.min(entry.tilt, tiltDegrees)) : 0;
      let eyesActive = false;
      for (const eye of entry.eyes) {
        eye.active = blink && entry.capabilities.blink ? eye.blink : eye.gaze[gaze];
        if (eye.active) eyesActive = true;
      }
      if (!tilt && !eyesActive) {
        ctx.drawImage(image, ...frame.rect, x, y, frame.rect[2] * scale, frame.rect[3] * scale);
        return false;
      }
      const output = entry.output.getContext('2d');
      output.clearRect(0, 0, entry.output.width, entry.output.height);
      output.drawImage(image, ...frame.rect, 0, 0, frame.rect[2], frame.rect[3]);
      output.globalCompositeOperation = 'source-atop';
      if (tilt) {
        const [fx, fy, fw, fh] = entry.face.bounds, [px, py] = entry.face.pivot;
        const patch = entry.patch.getContext('2d');
        patch.clearRect(0, 0, fw, fh); patch.save();
        patch.translate(px - fx, py - fy); patch.rotate(radians(tilt)); patch.translate(-px, -py);
        patch.drawImage(entry.source, 0, 0);
        for (const eye of entry.eyes) if (eye.active) patch.drawImage(eye.active, eye.bounds[0], eye.bounds[1]);
        patch.restore();
        patch.globalCompositeOperation = 'destination-in'; patch.drawImage(entry.mask, 0, 0);
        patch.globalCompositeOperation = 'source-over';
        // Fixed body-space mask; never rotate or cut apart the body silhouette.
        output.drawImage(entry.patch, fx, fy);
      } else {
        for (const eye of entry.eyes) if (eye.active) output.drawImage(eye.active, eye.bounds[0], eye.bounds[1]);
      }
      output.globalCompositeOperation = 'source-over';
      // Submit once so caller opacity/compositing applies equally to all layers.
      ctx.drawImage(entry.output, x, y, frame.rect[2] * scale, frame.rect[3] * scale);
      return true;
    }
    return { prepare, draw, invalidate: remove,
      clear() { for (const frame of cache.keys()) remove(frame); },
      get stats() { return { entries: cache.size, bytes, allocations, hits, maxEntries, maxBytes }; } };
  }
  window.AtlasFaceLayer = Object.freeze({ create, MAX_TILT });
})();
