"""Explicit reviewed selection, bound to every original input hash."""


def reviewed_candidates(candidates, selected_ids, review, native_hash, frame_hashes):
    if not selected_ids:
        return []
    if len(selected_ids) != len(set(selected_ids)):
        raise ValueError('Duplicate reviewed candidate ID')
    if not review or not review.get('reviewer_rationale') or not review.get('reviewed_by'):
        raise ValueError('A review record with reviewer and rationale is required')
    if review.get('native_sha256') != native_hash or review.get('input_frame_sha256') != frame_hashes:
        raise ValueError('Review does not match the exact native and RGBA input hashes')
    if set(review.get('selected_ids', [])) != set(selected_ids):
        raise ValueError('CLI selection does not match the review record')
    available = {record['id']: (record, seed) for record, seed in candidates}
    if any(key not in available for key in selected_ids):
        raise ValueError('Reviewed candidate ID is absent or no longer eligible')
    return [available[key] for key in selected_ids]
