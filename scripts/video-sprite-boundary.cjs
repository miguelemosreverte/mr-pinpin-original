'use strict';

// Playback time excludes pauses; wall time measures the user's actual wait.
function createBoundaryState(cycleMs = 1000) {
  if (!Number.isFinite(cycleMs) || cycleMs <= 0) throw Error('Invalid cycle duration');
  return {cycleMs, active: 0, pending: null, requestedAt: null, cycle: 0, playbackMs: 0, lastLatencyMs: null};
}

function queueAngle(state, angleIndex, wallMs) {
  if (![0, 1].includes(angleIndex) || !Number.isFinite(wallMs)) throw Error('Invalid angle request');
  if (angleIndex === state.active) return {...state, pending: null, requestedAt: null};
  if (angleIndex === state.pending) return state;
  return {...state, pending: angleIndex, requestedAt: wallMs};
}

function advanceBoundary(state, playbackMs, wallMs) {
  if (!Number.isFinite(playbackMs) || playbackMs < state.playbackMs || !Number.isFinite(wallMs))
    throw Error('Playback clock must be finite and monotonic');
  const cycle = Math.floor(playbackMs / state.cycleMs);
  const next = {...state, playbackMs, cycle};
  if (cycle > state.cycle && state.pending !== null) {
    if (wallMs < state.requestedAt) throw Error('Wall clock moved backwards');
    next.active = state.pending;
    next.pending = null;
    next.lastLatencyMs = wallMs - state.requestedAt;
    next.requestedAt = null;
  }
  return next;
}

if (typeof module !== 'undefined') module.exports = {createBoundaryState, queueAngle, advanceBoundary};
