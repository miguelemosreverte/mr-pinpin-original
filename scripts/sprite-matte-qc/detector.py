"""Conservative enclosed-gap anomaly detector; no frame-number or position overrides."""
from dataclasses import asdict, dataclass

import numpy as np
from scipy import ndimage as ndi


@dataclass(frozen=True)
class Settings:
    output_min: int = 225
    output_chroma: int = 25
    opaque_min: int = 160
    native_min: int = 232
    native_chroma: int = 20
    min_area: int = 8
    max_area: int = 1500
    neighbor_radius: int = 3
    native_difference: int = 15
    support_fraction: float = 0.80
    required_supports: int = 2
    lower_body_fraction: float = 0.78
    repair_radius: int = 5


def neutral(rgb, minimum, chroma):
    return (rgb.min(axis=2) >= minimum) & (np.ptp(rgb.astype(np.int16), axis=2) <= chroma)


def detect(native, rgba, settings=Settings()):
    """Return review records and strong seed masks; unchanged inputs are required."""
    assert native.shape == (*rgba.shape[:3], 3)
    records, strong = [], []
    for frame in range(len(rgba)):
        alpha = rgba[frame, :, :, 3]
        body_y, body_x = np.where(alpha >= 160)
        if not len(body_y):
            continue
        top, bottom = int(body_y.min()), int(body_y.max()) + 1
        candidates = neutral(rgba[frame, :, :, :3], settings.output_min,
                             settings.output_chroma) & (alpha >= settings.opaque_min)
        labels, _ = ndi.label(candidates)
        native_white = neutral(native[frame], settings.native_min, settings.native_chroma)
        native_labels, _ = ndi.label(native_white)
        border_ids = np.unique(np.concatenate((native_labels[0], native_labels[-1],
                                               native_labels[:, 0], native_labels[:, -1])))
        for label, box in enumerate(ndi.find_objects(labels), 1):
            if box is None:
                continue
            seed = labels[box] == label
            area = int(seed.sum())
            if area < settings.min_area:
                continue
            y, x = box
            roi = (slice(max(0, y.start-6), min(alpha.shape[0], y.stop+6)),
                   slice(max(0, x.start-6), min(alpha.shape[1], x.stop+6)))
            local_count = int(candidates[roi].sum())
            cy = (y.start + y.stop) / 2
            lower = cy >= top + settings.lower_body_fraction * (bottom - top)
            native_fraction = float(native_white[box][seed].mean())
            ids = native_labels[box][seed]
            positive = ids[ids > 0]
            dominant = int(np.bincount(positive).argmax()) if len(positive) else 0
            enclosed = dominant > 0 and dominant not in border_ids
            component_size = int((native_labels == dominant).sum()) if dominant else 0
            neighbor_records, supports = [], []
            for other in range(max(0, frame-settings.neighbor_radius),
                               min(len(rgba), frame+settings.neighbor_radius+1)):
                if other == frame:
                    continue
                rgb = native[other][box]
                difference = np.max(np.abs(rgb.astype(np.int16) - native[frame][box]), axis=2)
                compatible = neutral(rgb, settings.native_min, settings.native_chroma)
                compatible &= difference <= settings.native_difference
                compatible &= rgba[other, :, :, 3][box] < 32
                fraction = float(compatible[seed].mean())
                local_white = neutral(rgba[other, :, :, :3][roi], settings.output_min,
                                      settings.output_chroma) & (rgba[other, :, :, 3][roi] >= settings.opaque_min)
                neighbor_records.append({'frame': other, 'compatible_transparent_fraction': fraction,
                    'local_opaque_neutral_pixels': int(local_white.sum()),
                    'native_mean_max_channel_difference': float(difference[seed].mean()),
                    'mean_alpha': float(rgba[other, :, :, 3][box][seed].mean())})
                if fraction >= settings.support_fraction:
                    supports.append(other)
            gates = {'lower_body': bool(lower), 'small_component': area <= settings.max_area,
                     'native_neutral': native_fraction >= settings.support_fraction,
                     'enclosed_native_gap': bool(enclosed and component_size <= settings.max_area*2),
                     'matching_transparent_neighbors': len(supports) >= settings.required_supports}
            accepted = all(gates.values())
            record = {'id': f'f{frame:03d}-c{label:04d}', 'frame': frame,
                'bbox_xyxy': [x.start, y.start, x.stop, y.stop], 'area': area,
                'output_mean_rgb': rgba[frame, :, :, :3][box][seed].mean(axis=0).tolist(),
                'native_mean_rgb': native[frame][box][seed].mean(axis=0).tolist(),
                'mean_alpha': float(alpha[box][seed].mean()),
                'local_roi_xyxy': [roi[1].start, roi[0].start, roi[1].stop, roi[0].stop],
                'local_opaque_neutral_pixels': local_count,
                'native_neutral_fraction': native_fraction, 'native_component_area': component_size,
                'supports': supports, 'neighbors': neighbor_records, 'gates': gates,
                'confidence': 'repair-candidate' if accepted else 'amber-review-only',
                'confidence_is_probability': False, 'action': 'review-required' if accepted else 'none'}
            records.append(record)
            if accepted:
                full_seed = np.zeros(alpha.shape, dtype=bool)
                full_seed[box] = seed
                strong.append((record, full_seed))
    return records, strong


def repair(native, rgba, strong, settings=Settings()):
    """Refine only a small disoccluded-gap trimap using PyMatting's existing solver."""
    from pymatting import estimate_alpha_cf, estimate_foreground_ml
    result = rgba.copy()
    repairs = []
    for record, seed in strong:
        frame = record['frame']
        x0, y0, x1, y1 = record['bbox_xyxy']
        pad = settings.repair_radius + 12
        box = (slice(max(0, y0-pad), min(rgba.shape[1], y1+pad)),
               slice(max(0, x0-pad), min(rgba.shape[2], x1+pad)))
        rgb = native[frame][box].astype(float) / 255
        # Later overlapping repairs may only lower the accumulated alpha, never restore it.
        old = result[frame][box].copy()
        local_seed = seed[box]
        allowed = ndi.binary_dilation(local_seed, iterations=settings.repair_radius)
        trimap = np.full(old.shape[:2], 0.5)
        trimap[old[:, :, 3] < 8] = 0
        trimap[(old[:, :, 3] > 247) & ~allowed] = 1
        # Native-neutral seed is strong background. The small surrounding ring stays unknown.
        sure_bg = local_seed & neutral(native[frame][box], settings.native_min, settings.native_chroma)
        trimap[sure_bg] = 0
        alpha = estimate_alpha_cf(rgb, trimap)
        proposed = np.rint(np.clip(alpha, 0, 1) * 255).astype(np.uint8)
        proposed = np.minimum(proposed, old[:, :, 3])
        changed = allowed & (proposed < old[:, :, 3])
        final_alpha = old[:, :, 3].astype(float)/255
        final_alpha[changed] = proposed[changed]/255
        foreground = np.rint(np.clip(estimate_foreground_ml(rgb, final_alpha), 0, 1)*255).astype(np.uint8)
        patch = result[frame][box]
        patch[changed, :3] = foreground[changed]
        patch[changed, 3] = proposed[changed]
        repairs.append({'candidate': record['id'], 'frame': frame,
            'patch_bbox_xyxy': [box[1].start, box[0].start, box[1].stop, box[0].stop],
            'allowed_radius_pixels': settings.repair_radius, 'changed_pixels': int(changed.sum()),
            'changed_opaque_to_transparent': int(((old[:, :, 3] >= 160) & (patch[:, :, 3] < 32)).sum()),
            'outside_allowed_unchanged': bool(np.array_equal(patch[~allowed], old[~allowed])),
            'alpha_never_increased': bool(np.all(patch[:, :, 3] <= old[:, :, 3]))})
    return result, repairs


def settings_record(settings=Settings()):
    return asdict(settings)
