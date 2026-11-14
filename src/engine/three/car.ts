import * as THREE from 'three';

export type DrawFn = (x: CanvasRenderingContext2D, w: number, h: number) => void;
export interface CanvasTex extends THREE.CanvasTexture { userData: { c: HTMLCanvasElement; x: CanvasRenderingContext2D } }

/** A texture painted with the 2D canvas API. */
export function tex(w: number, h: number, draw: DrawFn, repeat?: [number, number], aniso = 1): CanvasTex {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; draw(x, w, h);
  const t = new THREE.CanvasTexture(c) as CanvasTex;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData = { c, x };
  return t;
}
export function roundRect(x: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, R: number) {
  x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath();
}

let glowTex: THREE.Texture | null = null;
export function softGlow() {
  return glowTex || (glowTex = tex(64, 64, x => {
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  }));
}

export interface Car extends THREE.Group { userData: { paint: THREE.MeshPhysicalMaterial; wheels: THREE.Group[]; body: THREE.Group } }

/** The racing car: glossy clear-coated paint, tinted glass, glowing lamps. */
export function makeCar(): Car {
  const g = new THREE.Group() as Car, body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf5333f, metalness: .45, roughness: .32, clearcoat: 1, clearcoatRoughness: .08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2338, metalness: .2, roughness: .6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x8fc8ee, metalness: .9, roughness: .05, clearcoat: 1 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .4 });
  const head = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe9a0, emissiveIntensity: 2.4 });
  const tail = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1a1a, emissiveIntensity: 2.2 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; body.add(b); return b;
  };
  box(1.9, .46, 4, paint, 0, .56, 0);
  box(1.7, .16, 1.3, paint, 0, .84, -1.15).rotation.x = .1;          // sloped bonnet
  box(1.46, .44, 1.75, glass, 0, 1.0, .25);
  box(1.52, .1, 1.82, paint, 0, 1.26, .25);
  [[-.72, -.6], [.72, -.6], [-.72, 1.1], [.72, 1.1]].forEach(p => box(.08, .46, .08, paint, p[0], 1.0, p[1]));
  box(.34, .02, 4.02, white, 0, .795, 0);                              // racing stripe
  box(1.96, .2, .26, dark, 0, .4, -2.04); box(1.96, .2, .26, dark, 0, .4, 2.04);
  box(.08, .36, .08, dark, -.6, .96, 1.72); box(.08, .36, .08, dark, .6, .96, 1.72);   // spoiler posts
  box(2.1, .07, .48, paint, 0, 1.17, 1.8);                             // spoiler wing
  box(.06, .28, .56, paint, -1.05, 1.13, 1.8); box(.06, .28, .56, paint, 1.05, 1.13, 1.8);
  box(.42, .17, .06, head, -.62, .62, -2.01); box(.42, .17, .06, head, .62, .62, -2.01);
  box(.52, .15, .06, tail, -.6, .64, 2.01); box(.52, .15, .06, tail, .6, .64, 2.01);
  const glow = (c: number, x: number, y: number, z: number, s: number) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow(), color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .8 }));
    sp.scale.setScalar(s); sp.position.set(x, y, z); body.add(sp);
  };
  glow(0xfff2a0, -.62, .62, -2.1, 1.1); glow(0xfff2a0, .62, .62, -2.1, 1.1); glow(0xff3030, -.6, .64, 2.1, 1.0); glow(0xff3030, .6, .64, 2.1, 1.0);
  const wheels: THREE.Group[] = [], tyre = new THREE.CylinderGeometry(.42, .42, .32, 24), rim = new THREE.MeshStandardMaterial({ color: 0xdfe6f5, metalness: .85, roughness: .22 });
  [[-.98, -1.25], [.98, -1.25], [-.98, 1.3], [.98, 1.3]].forEach(p => {
    const w = new THREE.Group();
    const t = new THREE.Mesh(tyre, dark); t.rotation.z = Math.PI / 2; t.castShadow = true; w.add(t);
    w.add(new THREE.Mesh(new THREE.BoxGeometry(.34, .62, .11), rim), new THREE.Mesh(new THREE.BoxGeometry(.34, .11, .62), rim));
    w.position.set(p[0], .42, p[1]); g.add(w); wheels.push(w);
  });
  g.userData = { paint, wheels, body };
  return g;
}

/** A neutral studio environment so glossy paint and glass have something soft to reflect. */
export function studioEnvironment(renderer: THREE.WebGLRenderer, top = 0xbfe3ff, horizon = 0xfff1dc, ground = 0x9fd68f): THREE.Texture {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(horizon) }, bot: { value: new THREE.Color(ground) } },
    vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 p; void main(){ float h = normalize(p).y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, .6)) : mix(mid, bot, pow(-h, .5)); gl_FragColor = vec4(c, 1.0); }',
  });
  s.add(new THREE.Mesh(geo, mat));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4d6).multiplyScalar(6) }));
  lamp.position.set(5, 6, 3); s.add(lamp);
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, .04);
  pm.dispose(); geo.dispose(); mat.dispose();
  return rt.texture;
}
