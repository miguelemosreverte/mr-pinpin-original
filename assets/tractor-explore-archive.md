# Tractor explore preservation

All **5 new media / 8,918,730 bytes** are preserved in public bucket `miguelemosreverte/mr-pinpin-archive`:

- Four exact video-frame PNGs at 0, 4, 7 and 8.5 seconds (`front`, `near`, `rear`, `far`).
- The single already-submitted, unused `near/panorama-v1.png` draft (SHA-256 `691a24dc8221f09331478b7e5068ca7baeaaee8ce7ab59edd3e912bdc94fe961`).

All five manifest identities match the receipt on path, role, bytes, SHA-256 and immutable object key. The existing catalog and HF adapter uploaded and remotely verified every entry from regular files on the mini SSD. Independent anonymous HTTP GETs returned all five objects with matching bytes and SHA-256, HTTP 200 and CORS `*`.

The four frames and unused draft are preparation history. The selected experiment uses only the existing tractor panorama and its established repairs; those previously preserved assets are not duplicated in this scoped manifest. No far or repair generation followed the scope correction. This archive does not make the unused near draft an available tour stop or establish camera correspondence.

Only this scoped manifest assigns archive roles. Global policy, prior manifests and runtime selection remain unchanged. All originals remain on the mini; no credentials or private logs are included. No generation, commit, push or publication was performed during this archive task.

Evidence on the mini: `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-explore-20260924/{archive-inputs.json,archive-receipt.json,anonymous-verification.json}`. Frame extraction and unused draft generation provenance remain in the production pack. The source README was copied directly to the mini pack served by the isolated review mirror.

```sh
python3 tools/assets/hf_store.py pull --manifest assets/tractor-explore.json --root /external/restored --cache /external/asset-cache --profile archive
```
