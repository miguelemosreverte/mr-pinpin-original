# Organization storage verification

Status: COMPLETE, 2026-09-22.

Published Parfit's updated `assets/bucket-README.md` as the mutable root
`README.md` in the existing public bucket `miguelemosreverte/mr-pinpin-archive`.
The file now points to:

- Source: https://github.com/mr-pinpin/mr-pinpin-source
- Publishing repository: https://github.com/mr-pinpin/mr-pinpin.github.io
- Canonical site: https://mr-pinpin.github.io/

The bucket name is unchanged. No other asset, content-addressed object, release
bundle, bucket setting, or Git state was changed by this lane. No commits were
made. Parfit owns the source README edits; this lane only published its bytes.

## Verification

Waited for the file contents to contain the organization URLs, then staged the
latest completed copy on the external SSD. The mini used the existing HF SDK and
cached authentication to upload exactly one object: `README.md`.

A separate `HfApi(token=False)` client downloaded the published README afresh.
Its byte count and SHA-256 matched the staged file exactly. Bucket path-info
metadata confirmed the expected size, and the remote Xet identity stayed the same
before and after the anonymous download. A subsequent local check confirmed the
source README still matched the uploaded bytes.

- Published bytes: **2,893**.
- Source/staged/anonymous-readback SHA-256:
  `a6748ebb69090f8ce91cf4071c76683d170b81acd41223468e9531c637eb6770`.
- Receipt SHA-256:
  `2e0de7baaed802aa577aef970ed052384943ce32760e63a44649ee1adaa3b106`.
- Previous README retained: 2,993 bytes, SHA-256
  `7bb68994c8b463c244ab2ecfd381abbe3c63a1299e211a5f8ef61127651b179f`.

## Evidence

External SSD directory on the mini:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-organization-storage-20260922/`.

- `receipt.json`: successful upload and anonymous-readback proof; the only
  recorded mutated object is `README.md`.
- `README.md`: uploaded source snapshot.
- `README.anonymous.md`: fresh anonymous download.
- `README.before.md`: retained previous remote README.
- `publish-readme.py`: bounded README-only transfer and verification script.

The transfer and all exec sessions finished successfully. No background job
remains for this task. No credentials or provider response bodies were logged.
