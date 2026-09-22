// Shared room geometry contract. Image/depth dimensions and SVG viewBox must agree.
// Expanded room: canonical window–door–window front wall, plus full bookcase.
export const SCENE = Object.freeze({
  width:1254, height:1254,
  color:'storyboard/images/house-menu/room-expanded-v2.webp',
  depth:'storyboard/images/house-menu/room-expanded-depth-v1.webp',
  zoom:Object.freeze({initial:1.25,min:1.08,max:3}),
  centers:Object.freeze({portrait:Object.freeze([520/1254,.5]),landscape:Object.freeze([.5,.5])}),
  anchors:Object.freeze({'door-link':Object.freeze([520/1254,530/1254]),'bookcase-link':Object.freeze([1140/1254,495/1254])})
});
export const WORLD = Object.freeze({width:SCENE.width,height:SCENE.height});
