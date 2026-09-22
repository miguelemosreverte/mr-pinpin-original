window.atlasDirections = {
  version: 2,
  angleConvention: 'clockwise-image-plane',
  displayWidth: 56,
  reviewStatus: 'reviewed-approximate-azimuths',
  // Angles label visual heading bins, not measured exact angular intervals.
  // Rectangles use original-sheet pixels; anchors are crop-local foot positions.
  // Scale every frame by displayWidth / referenceWidth, without bitmap rotation.
  sheets: [
    {
      src: 'images/atlas/pinpin-directions-a-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-a-v1.webp', width: 1254, height: 1254, referenceWidth: 285,
      grid: {x: [0,313,627,940,1254], y: [0,313,627,940,1254]},
      sha256: '8be56abd29348419d471151cf5092b41567ed73fe2a97a15b665c320357159c0',
      visualReview: "Four visually distinct heading rows: right profile, shallow front-right oblique, steeper front-right oblique, and centered front/down. Approximate requested azimuth bins 0/30/60/90; exact 30-degree spacing is not measured. Sixteen intact walk frames with true alpha. Red/yellow diagnostic fringe has alpha at most 3/255 and is not visible in the 56-map-pixel atlas composite."
    },
    {
      src: 'images/atlas/pinpin-directions-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-b-v1.webp', width: 1254, height: 1254, referenceWidth: 292,
      grid: {x: [0,313,627,940,1254], y: [0,313,627,896,1254]},
      sha256: '6594c1b1cb8675f52e4408e0d4f7574ea5f157dde84b748d2f2923f92f526572',
      visualReview: "Four distinct heading rows: steep front-left, shallow front-left, left profile, and rear-left. Requested 120/150/180/210 are approximate bins. The final rear-left pose appears steeper than requested (roughly 225 rather than exact 210), but is visibly less rear-facing/wider than sheet C row 1. A measured clear gutter at y=896 replaces the equal-grid y=940 boundary so all heads remain intact. Sixteen distinct frames; no visible artwork clipping or high-alpha red/yellow fringe."
    },
    {
      src: 'images/atlas/pinpin-directions-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-c-v1.webp', width: 1254, height: 1254, referenceWidth: 263,
      grid: {x: [0,313,627,940,1254], y: [0,313,627,940,1254]},
      sha256: '08c80ee3dc504c7edae7c8ff0edfc707a3c2d3c2cb0c7262e8a9f033a5e2d52f',
      visualReview: "Four distinct heading rows: steep rear-left, centered rear/up, steep rear-right, and shallower rear-right. Approximate requested bins 240/270/300/330; no exact-angle certification. Row 1 is narrower and more rear-facing than sheet B row 4. Sixteen intact walk frames with genuine alpha; red/yellow diagnostic fringe alpha is at most 3/255."
    },
    {
      src: 'images/atlas/pinpin-directions-intermediate-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-b-v1.webp', width: 1254, height: 1254, referenceWidth: 303.776,
      grid: {x: [0,313,627,940,1254], y: [0,313,598,886,1254]},
      sha256: '49c8fa5b1bcf14e92eb2d233760bfc3fe6b0c698d14339802fcebcea4298c0d1',
      preparation: 'images/atlas/pinpin-directions-intermediate-b-v1.prepare.json',
      visualReview: 'Parent visually inspected the same character identity and four walking phases per row. Requested 135/165/195/225 are approximate azimuth bins, not certified angles; 225 resembles the older approximate 210 row. All sixteen frames have clear measured gutters. One fixed sheet scale matches measured neighboring legacy body sizes at displayWidth 56.'
    },
    {
      "src": "images/atlas/pinpin-directions-intermediate-c-v1.png",
      "runtimeSrc": "images/atlas/pinpin-directions-intermediate-c-v1.webp",
      "width": 1254,
      "height": 1254,
      "referenceWidth": 263.396,
      "grid": {
        "x": [
          0,
          313,
          627,
          940,
          1254
        ],
        "y": [
          0,
          313,
          627,
          940,
          1254
        ]
      },
      "sha256": "3399cb0c4bfef2dd31b5c7977709f57d0d020a37f2e2d6fd7628b0e87ddf3fef",
      "visualReview": "Parent visually inspected sixteen separate complete frames and requested heading rows 255/285/315/345. These are approximate bins, not certified azimuths: 255 resembles the old 240 heading and 285 resembles old 300. All internal gutters are clear. Fixed sheet scale uses measured neighboring legacy body sizes at displayWidth 56.",
      "preparation": "images/atlas/pinpin-directions-intermediate-c-v1.prepare.json"
    },
    {
      src: 'images/atlas/pinpin-directions-intermediate-a-v2.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-a-v2.webp', width: 1254, height: 1254, referenceWidth: 301.912,
      grid: {x: [0,335,646,957,1254], y: [0,313,627,940,1254]},
      sha256: 'c87e5160f28b7e5e0d05ac5864c84637b03f0af95d7f2e68dac10d89e4456277',
      preparation: 'images/atlas/pinpin-directions-intermediate-a-v2.prepare.json',
      visualReview: 'Parent visually inspected the repaired v2 sheet: four requested heading rows 15/45/75/105, four walking phases, complete top-right nose and generous gutter. Approximate azimuth bins, not certified angles. All sixteen frames pass measured internal and outer-edge clearance. One fixed sheet scale matches neighboring legacy body sizes at displayWidth 56.'
    }
  ],
  directions: [
    {angle: 0, src: 'images/atlas/pinpin-directions-a-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-a-v1.webp', referenceWidth: 285, frames: [
      {rect: [26,82,284,191], anchor: [142,186]},
      {rect: [337,82,282,195], anchor: [141,190]},
      {rect: [648,81,285,200], anchor: [142.5,195]},
      {rect: [965,82,281,201], anchor: [141,196]}
    ]},
    {angle: 30, src: 'images/atlas/pinpin-directions-a-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-a-v1.webp', referenceWidth: 285, frames: [
      {rect: [35,355,273,232], anchor: [137,227]},
      {rect: [352,353,259,238], anchor: [129.5,233]},
      {rect: [663,355,257,237], anchor: [129,232]},
      {rect: [977,353,253,242], anchor: [126.5,237]}
    ]},
    {angle: 60, src: 'images/atlas/pinpin-directions-a-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-a-v1.webp', referenceWidth: 285, frames: [
      {rect: [50,641,230,262], anchor: [114.5,257]},
      {rect: [364,642,227,264], anchor: [113,259]},
      {rect: [678,642,221,269], anchor: [110,264]},
      {rect: [990,642,222,256], anchor: [111,251]}
    ]},
    {angle: 90, src: 'images/atlas/pinpin-directions-a-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-a-v1.webp', referenceWidth: 285, frames: [
      {rect: [59,942,205,244], anchor: [102.5,239]},
      {rect: [372,944,203,256], anchor: [101,251]},
      {rect: [689,942,204,254], anchor: [101,249]},
      {rect: [998,943,202,260], anchor: [100.5,256]}
    ]},
    {angle: 120, src: 'images/atlas/pinpin-directions-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-b-v1.webp', referenceWidth: 292, frames: [
      {rect: [56,48,227,244], anchor: [112.5,239]},
      {rect: [369,48,227,244], anchor: [113,239]},
      {rect: [681,48,227,246], anchor: [112.5,241]},
      {rect: [992,49,227,238], anchor: [113,233]}
    ]},
    {angle: 150, src: 'images/atlas/pinpin-directions-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-b-v1.webp', referenceWidth: 292, frames: [
      {rect: [37,358,270,231], anchor: [134.5,226]},
      {rect: [334,360,281,222], anchor: [140,218]},
      {rect: [643,359,280,223], anchor: [140,218]},
      {rect: [954,358,269,225], anchor: [134,220]}
    ]},
    {angle: 180, src: 'images/atlas/pinpin-directions-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-b-v1.webp', referenceWidth: 292, frames: [
      {rect: [17,651,289,222], anchor: [143.5,218]},
      {rect: [326,650,290,215], anchor: [144.5,210]},
      {rect: [638,650,292,215], anchor: [145.5,210]},
      {rect: [951,652,287,213], anchor: [143,208]}
    ]},
    {angle: 210, src: 'images/atlas/pinpin-directions-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-b-v1.webp', referenceWidth: 292, frames: [
      {rect: [57,919,244,252], anchor: [121,247]},
      {rect: [374,920,236,253], anchor: [117.5,249]},
      {rect: [688,921,233,255], anchor: [116,250]},
      {rect: [1001,921,228,255], anchor: [113.5,250]}
    ]},
    {angle: 240, src: 'images/atlas/pinpin-directions-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-c-v1.webp', referenceWidth: 263, frames: [
      {rect: [75,62,203,233], anchor: [101,228]},
      {rect: [386,59,203,232], anchor: [101,227]},
      {rect: [697,59,201,236], anchor: [99.5,231]},
      {rect: [1012,58,198,234], anchor: [98,229]}
    ]},
    {angle: 270, src: 'images/atlas/pinpin-directions-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-c-v1.webp', referenceWidth: 263, frames: [
      {rect: [81,330,177,271], anchor: [88.5,266]},
      {rect: [386,332,176,270], anchor: [87,265]},
      {rect: [699,332,172,260], anchor: [86,255]},
      {rect: [1005,331,175,273], anchor: [87,268]}
    ]},
    {angle: 300, src: 'images/atlas/pinpin-directions-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-c-v1.webp', referenceWidth: 263, frames: [
      {rect: [57,658,219,244], anchor: [109.5,239]},
      {rect: [365,658,218,238], anchor: [109,233]},
      {rect: [676,659,225,239], anchor: [112,234]},
      {rect: [991,659,220,240], anchor: [110,235]}
    ]},
    {angle: 330, src: 'images/atlas/pinpin-directions-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-c-v1.webp', referenceWidth: 263, frames: [
      {rect: [37,963,256,220], anchor: [128,215]},
      {rect: [350,962,257,218], anchor: [128.5,213]},
      {rect: [660,962,263,220], anchor: [131,215]},
      {rect: [972,962,251,219], anchor: [125.5,214]}
    ]},
    {angle: 135, src: 'images/atlas/pinpin-directions-intermediate-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-b-v1.webp', referenceWidth: 303.776, frames: [
      {rect: [52,44,236,253], anchor: [117,248]},
      {rect: [364,45,239,250], anchor: [118.5,245]},
      {rect: [677,43,238,254], anchor: [118,249]},
      {rect: [992,45,235,246], anchor: [116.5,241]}
    ]},
    {angle: 165, src: 'images/atlas/pinpin-directions-intermediate-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-b-v1.webp', referenceWidth: 303.776, frames: [
      {rect: [20,336,285,234], anchor: [141,230]},
      {rect: [322,339,296,237], anchor: [147,232]},
      {rect: [637,337,293,227], anchor: [145,222]},
      {rect: [950,339,285,234], anchor: [141.5,229]}
    ]},
    {angle: 195, src: 'images/atlas/pinpin-directions-intermediate-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-b-v1.webp', referenceWidth: 303.776, frames: [
      {rect: [18,621,284,237], anchor: [140.5,233]},
      {rect: [338,621,276,233], anchor: [137,228]},
      {rect: [642,621,281,231], anchor: [139.5,226]},
      {rect: [958,620,277,235], anchor: [138,230]}
    ]},
    {angle: 225, src: 'images/atlas/pinpin-directions-intermediate-b-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-b-v1.webp', referenceWidth: 303.776, frames: [
      {rect: [53,907,250,265], anchor: [123.5,261]},
      {rect: [383,907,240,269], anchor: [119.5,264]},
      {rect: [696,908,241,272], anchor: [119.5,267]},
      {rect: [1011,909,228,271], anchor: [113,266]}
    ]},
    {angle: 255, src: 'images/atlas/pinpin-directions-intermediate-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-c-v1.webp', referenceWidth: 263.396, frames: [
      {rect: [80,54,190,248], anchor: [94,243]},
      {rect: [389,55,193,249], anchor: [96,244]},
      {rect: [700,57,193,247], anchor: [95,242]},
      {rect: [1020,56,188,245], anchor: [93.5,240]}
    ]},
    {angle: 285, src: 'images/atlas/pinpin-directions-intermediate-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-c-v1.webp', referenceWidth: 263.396, frames: [
      {rect: [71,350,197,259], anchor: [98.5,254]},
      {rect: [385,355,196,250], anchor: [98,245]},
      {rect: [689,351,199,258], anchor: [99.5,253]},
      {rect: [1009,348,193,259], anchor: [96,254]}
    ]},
    {angle: 315, src: 'images/atlas/pinpin-directions-intermediate-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-c-v1.webp', referenceWidth: 263.396, frames: [
      {rect: [58,666,224,248], anchor: [112,243]},
      {rect: [367,665,226,243], anchor: [112.5,238]},
      {rect: [672,664,227,249], anchor: [113.5,244]},
      {rect: [990,664,222,247], anchor: [111,242]}
    ]},
    {angle: 345, src: 'images/atlas/pinpin-directions-intermediate-c-v1.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-c-v1.webp', referenceWidth: 263.396, frames: [
      {rect: [37,976,272,207], anchor: [136.5,202]},
      {rect: [347,976,267,210], anchor: [134,205]},
      {rect: [655,975,267,211], anchor: [134,207]},
      {rect: [966,975,270,211], anchor: [135,207]}
    ]},
    {angle: 15, src: 'images/atlas/pinpin-directions-intermediate-a-v2.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-a-v2.webp', referenceWidth: 301.912, frames: [
      {rect: [36,57,285,217], anchor: [142,212]},
      {rect: [349,56,284,220], anchor: [142.5,215]},
      {rect: [660,56,284,220], anchor: [142,215]},
      {rect: [971,56,273,221], anchor: [137,216]}
    ]},
    {angle: 45, src: 'images/atlas/pinpin-directions-intermediate-a-v2.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-a-v2.webp', referenceWidth: 301.912, frames: [
      {rect: [41,343,268,249], anchor: [134,244]},
      {rect: [351,343,262,252], anchor: [131.5,248]},
      {rect: [666,343,256,251], anchor: [128,247]},
      {rect: [978,343,258,251], anchor: [129.5,246]}
    ]},
    {angle: 75, src: 'images/atlas/pinpin-directions-intermediate-a-v2.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-a-v2.webp', referenceWidth: 301.912, frames: [
      {rect: [48,638,237,270], anchor: [118.5,266]},
      {rect: [363,638,236,271], anchor: [118,266]},
      {rect: [674,638,235,272], anchor: [117.5,267]},
      {rect: [987,638,236,265], anchor: [118.5,260]}
    ]},
    {angle: 105, src: 'images/atlas/pinpin-directions-intermediate-a-v2.png', runtimeSrc: 'images/atlas/pinpin-directions-intermediate-a-v2.webp', referenceWidth: 301.912, frames: [
      {rect: [53,940,233,253], anchor: [116,248]},
      {rect: [367,940,232,267], anchor: [116,263]},
      {rect: [678,940,234,266], anchor: [116,261]},
      {rect: [992,940,234,268], anchor: [116.5,263]}
    ]}
  ].sort((a, b) => a.angle - b.angle)
};

// BEGIN GENERATED ATLAS BLEND TRANSITIONS
window.atlasDirections.blendTransitionProvenance = {
  "version": 1,
  "method": "anchored-alpha-and-connected-cream-region-v1",
  "displayWidth": 56,
  "canvas": [
    128,
    128
  ],
  "anchor": [
    64,
    112
  ],
  "gaitComparison": "all-16-phase-combinations",
  "rules": {
    "minAlphaIoU": 0.82,
    "maxCentroidDistance": 2,
    "maxFaceCentroidDistance": 2,
    "maxFaceBoundsDistance": 3,
    "minFacePixels": 12,
    "maxAngleDistance": 15,
    "durationMs": 80
  },
  "sources": [
    {
      "src": "images/atlas/pinpin-directions-a-v1.png",
      "sha256": "8be56abd29348419d471151cf5092b41567ed73fe2a97a15b665c320357159c0"
    },
    {
      "src": "images/atlas/pinpin-directions-a-v1.webp",
      "sha256": "da0808dbe1488d36e5614b815ac1203d6845693c3d57f59599d8803c75a08ff6"
    },
    {
      "src": "images/atlas/pinpin-directions-b-v1.png",
      "sha256": "6594c1b1cb8675f52e4408e0d4f7574ea5f157dde84b748d2f2923f92f526572"
    },
    {
      "src": "images/atlas/pinpin-directions-b-v1.webp",
      "sha256": "ea732db50bd6ee148d197ff40ac0f4c64310a27654f585c04ba692381393df43"
    },
    {
      "src": "images/atlas/pinpin-directions-c-v1.png",
      "sha256": "08c80ee3dc504c7edae7c8ff0edfc707a3c2d3c2cb0c7262e8a9f033a5e2d52f"
    },
    {
      "src": "images/atlas/pinpin-directions-c-v1.webp",
      "sha256": "ce5a5fa4ac8bb1515503704760c4528c5a748273bef04a66da2758123c56b3b8"
    },
    {
      "src": "images/atlas/pinpin-directions-intermediate-a-v2.png",
      "sha256": "c87e5160f28b7e5e0d05ac5864c84637b03f0af95d7f2e68dac10d89e4456277"
    },
    {
      "src": "images/atlas/pinpin-directions-intermediate-a-v2.webp",
      "sha256": "08b8bb516a07e685ffb82c9ca5f541377559e30bf9d8d4c37c10543973bb4f15"
    },
    {
      "src": "images/atlas/pinpin-directions-intermediate-b-v1.png",
      "sha256": "49c8fa5b1bcf14e92eb2d233760bfc3fe6b0c698d14339802fcebcea4298c0d1"
    },
    {
      "src": "images/atlas/pinpin-directions-intermediate-b-v1.webp",
      "sha256": "5b8c4b5778590572ca7c481caad28854af013076376be4fe4a3c8687d20cf2b9"
    },
    {
      "src": "images/atlas/pinpin-directions-intermediate-c-v1.png",
      "sha256": "3399cb0c4bfef2dd31b5c7977709f57d0d020a37f2e2d6fd7628b0e87ddf3fef"
    },
    {
      "src": "images/atlas/pinpin-directions-intermediate-c-v1.webp",
      "sha256": "255f9bffae18f4866e542a6882f4afd7a802200cca2e13160b1d6f6798bc94b1"
    }
  ],
  "geometrySha256": "045bac227c3b2de4213c07b170cb6e4896aeeb976aa4bb5dbaa14a8034de7c99",
  "rendering": "Chrome Canvas2D drawImage, default image smoothing, runtime WebP sources; unchanged PNG sources also hashed."
};
window.atlasDirections.blendTransitions = [
  {"from":0,"to":15,"allowed":false,"durationMs":80,"score":0.7538},
  {"from":15,"to":30,"allowed":false,"durationMs":80,"score":0.6749},
  {"from":30,"to":45,"allowed":false,"durationMs":80,"score":0.8336},
  {"from":45,"to":60,"allowed":false,"durationMs":80,"score":0.7341},
  {"from":60,"to":75,"allowed":false,"durationMs":80,"score":0.8123},
  {"from":75,"to":90,"allowed":false,"durationMs":80,"score":0.7573},
  {"from":90,"to":105,"allowed":false,"durationMs":80,"score":0.7769},
  {"from":105,"to":120,"allowed":false,"durationMs":80,"score":0.7415},
  {"from":120,"to":135,"allowed":true,"durationMs":80,"score":0.8857},
  {"from":135,"to":150,"allowed":false,"durationMs":80,"score":0.7153},
  {"from":150,"to":165,"allowed":false,"durationMs":80,"score":0.8575},
  {"from":165,"to":180,"allowed":false,"durationMs":80,"score":0.7851},
  {"from":180,"to":195,"allowed":false,"durationMs":80,"score":0.7753},
  {"from":195,"to":210,"allowed":false,"durationMs":80,"score":0.6623},
  {"from":210,"to":225,"allowed":false,"durationMs":80,"score":0.8233},
  {"from":225,"to":240,"allowed":false,"durationMs":80,"score":0.7962},
  {"from":240,"to":255,"allowed":false,"durationMs":80,"score":0.8237},
  {"from":255,"to":270,"allowed":false,"durationMs":80,"score":0.7052},
  {"from":270,"to":285,"allowed":false,"durationMs":80,"score":0.6963},
  {"from":285,"to":300,"allowed":false,"durationMs":80,"score":0.7634},
  {"from":300,"to":315,"allowed":false,"durationMs":80,"score":0.8701},
  {"from":315,"to":330,"allowed":false,"durationMs":80,"score":0.7208},
  {"from":330,"to":345,"allowed":false,"durationMs":80,"score":0.7624},
  {"from":345,"to":0,"allowed":false,"durationMs":80,"score":0.6296}
];
// END GENERATED ATLAS BLEND TRANSITIONS
