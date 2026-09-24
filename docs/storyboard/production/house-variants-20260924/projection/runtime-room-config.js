// Image-led visual door calibration; radians and vertical FOV degrees. No metric geometry claim.
// Common preserves historical A base/front/up/down; new repairs remain separate live textures.
export const ROOMS={
  "common": {
    "name": "Common room",
    "asset": "storyboard/images/house-menu/room-panorama-v3.webp",
    "initialView": {
      "yaw": 3.1415927,
      "pitch": 0,
      "fov": 72
    },
    "portraitView": {
      "yaw": 2.68149,
      "pitch": 0,
      "fov": 72
    },
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
    },
    "doors": [
      {
        "id": "bath",
        "to": "bath",
        "yaw": 2.6825385,
        "pitch": -0.0061257,
        "halfWidth": 0.18,
        "halfHeight": 0.35,
        "polygon": [
          [
            2.4812138,
            -0.3115147
          ],
          [
            2.9437723,
            -0.380304
          ],
          [
            2.9437723,
            0.2005019
          ],
          [
            2.9198052,
            0.3076513
          ],
          [
            2.8246536,
            0.3845726
          ],
          [
            2.7179123,
            0.3953708
          ],
          [
            2.6102968,
            0.3639944
          ],
          [
            2.5252649,
            0.2890562
          ],
          [
            2.4812138,
            0.191888
          ]
        ],
        "arrivalView": {
          "yaw": 1.9,
          "pitch": -0.25,
          "fov": 72
        },
        "calibrated": true
      },
      {
        "id": "bedroom",
        "to": "bedroom",
        "yaw": -2.6898871,
        "pitch": -0.0061478,
        "halfWidth": 0.18,
        "halfHeight": 0.35,
        "polygon": [
          [
            -2.9591467,
            -0.381325
          ],
          [
            -2.4897945,
            -0.3134472
          ],
          [
            -2.4897945,
            0.1931285
          ],
          [
            -2.5252649,
            0.2753402
          ],
          [
            -2.5968601,
            0.3544989
          ],
          [
            -2.6935812,
            0.393112
          ],
          [
            -2.8022024,
            0.3819214
          ],
          [
            -2.9025342,
            0.3205012
          ],
          [
            -2.9591467,
            0.2160872
          ]
        ],
        "arrivalView": {
          "yaw": 1.35,
          "pitch": -0.15,
          "fov": 72
        },
        "calibrated": true
      }
    ]
  },
  "bath": {
    "details": {"asset": "storyboard/production/house-bath-join-20260924/rug-join-v1.png", "yaw": 3, "pitch": -0.95, "fov": 90, "mask": [0.04, 0.08, 0.25, 0.26]},
    "name": "Bathroom",
    "asset": "storyboard/production/house-image-tour-20260924/bath/panorama-door-v2.png",
    "initialView": {
      "yaw": 1.9,
      "pitch": -0.25,
      "fov": 72
    },
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
      "downMaskX": [0, 0.08]
    },
    "doors": [
      {
        "id": "common",
        "to": "common",
        "yaw": -0.2390585,
        "pitch": 0.0044259,
        "halfWidth": 0.2,
        "halfHeight": 0.4,
        "polygon": [
          [
            -0.5661084,
            -0.5694278
          ],
          [
            0.1268688,
            -0.6289712
          ],
          [
            0.1268688,
            0.2605533
          ],
          [
            0.0772892,
            0.4054305
          ],
          [
            -0.0113882,
            0.4949716
          ],
          [
            -0.1313488,
            0.5508031
          ],
          [
            -0.2497802,
            0.56778
          ],
          [
            -0.3733938,
            0.523229
          ],
          [
            -0.4645309,
            0.4479957
          ],
          [
            -0.5363598,
            0.3388299
          ],
          [
            -0.5661084,
            0.23037
          ]
        ],
        "arrivalView": {
          "yaw": 0,
          "pitch": 0,
          "fov": 72
        },
        "calibrated": true
      }
    ],
    "repairEvidence": {
      "down": {
        "input": "storyboard/production/house-image-tour-20260924/bath/down-door-v2.png",
        "prompt": "storyboard/production/house-image-tour-20260924/bath/down-prompt-v3.txt"
      }
    }
  },
  "bedroom": {
    "name": "Bedroom",
    "asset": "storyboard/production/house-image-tour-20260924/bedroom/panorama-v1.png",
    "initialView": {
      "yaw": 1.35,
      "pitch": -0.15,
      "fov": 72
    },
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
    },
    "doors": [
      {
        "id": "common",
        "to": "common",
        "yaw": -0.9952509,
        "pitch": -0.0230218,
        "halfWidth": 0.2,
        "halfHeight": 0.4,
        "polygon": [
          [
            -1.3281818,
            -0.5153345
          ],
          [
            -0.6658618,
            -0.5153345
          ],
          [
            -0.6658618,
            0.2744909
          ],
          [
            -0.7225309,
            0.3842873
          ],
          [
            -0.8323273,
            0.4692909
          ],
          [
            -0.9881672,
            0.5047091
          ],
          [
            -1.1475491,
            0.4515818
          ],
          [
            -1.2644291,
            0.3559527
          ],
          [
            -1.3281818,
            0.2390727
          ]
        ],
        "arrivalView": {
          "yaw": 0,
          "pitch": 0,
          "fov": 72
        },
        "calibrated": true
      }
    ]
  }
};
export const REPORT="storyboard/production/house-image-tour-20260924/README.md";
