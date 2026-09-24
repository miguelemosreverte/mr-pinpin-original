// Frozen current image stacks; new candidates remain separate from the connected tour.
export const VARIANTS={
  "common": {
    "title": "Kitchen · central table",
    "description": "A central table in the existing common room.",
    "initialView": {
      "yaw": 0,
      "pitch": -0.4,
      "fov": 80
    },
    "before": {
      "asset": "storyboard/images/house-menu/room-panorama-v3.webp",
      "repairs": {
        "fov": 110,
        "frontMask": [
          0.102,
          -0.028,
          0.075,
          0.075
        ],
        "assets": {
          "front": "storyboard/images/house-menu/room-cube-front-v1.webp",
          "rear": "storyboard/production/house-image-tour-20260924/common/rear-v1.png",
          "up": "storyboard/images/house-menu/room-cube-up-v1.webp",
          "down": "storyboard/images/house-menu/room-cube-down-v1.webp"
        }
      }
    },
    "after": {
      "ready": true,
      "asset": "storyboard/production/house-variants-20260924/common-table-v1.png",
      "repairs": {
        "fov": 110,
        "frontMask": [
          0,
          0,
          2,
          2
        ],
        "assets": {
          "down": "storyboard/production/house-variants-20260924/common-table-down-v1.png"
        }
      },
      "repairRecords": {
        "down": {
          "prompt": "storyboard/production/house-variants-20260924/common-table-down-v1.prompt.txt",
          "provenance": "storyboard/production/house-variants-20260924/common-table-down-v1.generation.json"
        }
      }
    },
    "prompt": "storyboard/production/house-variants-20260924/common-table-v1.prompt.txt",
    "provenance": "storyboard/production/house-variants-20260924/common-table-v1.generation.json"
  },
  "bath": {
    "title": "Bathroom · child-height view",
    "description": "A newly imagined lower viewpoint in the bathroom.",
    "initialView": {
      "yaw": 1.9,
      "pitch": 0,
      "fov": 80
    },
    "before": {
      "asset": "storyboard/production/house-image-tour-20260924/bath/panorama-door-v2.png",
      "repairs": {
        "fov": 110,
        "frontMask": [
          0,
          0,
          2,
          2
        ],
        "assets": {
          "front": "storyboard/production/house-image-tour-20260924/bath/front-v1.png",
          "rear": "storyboard/production/house-image-tour-20260924/bath/rear-v1.png",
          "down": "storyboard/production/house-image-tour-20260924/bath/down-v3.png"
        },
        "downMaskX": [
          0,
          0.08
        ]
      },
      "details": {
        "asset": "storyboard/production/house-bath-join-20260924/rug-join-v1.png",
        "yaw": 3,
        "pitch": -0.95,
        "fov": 90,
        "mask": [
          0.04,
          0.08,
          0.25,
          0.26
        ]
      }
    },
    "after": {
      "ready": true,
      "asset": "storyboard/production/house-variants-20260924/bath-child-v1.png",
      "repairs": {
        "fov": 110,
        "frontMask": [
          0,
          0,
          2,
          2
        ],
        "assets": {
          "rear": "storyboard/production/house-variants-20260924/bath-child-rear-v1.png",
          "down": "storyboard/production/house-variants-20260924/bath-child-down-v1.png"
        }
      },
      "repairRecords": {
        "rear": {
          "prompt": "storyboard/production/house-variants-20260924/bath-child-rear-v1.prompt.txt",
          "provenance": "storyboard/production/house-variants-20260924/bath-child-rear-v1.generation.json"
        },
        "down": {
          "prompt": "storyboard/production/house-variants-20260924/bath-child-down-v1.prompt.txt",
          "provenance": "storyboard/production/house-variants-20260924/bath-child-down-v1.generation.json"
        },
        "rug": {
          "prompt": "storyboard/production/house-variants-20260924/bath-child-rug-v1.prompt.txt",
          "provenance": "storyboard/production/house-variants-20260924/bath-child-rug-v1.generation.json"
        }
      },
      "details": {
        "asset": "storyboard/production/house-variants-20260924/bath-child-rug-v1.png",
        "yaw": 3.141592653589793,
        "pitch": -0.7,
        "fov": 90,
        "mask": [
          -0.04,
          -0.03,
          0.26,
          0.38
        ]
      }
    },
    "prompt": "storyboard/production/house-variants-20260924/bath-child-v1.prompt.txt",
    "provenance": "storyboard/production/house-variants-20260924/bath-child-v1.generation.json"
  },
  "bedroom": {
    "title": "Bedroom · child-height view",
    "description": "A newly imagined lower viewpoint in the bedroom.",
    "initialView": {
      "yaw": 1.35,
      "pitch": 0,
      "fov": 80
    },
    "before": {
      "asset": "storyboard/production/house-image-tour-20260924/bedroom/panorama-v1.png",
      "repairs": {
        "fov": 110,
        "frontMask": [
          0,
          0,
          1,
          1
        ],
        "assets": {
          "rear": "storyboard/production/house-image-tour-20260924/bedroom/rear-v1.png",
          "down": "storyboard/production/house-image-tour-20260924/bedroom/down-v1.png"
        }
      }
    },
    "after": {
      "ready": true,
      "asset": "storyboard/production/house-variants-20260924/bedroom-child-v1.png",
      "repairs": {
        "fov": 110,
        "frontMask": [
          0,
          0,
          2,
          2
        ],
        "assets": {
          "rear": "storyboard/production/house-variants-20260924/bedroom-child-rear-v1.png",
          "down": "storyboard/production/house-variants-20260924/bedroom-child-down-v1.png"
        }
      },
      "repairRecords": {
        "rear": {
          "prompt": "storyboard/production/house-variants-20260924/bedroom-child-rear-v1.prompt.txt",
          "provenance": "storyboard/production/house-variants-20260924/bedroom-child-rear-v1.generation.json"
        },
        "down": {
          "prompt": "storyboard/production/house-variants-20260924/bedroom-child-down-v1.prompt.txt",
          "provenance": "storyboard/production/house-variants-20260924/bedroom-child-down-v1.generation.json"
        }
      }
    },
    "prompt": "storyboard/production/house-variants-20260924/bedroom-child-v1.prompt.txt",
    "provenance": "storyboard/production/house-variants-20260924/bedroom-child-v1.generation.json"
  }
};
