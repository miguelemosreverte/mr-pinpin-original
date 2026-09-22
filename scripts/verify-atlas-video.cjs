'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const WIDTH = 192, HEIGHT = 128, MAX_BUFFER = 32 * 1024 * 1024;
const REGIONS = {
  centralWater: {x0: 0.32, x1: 0.59, y0: 0.30, y1: 0.44},
  stableHouseFacade: {x0: 0.14, x1: 0.26, y0: 0.62, y1: 0.70},
  bridge: {x0: 0.59, x1: 0.65, y0: 0.56, y1: 0.59},
};

function run(command, args) {
  try {
    return execFileSync(command, args, {maxBuffer: MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe']});
  } catch (error) {
    const detail = error.code === 'ENOENT' ? 'not found on PATH' :
      error.code === 'ENOBUFS' ? '32 MiB output limit exceeded; use a shorter input clip' :
        String(error.stderr || error.message).trim();
    throw new Error(`${command}: ${detail}`);
  }
}

function numeric(value) {
  return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
}

function rate(value) {
  const [numerator, denominator = 1] = String(value).split('/').map(Number);
  return denominator && Number.isFinite(numerator / denominator) ? numerator / denominator : null;
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b), n = sorted.length;
  return {
    min: sorted[0], max: sorted[n - 1],
    mean: values.reduce((sum, value) => sum + value, 0) / n,
    median: n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
  };
}

function ratio(value, baseline) {
  return baseline > 0 ? value / baseline : null;
}

function measure(raw, frameCount, bounds) {
  const pixels = {
    x0: Math.floor(bounds.x0 * WIDTH), x1: Math.ceil(bounds.x1 * WIDTH),
    y0: Math.floor(bounds.y0 * HEIGHT), y1: Math.ceil(bounds.y1 * HEIGHT),
  };
  const area = (pixels.x1 - pixels.x0) * (pixels.y1 - pixels.y0);
  const frameBytes = WIDTH * HEIGHT, adjacent = [], drift = [], luminance = [];
  for (let frame = 0; frame < frameCount; frame++) {
    let deltaSum = 0, driftSum = 0, luminanceSum = 0;
    for (let y = pixels.y0; y < pixels.y1; y++) {
      for (let x = pixels.x0; x < pixels.x1; x++) {
        const offset = y * WIDTH + x, value = raw[frame * frameBytes + offset];
        luminanceSum += value;
        if (frame > 0) {
          deltaSum += Math.abs(value - raw[(frame - 1) * frameBytes + offset]);
          driftSum += Math.abs(value - raw[offset]);
        }
      }
    }
    luminance.push(luminanceSum / area);
    if (frame > 0) {
      adjacent.push(deltaSum / area);
      drift.push(driftSum / area);
    }
  }
  const adjacentStats = stats(adjacent), luminanceStats = stats(luminance);
  const seamMAE = drift[drift.length - 1];
  return {
    normalizedBounds: bounds, pixelBoundsExclusive: pixels, pixelCount: area,
    adjacentMAE: {...adjacentStats, values: adjacent},
    seamMAE, seamToMedianAdjacentRatio: ratio(seamMAE, adjacentStats.median),
    staticDriftFromFirstMAE: {...stats(drift), final: seamMAE, values: drift},
    frameMeanLuminance: {...luminanceStats, range: luminanceStats.max - luminanceStats.min, values: luminance},
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: node scripts/verify-atlas-video.cjs VIDEO [REPORT.json]');
    return;
  }
  if (args.length < 1 || args.length > 2) throw new Error('Usage: node scripts/verify-atlas-video.cjs VIDEO [REPORT.json]');
  const input = path.resolve(args[0]), output = args[1] && path.resolve(args[1]);
  const inputStat = fs.statSync(input);
  if (!inputStat.isFile()) throw new Error('VIDEO must be a local file');
  if (output && fs.existsSync(output)) {
    const outputStat = fs.statSync(output);
    if (inputStat.dev === outputStat.dev && inputStat.ino === outputStat.ino) {
      throw new Error('REPORT must not overwrite VIDEO');
    }
  }
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', input]));
  const video = probe.streams.find(stream => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
  if (!video) throw new Error('No video stream found');
  // Passthrough retains every decoded source frame, including the true final frame.
  const raw = run('ffmpeg', [
    '-v', 'error', '-xerror', '-nostdin', '-threads', '2', '-noautorotate', '-i', input,
    '-map', `0:${video.index}`, '-an', '-sn', '-dn', '-filter_threads', '1',
    '-vf', `scale=${WIDTH}:${HEIGHT}:flags=area,format=gray`,
    '-fps_mode', 'passthrough', '-pix_fmt', 'gray', '-f', 'rawvideo', 'pipe:1',
  ]);
  const frameCount = raw.length / (WIDTH * HEIGHT);
  if (!Number.isInteger(frameCount) || frameCount < 2) throw new Error('Need at least two complete decoded frames');
  const global = measure(raw, frameCount, {x0: 0, x1: 1, y0: 0, y1: 1});
  const regions = Object.fromEntries(Object.entries(REGIONS).map(([name, bounds]) => [name, measure(raw, frameCount, bounds)]));
  const report = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), input,
    metadata: {
      width: video.width, height: video.height, codec: video.codec_name,
      fps: rate(video.avg_frame_rate) || rate(video.r_frame_rate),
      averageFrameRate: video.avg_frame_rate, nominalFrameRate: video.r_frame_rate,
      durationSeconds: numeric(video.duration) ?? numeric(probe.format?.duration),
      containerDurationSeconds: numeric(probe.format?.duration), bytes: inputStat.size,
      reportedFrameCount: numeric(video.nb_frames),
      hasAudio: probe.streams.some(stream => stream.codec_type === 'audio'),
      audio: probe.streams.filter(stream => stream.codec_type === 'audio').map(stream => ({
        index: stream.index, codec: stream.codec_name, channels: stream.channels,
        sampleRate: numeric(stream.sample_rate), durationSeconds: numeric(stream.duration),
      })),
    },
    analysis: {
      width: WIDTH, height: HEIGHT, frameCount, rawBytes: raw.length,
      sampling: 'Every decoded native frame in presentation order; no interpolation or FPS conversion.',
      geometry: 'Full coded image resized to 192x128; no crop, padding, or autorotation. Bounds are normalized to that image.',
      units: 'MAE and luminance use grayscale code values in [0,255], not physical light measurements.',
      definitions: {
        adjacentMAE: 'Pixel mean absolute error between consecutive frames; values[i] compares frames i and i+1.',
        seamMAE: 'Pixel mean absolute error between the actual final decoded frame and the first frame.',
        seamToMedianAdjacentRatio: 'Seam MAE divided by median adjacent MAE; null when the denominator is zero.',
        staticDriftFromFirstMAE: 'Pixel MAE against the first frame for every later frame; includes motion, lighting and compression changes.',
        frameMeanLuminance: 'Mean grayscale per frame; range is maximum minus minimum of those means.',
      },
    },
    global, regions,
    comparisons: Object.fromEntries(['stableHouseFacade', 'bridge'].map(name => [name, {
      waterToRegionMeanAdjacentRatio: ratio(regions.centralWater.adjacentMAE.mean, regions[name].adjacentMAE.mean),
      waterToRegionMeanDriftRatio: ratio(regions.centralWater.staticDriftFromFirstMAE.mean, regions[name].staticDriftFromFirstMAE.mean),
    }])),
    limitations: [
      'Descriptive metrics only: no universal quality pass/fail threshold, and metrics cannot prove visual quality or a seamless loop.',
      'Fixed regions assume atlas framing; inspect their placement if the composition changes. The bridge sample is particularly small.',
      'Downscaled grayscale misses color changes and fine artifacts. Drift is not a geometric displacement estimate.',
      'Adjacent differences depend on native frame cadence; compare FPS and framing when comparing clips. Audio is metadata-only.',
    ],
  };
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  const display = value => value == null ? 'undefined (zero baseline)' : value.toFixed(4);
  console.log(`${input}\n${video.width}x${video.height} | ${report.metadata.fps ?? 'unknown'} fps | ${report.metadata.durationSeconds ?? 'unknown'} s | ${inputStat.size} bytes | audio: ${report.metadata.hasAudio ? 'yes' : 'no'}`);
  console.log(`Audited ${frameCount} native frames at ${WIDTH}x${HEIGHT} grayscale; MAE units: 0-255.`);
  for (const [name, sample] of Object.entries({global, ...regions})) {
    console.log(`${name}: adjacent mean/median/max ${display(sample.adjacentMAE.mean)}/${display(sample.adjacentMAE.median)}/${display(sample.adjacentMAE.max)} | seam ${display(sample.seamMAE)} | seam/median ${display(sample.seamToMedianAdjacentRatio)} | drift mean/max ${display(sample.staticDriftFromFirstMAE.mean)}/${display(sample.staticDriftFromFirstMAE.max)} | luminance range ${display(sample.frameMeanLuminance.range)}`);
  }
  console.log(report.limitations[0]);
  if (output) console.log(`Report: ${output}`);
}

try { main(); } catch (error) { console.error(`Video audit failed: ${error.message}`); process.exitCode = 1; }
