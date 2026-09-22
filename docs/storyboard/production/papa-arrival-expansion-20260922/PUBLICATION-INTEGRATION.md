# Approved Papa arrival publication integration

Integrated the user-approved correction selection without new image generation or changes to the approved PNGs. Publication and deployment are handled separately by the coordinator.

- Papa Comes Home: 27 story images + 1 unchanged title (28 pages).
- One Day in the Forest: 173 story images + 5 unchanged titles (178 pages).
- Both manifests use editionVersion 2. Their Papa chapter sequences and captions are identical.
- All later combined-collection scenes remain byte-equivalent as parsed JSON; chapter navigation starts shift by twelve.
- Existing original images and the immutable baseline manifest remain preserved. The original window image is replaced only by a distinct runtime reference.
- Language parity, exact approved sequence, unique IDs, existing image paths, and cover navigation anchors verified.

## Derivative encoding

cwebp 1.6.0
libsharpyuv: 0.4.2: `-quiet -lossless -exact -m 6 -q 100`. Every derivative is full 1536×1024, lossless, and verified byte-for-byte against its selected PNG after both decode to RGBA8. No crops, resizing, painting, or perceptual quality reduction.

## Selected artwork and hashes

### arrival-01

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-01-v4.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-01-v4.webp`
- Source SHA-256: `c4e307043518da3afc428ae99e153b306f9d3793c6f8f2db43f1b5b85e0384e7`
- Runtime SHA-256: `88ebe1d1822e1a76cfcfd4e894f878ffa206e16db86ed61659544fc537511a13`
- Decoded RGBA8 SHA-256: `097c9ed984fd5c5b79a4a204f241370848011619bd0c81a78ffa5bd86f1fa6ae`
- Source bytes: 2580453; runtime bytes: 1692872.

### arrival-02

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-02-v4.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-02-v4.webp`
- Source SHA-256: `c939f8d49bf2908d51fb331971d4955469cae9f4014e2e24ad89e184e1f75bc9`
- Runtime SHA-256: `79fcd16a5a1146ad0f585447288a8bc8d11d67343194c3f1610f2649b3d53285`
- Decoded RGBA8 SHA-256: `beaf436b1d51aba398c90450ccfa03ace1a1e49a9f12b2844a7605fb889ec978`
- Source bytes: 2295969; runtime bytes: 1607470.

### arrival-03

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-03-v5.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-03-v5.webp`
- Source SHA-256: `6b481db1c4416bebc181921c8071217c53bab41dc346587c69fe764b627cce29`
- Runtime SHA-256: `74d950a027c944f00ad0c0cbee5126dfb521bf80d3ae0f9706a188ebbbe6db00`
- Decoded RGBA8 SHA-256: `ba26892fe1a295b22a88721ce046240056d501bebc487836ea08c1e671b72d34`
- Source bytes: 2097467; runtime bytes: 1419594.

### arrival-04

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-04.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-04.webp`
- Source SHA-256: `6bf6114fd5f9e71c140800a3fa5a0c6967a2b02f826704fb003acc2b198baf4e`
- Runtime SHA-256: `a88fd0a562009c889e0a17e62fbdacf49cfcf9ad6709e63d4fa10459f77e691f`
- Decoded RGBA8 SHA-256: `f7030cd95ade3824ddcfe2aa4cab082bc861fe58742352abe7e9e745cb50f86d`
- Source bytes: 2372361; runtime bytes: 1643490.

### arrival-05

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-05.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-05.webp`
- Source SHA-256: `a708004d7111e1a147693c231d82664e2c043682a70f91d31e4e350ce97b4fbf`
- Runtime SHA-256: `0c475ab6702d45d9ae00a64c90d59adfe0a980dd5a594cacbbd2ced5f63342ea`
- Decoded RGBA8 SHA-256: `9927a4618f879d51d0edd6a0c0052dbe87dc01a378fc0b88b0f8dfc8b0eda28a`
- Source bytes: 2486938; runtime bytes: 1751408.

### arrival-06

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-06.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-06.webp`
- Source SHA-256: `35d8c14ac09122b8a202120d3ebfea53013fefa59afd6e950bd93950c82d25fc`
- Runtime SHA-256: `d468d318e77630d1621b1b2d1757e6ca399604cb7624fec7750ce673307a013c`
- Decoded RGBA8 SHA-256: `79230712de80b9da61ed52f1825ce511c9ed54099552297566c32a5671d75285`
- Source bytes: 2547076; runtime bytes: 1834386.

### arrival-07

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-07.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-07.webp`
- Source SHA-256: `e9795ea0318ccdd02ae5e1fe9cb28b9ba820f44a108fc9e08202e68c036e1e1a`
- Runtime SHA-256: `6af330b84c2e513eb082e35d0431f867f613b9396d751ae945c2063b5b232209`
- Decoded RGBA8 SHA-256: `1d51aea63724268eeaf40a91eebb39d6a27be8659465c0afe937e28f5967eea2`
- Source bytes: 2338877; runtime bytes: 1614632.

### arrival-08

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-08.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-08.webp`
- Source SHA-256: `640bd1e19ed61a07de826a76189e2f8232b7505bd8e7dbbd7a15bf8928b186c2`
- Runtime SHA-256: `edc6bb4c3ded2327ea0ff9194f7c79ecae5712a3bd414ee39df466b90db20953`
- Decoded RGBA8 SHA-256: `1a35cb6641972219e5d44e16fc0c8cd2f6bae98f8c0af47cabb17b4dcd0648f9`
- Source bytes: 2550959; runtime bytes: 1807512.

### arrival-09

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-09-v2.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-09-v2.webp`
- Source SHA-256: `6f905fd4ef7f26ecc1cd4722be18728a075cde3c1e2e636f696c996b7f3cfb6b`
- Runtime SHA-256: `fd994b602031e2db2d2b66dfd60bd0923b1a6854ef68ca9b7909418236801096`
- Decoded RGBA8 SHA-256: `c324d505bea605a346063ce95ded25b61f8b8a5693385ebb35aa0915fb322ff7`
- Source bytes: 2775759; runtime bytes: 1921044.

### arrival-10

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-10-v3.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-10-v3.webp`
- Source SHA-256: `901ce718ab4e7467bdfbc67dc7c2d51b0d37c311b8999754bee6daa49f8b6693`
- Runtime SHA-256: `19062792782ff1efadcf957c24b4856101922c3282c62416400ef98c78dd16f4`
- Decoded RGBA8 SHA-256: `8a2675d3353818847ad99fbeba4e40c04478cfdf5eb0f07517034686250686d6`
- Source bytes: 2509183; runtime bytes: 1791178.

### arrival-11

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-11-v2.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-11-v2.webp`
- Source SHA-256: `f6c1d2e299b5e5b5fe05bb64dc781badeda789358ca9b97d0a7a758c84fc5a98`
- Runtime SHA-256: `b5d119343e5c18aac4f5a2d21c253a254f792095541e5f4e68f9ac703eb678e1`
- Decoded RGBA8 SHA-256: `3ae9d95110ade97efabdba00229f4d16dc275ad506728aee45414b79ea412228`
- Source bytes: 2579904; runtime bytes: 1828336.

### arrival-12

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/arrival-12-v2.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-arrival-12-v2.webp`
- Source SHA-256: `16c3e716f1196dc1628e8b6cc04c2c6431629f6a012e3847f1dbdd986087601b`
- Runtime SHA-256: `12f7544d1a88963538f2984f41d0e33bfef93301ba07d8b6ecf47345648bb042`
- Decoded RGBA8 SHA-256: `07744c3d5ac6d0f44446dc99b14d4ac88a0ef35a315000adbeaf2c32b12c9396`
- Source bytes: 2767215; runtime bytes: 1955460.

### elder-r6-family-002

- Approved PNG: `docs/storyboard/production/papa-arrival-expansion-20260922/images/family-002-window-v2.png`
- Runtime: `images/published/elder-cycle/papa-arrival-20260922-family-002-window-v2.webp`
- Source SHA-256: `978d0df732cae3ee2f65c90bfd839524130be40c2fb5eaa433027eb68a154a4b`
- Runtime SHA-256: `f51aa9cdc09a9e523e89d5711bdec83150bc7670ac1b3e738c404e2b4fb27f59`
- Decoded RGBA8 SHA-256: `43a91fcf4757420ddc6d4cb127a49ce80c6ae671e96ec1180b4d404d6d6105f4`
- Source bytes: 2859997; runtime bytes: 1871018.


## Runtime schema and verification

Updated `standalone-stories.js` to require editionVersion 2 for Papa Comes Home and the combined collection, retaining editionVersion 1 for the four unchanged chapters. The Papa sequence and thirteen selected runtime image paths are explicitly validated; rejected revisions and reordered shots cannot pass validation. Updated existing edition and published-site checks for 178/28/21/23/36/70 pages and the shifted interior title anchor.

Validation: `node scripts/verify-elder-edition.cjs` passed all six editions, all three title languages, existing legacy stories and covers, approved asset presence (193 unique assets), and negative schema cases. Added negative cases cover old edition versions, rejected arrival revisions, unknown arrival IDs, reordered arrival shots, and the superseded original window. `node --check scripts/verify-published-site.cjs` passed. Coordinator performs the production build and browser/deployment verification.
