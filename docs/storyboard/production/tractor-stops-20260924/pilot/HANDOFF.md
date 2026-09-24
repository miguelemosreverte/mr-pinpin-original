# Pilot generation handoff

Do not batch until the coordinator accepts the pilot alignment. Reuse `restore-prompt.txt` literally for each selected frame. It has no stop-specific time or angle. The target frame is its sole image input. Inspect it first. Preserve the exact returned master and record hashes/dimensions; image restoration synthesizes detail.

After restoration, obtain the deterministic guide from the projection lane. The guide uses actual restored aspect ratio and authored vertical FOV45°, yaw/pitch0; these are not recovered lens measurements. Reuse `panorama-prompt.txt` literally with ordered images: (1) guide, (2) native restored frame, (3) approved assembled tractor sphere. Inspect all three before submitting. The pilot illustrates why a guide does not itself guarantee model alignment: render the result forward at the guide lens and compare before accepting.

Use only built-in `image_gen__imagegen`, one call per image. No paid API runner is involved. Current returned object has `image_url` as a PNG data URL and no `output_hint`. Keep that result in functions.store. Decode its base64 directly to the durable mini path; do not resample or alter the image. The Air SMB mount is stalled, so use SSH, not mounted writes. Do not change the global generated_images symlink.

A practical transport is sequential 120000-character base64 chunks (length divisible by4), sent through `tools.exec_command` to `ssh mini` running Python `base64.b64decode`. Open the chosen new destination in `wb` for chunk0, `ab` thereafter. Properly single-quote nested shell arguments; do not interpolate arbitrary prompt text into shell syntax. Check every exit status. Then scp the completed small PNG to a local temporary review path, inspect with view_image, hash it and read PNG IHDR dimensions. Verify/preserve the durable master and source metadata before beginning the next call. This transport is byte copying, not an image-generation CLI.

Record exact prompt, ordered input roles/SHA256, outputSHA256/bytes/actualdimensions, returned-data transport, status and true call count. Save source JSON/prompts in this pack and copy metadata to mini. No generated candidate is automatically an accepted stop. Old inputs and candidates remain untouched.

```js
// functions.exec orchestration after store('result', result).
const b64 = load('result').image_url.split(',')[1];
const target = '/Volumes/TB4/mac-mini-storage/shared/PACK/STOP/MASTER.png';
const quote = s => "'" + s.replace(/'/g, "'\\''") + "'";
// Create the parent directory first through SSH; use a NEW versioned target.
for (let i = 0; i < b64.length; i += 120000) {
  const py = 'import base64;open(' + JSON.stringify(target) + ',' +
    JSON.stringify(i ? 'ab' : 'wb') + ').write(base64.b64decode(' +
    JSON.stringify(b64.slice(i, i + 120000)) + '))';
  const r = await tools.exec_command({
    cmd: 'ssh mini ' + quote('/opt/homebrew/bin/python3 -c ' + quote(py)),
    max_output_tokens: 100
  });
  if (r.exit_code !== 0) throw new Error(JSON.stringify(r));
}
```

Use Python hashlib for SHA-256 on mini; its Perl shasum currently fails with the inherited locale. Do not report a master saved until all chunks and hash/dimension inspection succeed.
