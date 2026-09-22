(() => {
  window.FamilyProductionStage = { create({ canvas, manifest, faceMetadata, cache, url, reducedMotion }) {
    const ids = ['pinpin', 'mr-pompom', 'mama'];
    const members = ids.map(id => ({ spec: manifest.characters.find(c => c.id === id), id,
      mood: AtlasExpressionMotion.create({ seed: id, reducedMotion, maxHeadTilt: 2, maxHeadYaw: 0, maxGazeX: 0, maxGazeY: 0 }) }));
    const faces = AtlasFaceLayer.create({ resolveImage: src => cache.peek(url(src)) });
    let angle = 90, sources = [], elapsed = 0, manualFrame = null, duration = 190;
    function configure() {
      const bodySources = [], eyeSources = [];
      for (const member of members) {
        member.direction = member.spec?.directions.find(d => d.angle === angle);
        member.src = member.direction?.runtimeSrc || member.direction?.src;
        if (!member.src) continue;
        bodySources.push(url(member.src));
        member.direction.frames.forEach((frame, index) => {
          frame.id = `${member.src}#${angle}#${index}`;
          frame.face = faceMetadata.frames?.[frame.id];
          for (const eye of frame.face?.eyes || []) {
            if (eye.blink?.src) eyeSources.push(url(eye.blink.src));
            for (const asset of Object.values(eye.gaze || {})) if (asset.src) eyeSources.push(url(asset.src));
          }
        });
      }
      sources = [...new Set([...bodySources, ...eyeSources])]; faces.clear();
      canvas.ariaLabel = `PinPin, Mr. PomPom and Mama walking at ${angle} degrees`;
    }
    function paint(time = elapsed, selected = manualFrame, frameDuration = duration) {
      elapsed = time; manualFrame = selected; duration = frameDuration;
      const width = canvas.clientWidth || 1, dpr = Math.min(3, devicePixelRatio || 1);
      const zoom = Math.min(3.5, (width - 28) / 240);
      let above = 45, below = 4;
      for (const member of members) if (member.direction) {
        const scale = member.spec.displayWidth / member.direction.referenceWidth;
        for (const f of member.direction.frames) {
          above = Math.max(above, f.anchor[1] * scale); below = Math.max(below, (f.rect[3] - f.anchor[1]) * scale);
        }
      }
      const height = Math.ceil(Math.max(175, (above + below) * zoom + 70)), ground = height - below * zoom - 42;
      canvas.style.height = height + 'px';
      if (canvas.width !== Math.ceil(width * dpr)) canvas.width = Math.ceil(width * dpr);
      if (canvas.height !== Math.ceil(height * dpr)) canvas.height = Math.ceil(height * dpr);
      const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#d2dad5'; ctx.beginPath(); ctx.moveTo(16, ground + 1); ctx.lineTo(width - 16, ground + 1); ctx.stroke();
      const starts = [40, 112, 196], start = (width - 240 * zoom) / 2;
      members.forEach((member, index) => {
        const direction = member.direction, image = member.src && cache.peek(url(member.src));
        const x = start + starts[index] * zoom;
        ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#475f51';
        ctx.fillText(member.spec?.name || member.id, x, height - 14);
        member.ready = Boolean(image && direction); if (!member.ready) return;
        const phase = elapsed / duration * 56 / member.spec.displayWidth + index * .8;
        member.frame = manualFrame ?? Math.floor(phase) % 4;
        const frame = direction.frames[member.frame], scale = member.spec.displayWidth / direction.referenceWidth * zoom;
        member.expression = member.mood.evaluateElapsed(elapsed, true, angle);
        member.prepared = faces.prepare({ image, frame });
        const lift = manualFrame === null ? .7 * Math.sin(Math.PI * phase) ** 2 * zoom : 0;
        ctx.save(); ctx.translate(x, ground);
        ctx.fillStyle = 'rgba(28,40,33,.10)'; ctx.beginPath(); ctx.ellipse(0, 0, member.spec.displayWidth * zoom * .18, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        faces.draw(ctx, member.prepared, { scale, lift, tiltDegrees: member.expression.headTilt, blink: member.expression.blink > .5 });
        ctx.restore();
      });
      canvas.dataset.ready = String(members.every(member => member.ready)); canvas.dataset.angle = String(angle);
      canvas.dataset.frames = members.map(member => member.frame ?? '-').join(',');
    }
    configure();
    return { paint, get sources() { return sources; }, get angle() { return angle; },
      setAngle(value) { angle = (value + 360) % 360; configure(); paint(); },
      invalidateFaces() { faces.clear(); },
      setReducedMotion(value) { for (const member of members) member.mood.setReducedMotion(value); },
      get diagnostics() { return { angle, elapsed, cache: faces.stats, members: members.map(member => ({
        id: member.id, ready: member.ready, frame: member.frame, source: member.src,
        expression: member.expression, capabilities: member.prepared?.capabilities || null,
        headReason: member.prepared?.headReason || null, diagnostics: member.prepared?.diagnostics || [],
        blinkReason: member.prepared?.blinkReason || null, blinkCoverage: member.prepared?.blinkCoverage || null
      })) }; } };
  } };
})();
