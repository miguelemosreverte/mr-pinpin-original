# Three.js 0.180.0

Vendored from the published `three@0.180.0` npm package via jsDelivr:

- `build/three.core.min.js`
- `examples/jsm/renderers/CSS3DRenderer.js`
- `LICENSE` (MIT)

The renderer's bare `three` import is changed to `./three.core.min.js`.
The core contains the scene graph and perspective camera without a GPU renderer.
Atlas uses CSS3DRenderer on the existing overlay and does not create another GPU context.

Reference: https://threejs.org/docs/pages/CSS3DRenderer.html
