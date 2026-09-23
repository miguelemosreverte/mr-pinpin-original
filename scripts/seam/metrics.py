"""Foreground seam diagnostics, not an automatic gait or seamlessness classifier."""
import numpy as np
from scipy.ndimage import binary_erosion, gaussian_filter


def mean_selected(values, mask):
    return float(values[mask].mean()) if mask.any() else None


def pair(native_a, native_b, alpha_a, alpha_b):
    foreground = (alpha_a >= 32) | (alpha_b >= 32)
    opaque = binary_erosion((alpha_a >= 240) & (alpha_b >= 240), iterations=2)
    a, b = native_a.astype(np.float32), native_b.astype(np.float32)
    low_a = gaussian_filter(a, sigma=(2, 2, 0))
    low_b = gaussian_filter(b, sigma=(2, 2, 0))
    shape_a, shape_b = alpha_a >= 128, alpha_b >= 128
    union = shape_a | shape_b
    return {
        'foreground_pixels': int(foreground.sum()),
        'opaque_interior_pixels': int(opaque.sum()),
        'alpha_mae_255_foreground': mean_selected(np.abs(alpha_a.astype(float)-alpha_b), foreground),
        'silhouette_iou': float((shape_a & shape_b).sum()/union.sum()) if union.any() else None,
        'native_rgb_mae_255_foreground': mean_selected(np.abs(a-b), foreground),
        'native_lowpass_mae_255_interior': mean_selected(np.abs(low_a-low_b), opaque),
        'native_highpass_mae_255_interior': mean_selected(np.abs((a-low_a)-(b-low_b)), opaque),
    }


def boundary(alpha, last):
    """Signed alpha derivatives at fixed pixels, NOT tracked limb velocity."""
    indices = [last-1, last, 0, 1]
    frames = alpha[indices].astype(np.float32)
    mask = np.any(frames >= 32, axis=0)
    incoming, wrap, outgoing = np.diff(frames, axis=0)
    def cosine(a, b):
        x, y = a[mask].astype(float), b[mask].astype(float)
        norm = np.linalg.norm(x)*np.linalg.norm(y)
        return float(np.dot(x, y)/norm) if norm else None
    return {
        'indices': indices,
        'incoming_alpha_step_mae': mean_selected(np.abs(incoming), mask),
        'wrap_alpha_step_mae': mean_selected(np.abs(wrap), mask),
        'outgoing_alpha_step_mae': mean_selected(np.abs(outgoing), mask),
        'incoming_to_wrap_cosine': cosine(incoming, wrap),
        'wrap_to_outgoing_cosine': cosine(wrap, outgoing),
        'incoming_to_outgoing_cosine': cosine(incoming, outgoing),
        'incoming_to_wrap_delta_mae': mean_selected(np.abs(wrap-incoming), mask),
        'wrap_to_outgoing_delta_mae': mean_selected(np.abs(outgoing-wrap), mask),
    }


def assess(native, alpha, fps):
    if native.shape != (*alpha.shape, 3) or len(alpha) < 4 or fps <= 0:
        raise ValueError('Matching RGB/alpha sequences and positive fps required')
    adjacent = [{'from': i, 'to': i+1, **pair(native[i], native[i+1], alpha[i], alpha[i+1])}
                for i in range(len(alpha)-1)]
    wraps = []
    for last in [len(alpha)-1, len(alpha)-2]:
        wraps.append({
            'samples': last+1, 'playback_duration_seconds': (last+1)/fps,
            'hypothetical_drop_last': last == len(alpha)-2,
            'endpoint': pair(native[last], native[0], alpha[last], alpha[0]),
            'boundary_alpha_motion': boundary(alpha, last),
        })
    return {'adjacent': adjacent, 'wraps': wraps,
            'status': 'visual_review_required_no_derivative_authorized',
            'limitations': [
                'No whole-background MAE. Foreground is the union of alpha >=32.',
                'Matte errors affect silhouette scores; no motion registration is applied.',
                'Highpass differences suggest detail variation but also respond to moving texture.',
                'Signed alpha derivatives are image changes, not optical flow or paw velocities.',
                'Identical endpoints can still produce a hold or velocity discontinuity.',
                'No score certifies anatomy, ground contact, gait count, or loop acceptance.',
            ]}
