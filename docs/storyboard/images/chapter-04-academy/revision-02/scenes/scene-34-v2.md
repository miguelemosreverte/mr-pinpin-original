# Academy scene34 — preserve completed model footprint

## Exact prompt

Use case: precise-object-edit. Output one standalone1536x1024 landscape children's story illustration, no text. Image1 is the EDIT TARGET, the group talking after the water test. Image2 is REFERENCE ONLY for the SAME completed model's physical dimensions in the immediately preceding water-test scene. Correct only the model in image1: its bark roof has mistakenly become one third shorter. Restore the long bark roof and widely spaced two supports seen in image2, so it is recognizably the same successfully assembled object. Keep the roof's thickness and height and the two blocks' individual sizes; increase the roof's horizontal length to approximately1.45 times its present image1 length and move the two upright blocks outward underneath its ends. This should have approximately the image2 roof-to-pinecone size ratio. Keep the single pinecone and its leaf EXACTLY their present image1 size and position, dry under the roof. Preserve image1 conversation: PinPin gestures toward Lulu with relaxed free paws, Lulu listens, Tutu smiles, Mila rests one paw on table at left step, Bruno has both paws resting and the upright wooden cup sits separately to his left. Preserve all five children and the owl, every face, gaze, limb, body size, tail, no crown, oak/pavilion/stream geography, table legs, undertray, separate low step, lighting, camera framing, and rich warm dimensional style. Do not reintroduce pouring from image2. Only roof length/support spacing and necessarily adjacent tabletop/water-edge pixels may change. Exactly two supports, one bark roof, one cone on one leaf; no additional blocks or extra roofs. Water droplets remain around outer roof ends away from the dry cone. No words, captions, diagrams, split panels or watermark.

## Provenance and actual review

```json
{
  "id": "academy-r02-34-v2",
  "title": "Academy scene34 \u2014 preserve completed model footprint",
  "status": "proposed",
  "tool": "built-in image_gen",
  "plannedAt": "2026-09-21T03:51:15.175Z",
  "output": "images/chapter-04-academy/revision-02/scenes/scene-34-v2.png",
  "references": [
    {
      "path": "images/chapter-04-academy/revision-02/scenes/scene-34-v1.png",
      "role": "edit target: preserve all cast, expressions, poses, framing and props except roof/support footprint",
      "sha256": "e40636f1d61db3192a7aac4e0dc3cf47b5d5b03e8050a8677a3daa4882bcdb0d"
    },
    {
      "path": "images/chapter-04-academy/revision-02/scenes/scene-32-v1.png",
      "role": "continuity authority for the completed model roof length and two-block spacing; do not copy pouring pose",
      "sha256": "b0e8678d279ace0853821ae40b81d44a15d5c5e33049b1a5b5c87f5cb370cda5"
    }
  ],
  "prompt": "Use case: precise-object-edit. Output one standalone1536x1024 landscape children's story illustration, no text. Image1 is the EDIT TARGET, the group talking after the water test. Image2 is REFERENCE ONLY for the SAME completed model's physical dimensions in the immediately preceding water-test scene. Correct only the model in image1: its bark roof has mistakenly become one third shorter. Restore the long bark roof and widely spaced two supports seen in image2, so it is recognizably the same successfully assembled object. Keep the roof's thickness and height and the two blocks' individual sizes; increase the roof's horizontal length to approximately1.45 times its present image1 length and move the two upright blocks outward underneath its ends. This should have approximately the image2 roof-to-pinecone size ratio. Keep the single pinecone and its leaf EXACTLY their present image1 size and position, dry under the roof. Preserve image1 conversation: PinPin gestures toward Lulu with relaxed free paws, Lulu listens, Tutu smiles, Mila rests one paw on table at left step, Bruno has both paws resting and the upright wooden cup sits separately to his left. Preserve all five children and the owl, every face, gaze, limb, body size, tail, no crown, oak/pavilion/stream geography, table legs, undertray, separate low step, lighting, camera framing, and rich warm dimensional style. Do not reintroduce pouring from image2. Only roof length/support spacing and necessarily adjacent tabletop/water-edge pixels may change. Exactly two supports, one bark roof, one cone on one leaf; no additional blocks or extra roofs. Water droplets remain around outer roof ends away from the dry cone. No words, captions, diagrams, split panels or watermark.",
  "startedAt": "2026-09-21T03:51:41.518Z",
  "finishedAt": "2026-09-21T03:52:35.459Z",
  "generatedFile": "/Users/miguel_lemos/.codex/generated_images/01a0c079-fa50-7b31-bb65-aacd3603cbe0/exec-4cc5f8a2-c747-4371-b3b3-dadc8cf23378.png",
  "reviewedAt": "2026-09-21T03:55:20.964Z",
  "review": "Full output inspected. Bark roof is visibly restored to approximately the same projected span as scene32 (about500px rather than the rejected approximately330px), with two separate supports moved outward under its ends. Cone/leaf remain single, dry and approximately same size; their center shifts slightly right within the wider shelter. The five children and owl retain scene34 dialogue faces, gestures and placement; Bruno's cup stays upright on table, no pouring restored. Plain bench, low step, undertray and sunny site remain. Roof texture is regenerated and not claimed pixel-identical; hidden limb joints unverified. Creator review; root independent gate pending.",
  "width": 1536,
  "height": 1024,
  "sha256": "18723ffa88eac8b661263250c65e6484735b8fb391fba84a4b5f8592e56892c6",
  "timingNote": "UTC timestamps surround actual awaited built-in call; concurrent calls may overlap."
}
```
