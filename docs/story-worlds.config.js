// Image-led study configuration. Existing tours remain unchanged.
export const SCENES={
  "elder": {
    "title": "Elderhouse interior",
    "description": "A new illustrated house interior inspired by the published story.",
    "ready": true,
    "asset": "storyboard/production/story-worlds-20260924/elder/panorama-v1.png",
    "repairs": {
      "fov": 110,
      "frontMask": [
        0,
        0,
        2,
        2
      ],
      "assets": {
        "rear": "storyboard/production/story-worlds-20260924/elder/rear-v1.png",
        "up": "storyboard/production/story-worlds-20260924/elder/up-v1.png",
        "down": "storyboard/production/story-worlds-20260924/elder/down-v1.png"
      }
    },
    "cubeReady": true,
    "cube": "storyboard/production/story-worlds-20260924/elder/cube-atlas-v1.webp",
    "assembled": "storyboard/production/story-worlds-20260924/elder/panorama-assembled-v1.png",
    "exportRecord": "storyboard/production/story-worlds-20260924/elder/exports-v1.json",
    "prompt": "storyboard/production/story-worlds-20260924/elder/prompt.txt",
    "provenance": "storyboard/production/story-worlds-20260924/elder/generation.json",
    "references": [
      {
        "label": "Elderhouse · wide interior",
        "src": "storyboard/images/published/elder-cycle/elder-r6-mentor-014.webp",
        "role": "Primary room design and atmosphere reference."
      },
      {
        "label": "Maps, books and craft details",
        "src": "storyboard/images/published/elder-cycle/elder-r6-mentor-027.webp",
        "role": "Details only; pictured characters are not transferred."
      },
      {
        "label": "Root entrance and daylight",
        "src": "storyboard/images/published/elder-cycle/elder-r6-mentor-013.webp",
        "role": "Exterior entrance/light cue, not a measured floor plan."
      }
    ],
    "initialView": {
      "yaw": 0,
      "pitch": 0,
      "fov": 80
    },
    "inputs": [
      {
        "label": "Spherical format and finish reference",
        "src": "storyboard/production/story-worlds-20260924/kitchen-bootstrap.png",
        "role": "A previous successful assembled panorama; format/finish reference only, not the target location’s architecture or scenery."
      }
    ],
    "repairRecords": {
      "rear": {
        "prompt": "storyboard/production/story-worlds-20260924/elder/rear-prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/elder/rear-generation.json"
      },
      "up": {
        "prompt": "storyboard/production/story-worlds-20260924/elder/up-prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/elder/up-generation.json"
      },
      "down": {
        "prompt": "storyboard/production/story-worlds-20260924/elder/down-prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/elder/down-generation.json"
      },
      "rear detail": {
        "prompt": "storyboard/production/story-worlds-20260924/elder/rear-detail-prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/elder/rear-detail-generation.json"
      }
    },
    "details": {
      "asset": "storyboard/production/story-worlds-20260924/elder/rear-detail-v1.png",
      "yaw": 3.141592653589793,
      "pitch": -0.7,
      "fov": 90,
      "mask": [
        -0.05,
        0.1,
        0.32,
        0.36
      ]
    },
    "reviewNote": "An imagined illustrated room, not measured 3D geometry. Rear and pole repairs are selected; a minor rug texture-scale transition remains visible."
  },
  "lake": {
    "title": "Chapter 1 · nature",
    "description": "A new illustrated outdoor setting inspired by Chapter 1.",
    "ready": true,
    "asset": "storyboard/production/story-worlds-20260924/lake/panorama-v2.png",
    "repairs": {
      "fov": 110,
      "frontMask": [
        0,
        0,
        2,
        2
      ],
      "assets": {
        "rear": "storyboard/production/story-worlds-20260924/lake/rear-v2.png",
        "up": "storyboard/production/story-worlds-20260924/lake/up-v2.png",
        "down": "storyboard/production/story-worlds-20260924/lake/down-v2.png"
      }
    },
    "cubeReady": true,
    "cube": "storyboard/production/story-worlds-20260924/lake/cube-atlas-v1.webp",
    "assembled": "storyboard/production/story-worlds-20260924/lake/panorama-assembled-v1.png",
    "exportRecord": "storyboard/production/story-worlds-20260924/lake/exports-v1.json",
    "prompt": "storyboard/production/story-worlds-20260924/lake/prompt-v2.txt",
    "provenance": "storyboard/production/story-worlds-20260924/lake/generation-v2.json",
    "references": [
      {
        "label": "Chapter1 lake and willow",
        "src": "storyboard/images/chapter-01-landscapes/shot-12.png",
        "role": "Location reference."
      },
      {
        "label": "Chapter1 lakeshore illustration",
        "src": "storyboard/images/chapter-01-direct/08.png",
        "role": "Same place and visual style; characters are omitted."
      }
    ],
    "initialView": {
      "yaw": 0,
      "pitch": 0,
      "fov": 80
    },
    "inputs": [
      {
        "label": "Spherical format and finish reference",
        "src": "storyboard/production/story-worlds-20260924/kitchen-bootstrap.png",
        "role": "A previous successful assembled panorama; format/finish reference only, not the target location’s architecture or scenery."
      }
    ],
    "previous": [
      {
        "label": "First attempt · location references only",
        "src": "storyboard/production/story-worlds-20260924/lake/panorama-v1.png",
        "role": "Preserved comparison before adding the successful 360° projection reference."
      }
    ],
    "previousRecords": [
      {
        "label": "First attempt",
        "prompt": "storyboard/production/story-worlds-20260924/lake/prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/lake/generation.json"
      }
    ],
    "repairRecords": {
      "rear": {
        "prompt": "storyboard/production/story-worlds-20260924/lake/rear-v2.prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/lake/rear-v2.generation.json"
      },
      "up": {
        "prompt": "storyboard/production/story-worlds-20260924/lake/up-v2.prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/lake/up-v2.generation.json"
      },
      "down": {
        "prompt": "storyboard/production/story-worlds-20260924/lake/down-v2.prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/lake/down-v2.generation.json"
      }
    },
    "reviewNote": "An imagined extension of the book’s lakeshore. Targeted rear and pole repairs remove the visible first-pass joins; texture sharpness still varies across the illustration."
  },
  "tractor": {
    "title": "Tractor chapter · setting",
    "description": "An illustrated bridge repair worksite inspired by the tractor chapter; the deck includes an unfinished gap.",
    "ready": true,
    "asset": "storyboard/production/story-worlds-20260924/tractor/panorama-v2.png",
    "repairs": {
      "fov": 110,
      "frontMask": [
        0,
        0,
        2,
        2
      ],
      "assets": {
        "rear": "storyboard/production/story-worlds-20260924/tractor/rear-v2.png",
        "up": "storyboard/production/story-worlds-20260924/tractor/up-v2.png",
        "down": "storyboard/production/story-worlds-20260924/tractor/down-v2.png"
      }
    },
    "cubeReady": true,
    "cube": "storyboard/production/story-worlds-20260924/tractor/cube-atlas-v1.webp",
    "assembled": "storyboard/production/story-worlds-20260924/tractor/panorama-assembled-v1.png",
    "exportRecord": "storyboard/production/story-worlds-20260924/tractor/exports-v1.json",
    "prompt": "storyboard/production/story-worlds-20260924/tractor/prompt-v2.txt",
    "provenance": "storyboard/production/story-worlds-20260924/tractor/generation-v2.json",
    "references": [
      {
        "label": "Tractor and footbridge setting",
        "src": "storyboard/images/standalone/timber-tractor/scene-11-v3.png",
        "role": "Bridge, machine and setting reference."
      },
      {
        "label": "Tractor machinery detail",
        "src": "storyboard/images/standalone/timber-tractor/scene-09-v4.png",
        "role": "Machine design only."
      }
    ],
    "initialView": {
      "yaw": 0,
      "pitch": 0,
      "fov": 80
    },
    "inputs": [
      {
        "label": "Spherical format and finish reference",
        "src": "storyboard/production/story-worlds-20260924/kitchen-bootstrap.png",
        "role": "A previous successful assembled panorama; format/finish reference only, not the target location’s architecture or scenery."
      }
    ],
    "previous": [
      {
        "label": "First attempt · location references only",
        "src": "storyboard/production/story-worlds-20260924/tractor/panorama-v1.png",
        "role": "Preserved comparison before adding the successful 360° projection reference."
      }
    ],
    "previousRecords": [
      {
        "label": "First attempt",
        "prompt": "storyboard/production/story-worlds-20260924/tractor/prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/tractor/generation.json"
      }
    ],
    "repairRecords": {
      "rear": {
        "prompt": "storyboard/production/story-worlds-20260924/tractor/rear-v2.prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/tractor/rear-v2.generation.json"
      },
      "up": {
        "prompt": "storyboard/production/story-worlds-20260924/tractor/up-v2.prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/tractor/up-v2.generation.json"
      },
      "down": {
        "prompt": "storyboard/production/story-worlds-20260924/tractor/down-v2.prompt.txt",
        "provenance": "storyboard/production/story-worlds-20260924/tractor/down-v2.generation.json"
      }
    },
    "reviewNote": "An imagined bridge repair worksite with an unfinished deck. Rear and pole repairs are selected; this is an illustrated setting, not measured machinery or terrain."
  }
};
