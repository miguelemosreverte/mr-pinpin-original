# Image-led house tour preservation

The scoped manifest preserves **28 media files / 84,514,274 bytes**, with verified remote SHA-256/size identities in the authorized public bucket `miguelemosreverte/mr-pinpin-archive`.

It includes nine untouched generated masters (including the later `bath/down-v3.png` cleanup), three bootstrap/reference images, seven diagnostic perspective inputs, five historical A runtime textures, two approved book references, and two deterministic bath-door composites. Every row is archive-role in this scoped manifest only; global production roles/catalog are unchanged.

The existing catalog and Hugging Face adapter ran against a regular-file stage on the mini SSD. Initial preservation uploaded 18 new objects, verified two existing book objects, and resumed five exact A texture proofs. Subsequent extensions each uploaded/read back one asset and resumed all prior identities: widened bath base (26), registered down composite (27), generated cleanup (28). The final `house-image-tour-receipt.json` is a successful non-dry-run receipt matching every manifest identity, with both `verified` and `remote_verified` true. Anonymous HTTP GET/SHA checks cover all 28, retaining exact prior proofs and freshly checking new objects.

External evidence directory:

`/Volumes/TB4/mac-mini-storage/shared/pinpin-house-image-tour-20260924/`

- `archive-stage/`: regular-file catalog/upload stage.
- `archive-inputs.json`: original 25-file source/stage identities.
- `archive-receipt.json`, `archive-door-receipt.json`, `archive-down-receipt.json`: prior versioned proofs.
- `archive-final-receipt.json`, `archive-final-upload.log`: final 28-file preservation.
- `anonymous-final-verification.json`: combined final anonymous identity evidence; earlier anonymous reports remain retained.
- `verify-final-anonymous.py`: final extension check, reusing exact earlier proof identities; no credentials in output.

Restore into a checkout or external regular directory:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/house-image-tour.json \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-house-image-tour-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --profile archive
```

Source working media can be specific links to retained TB4 files. Upload and verification ran on the mini; no broad media copies were written to the Air, and no original media was removed. Reports, prompts, generation records and projection recipes are separately reviewable text.

Preservation is not visual approval. The deterministic `down-door-v2.png` intermediate retained a small old-leaf stump outside the front source’s angular coverage. The later generated `down-v3.png` cleans that fragment and scar; both stages remain preserved with their distinct methods and identities. Final live-overlay review is documented separately. No Git operation or public release was performed in this lane.
