/**
 * The 3D race world: gradient sky, warm sun, the road with its roadside, the car, three answer gates,
 * gems and confetti. It only knows how to draw and move things — the rules live in RaceGame.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { AR_DIGITS, clamp, pick, rand } from '@/lib/utils';
import { makeCar, roundRect, softGlow, studioEnvironment, tex, type CanvasTex, type Car } from './car';

export const LANE_X = [-3, 0, 3];
const GATE_COL = ['#F59E0B', '#2563EB', '#10B981'];
const ROAD_W = 10.5, ROAD_LEN = 440, TILE = 8, SPAN = 224;
const SKY_TOP = 0x5aa9ee, SKY_HORIZON = 0xfde8cc;
const PN = 260;
const CONF: number[][] = [[1, .78, .2], [.96, .25, .37], [.15, .42, 1], [.06, .73, .5], [1, .62, .04], [1, 1, 1]];

interface Gate { g: THREE.Group; t: CanvasTex; col: string }

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 1, .1, 700);
  car: Car;
  row = new THREE.Group();
  gates: Gate[] = [];
  gems: THREE.Mesh[] = [];
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private camBase = new THREE.Vector3(0, 5.2, 8.6);
  private sun: THREE.DirectionalLight;
  private roadTex: CanvasTex; private grassTex: CanvasTex; private curbTex: CanvasTex;
  private scenery: THREE.Object3D[] = [];
  private clouds: THREE.Group[] = [];
  private laneNums: { t: CanvasTex; n: number }[] = [];
  private pPos = new Float32Array(PN * 3); private pCol = new Float32Array(PN * 3); private pVel = new Float32Array(PN * 3); private pLife = new Float32Array(PN);
  private pGeo = new THREE.BufferGeometry(); private pNext = 0;
  private flashSprite: THREE.Sprite; private flashT = 0;
  private ray = new THREE.Raycaster(); private ndc = new THREE.Vector2();
  private aniso: number;

  constructor(public canvas: HTMLCanvasElement) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
    this.aniso = Math.min(8, r.capabilities.getMaxAnisotropy());
    const scene = this.scene;
    scene.fog = new THREE.Fog(0xe6eef2, 120, 290);
    scene.environment = studioEnvironment(r, 0xbfe3ff, SKY_HORIZON, 0x9fd68f); scene.environmentIntensity = .4;

    // light: soft sky fill + a warm low sun
    scene.add(new THREE.HemisphereLight(0xfff7ea, 0x8fcf7c, .95));
    const sun = (this.sun = new THREE.DirectionalLight(0xffedd0, 1.75)); sun.position.set(9, 20, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.radius = 4;
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 12, bottom: -34, near: 1, far: 60 }); sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun, sun.target);

    this.buildSky();
    const t = this.buildGround(); this.roadTex = t.roadTex; this.grassTex = t.grassTex; this.curbTex = t.curbTex;
    this.buildRoadside();
    this.car = makeCar(); scene.add(this.car);
    this.buildGates();
    this.buildGems();
    this.buildParticles();
    this.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow(), color: 0xfff1b8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    this.flashSprite.visible = false; scene.add(this.flashSprite);

    // post: gentle bloom on the bright bits only (lamps, gems, sun), then tone-map to the screen
    const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, target);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .32, .55, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.resize();
  }

  /* ---------- construction ---------- */
  private buildSky() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(SKY_TOP) }, mid: { value: new THREE.Color(0xa9d8f7) }, hor: { value: new THREE.Color(SKY_HORIZON) } },
      vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 p; void main(){ float h = clamp(normalize(p).y, 0.0, 1.0); vec3 c = mix(hor, mid, smoothstep(0.0, .22, h)); c = mix(c, top, smoothstep(.18, .75, h)); gl_FragColor = vec4(c, 1.0); }',
    }));
    sky.renderOrder = -10; this.scene.add(sky);
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd98a).multiplyScalar(2.2), fog: false }));
    sunBall.position.set(-95, 70, -330); this.scene.add(sunBall);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow(), color: 0xffe2a8, transparent: true, opacity: .55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(150); halo.position.copy(sunBall.position); this.scene.add(halo);
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: .92 }), cloudGeo = new THREE.SphereGeometry(1, 14, 10);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(cloudGeo, cloudMat); s.scale.set(rand(7, 12), rand(3.4, 5.4), rand(5, 8)); s.position.set(k * 8 - 12, rand(-1, 2), 0); g.add(s); }
      g.position.set(rand(-230, 230), rand(55, 100), rand(-380, -260)); this.scene.add(g); this.clouds.push(g);
    }
    // far, hazy hills give the horizon some depth
    const hillGeo = new THREE.SphereGeometry(1, 20, 12);
    [0x8fd08a, 0x7cc47f, 0xa3d99a].forEach((c, k) => {
      for (let i = 0; i < 5; i++) {
        const h = new THREE.Mesh(hillGeo, new THREE.MeshLambertMaterial({ color: c })), side = i % 2 ? 1 : -1;
        h.scale.set(rand(40, 70), rand(10, 22), rand(30, 50)); h.position.set(side * rand(60, 170), -2, -150 - k * 28 - rand(0, 30)); this.scene.add(h);
      }
    });
  }

  private buildGround() {
    const scene = this.scene, A = this.aniso;
    const roadTex = tex(256, 256, (x, w, h) => {
      x.fillStyle = '#434a66'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() > .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      const u = w / ROAD_W; x.fillStyle = '#f4f1ea';
      [-4.6, 4.6].forEach(p => x.fillRect(w / 2 + p * u - 3, 0, 6, h));
      x.fillStyle = '#ffd766'; [-1.5, 1.5].forEach(p => x.fillRect(w / 2 + p * u - 3, 0, 6, h * .5));
    }, [1, ROAD_LEN / TILE], A);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, ROAD_LEN), new THREE.MeshStandardMaterial({ map: roadTex, roughness: .82, metalness: 0 }));
    road.rotation.x = -Math.PI / 2; road.position.z = -ROAD_LEN / 2 + 30; road.receiveShadow = true; scene.add(road);

    const curbTex = tex(32, 64, (x, w, h) => { x.fillStyle = '#F43F5E'; x.fillRect(0, 0, w, h / 2); x.fillStyle = '#faf8f5'; x.fillRect(0, h / 2, w, h / 2); }, [1, ROAD_LEN / 3], A);
    [-1, 1].forEach(s => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(.7, .3, ROAD_LEN), new THREE.MeshLambertMaterial({ color: 0xe9e4da }));
      base.position.set(s * (ROAD_W / 2 + .35), .15, road.position.z); scene.add(base);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(.7, ROAD_LEN), new THREE.MeshLambertMaterial({ map: curbTex }));
      top.rotation.x = -Math.PI / 2; top.position.set(s * (ROAD_W / 2 + .35), .305, road.position.z); scene.add(top);
    });
    const grassTex = tex(128, 128, (x, w, h) => {
      x.fillStyle = '#74cf6a'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { x.fillStyle = pick(['#68c45d', '#80da73', '#62ba57', '#8be07e']); x.beginPath(); x.arc(Math.random() * w, Math.random() * h, rand(1.5, 5), 0, 7); x.fill(); }
      for (let i = 0; i < 10; i++) { x.fillStyle = pick(['#fff', '#ffe36b', '#ff9ac1']); x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 1.6, 0, 7); x.fill(); }
    }, [60, ROAD_LEN / TILE], A);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(480, ROAD_LEN), new THREE.MeshLambertMaterial({ map: grassTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.02, road.position.z); ground.receiveShadow = true; scene.add(ground);

    // lane numbers painted in front of the car (١ on the right, the Arabic reading order)
    [2, 1, 0].forEach((lane, i) => {
      const t = tex(64, 64, x => { x.font = '800 52px Tajawal, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(AR_DIGITS[i + 1], 32, 36); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(LANE_X[lane], .02, -5.2); scene.add(m); this.laneNums.push({ t, n: i + 1 });
    });
    return { roadTex, grassTex, curbTex };
  }
  /** Repaint canvas-drawn text once the web fonts are in. */
  repaintText() {
    this.laneNums.forEach(({ t, n }) => { const x = t.userData.x; x.clearRect(0, 0, 64, 64); x.fillText(AR_DIGITS[n], 32, 36); t.needsUpdate = true; });
  }

  private buildRoadside() {
    const scene = this.scene, scenery = this.scenery;
    const trunkGeo = new THREE.CylinderGeometry(.25, .36, 1.8, 8), coneA = new THREE.ConeGeometry(1.7, 2.8, 10), coneB = new THREE.ConeGeometry(1.25, 2.2, 10), ballGeo = new THREE.SphereGeometry(1.7, 14, 10);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a33 });
    const leafMats = [0x2fae5a, 0x3cc267, 0x239e63, 0x58c94f, 0xf2a0b5].map(c => new THREE.MeshLambertMaterial({ color: c }));
    const tree = (x: number, z: number, round: boolean) => {
      const g = new THREE.Group(), leaf = round ? pick(leafMats) : pick(leafMats.slice(0, 4));
      const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.y = .9; t.castShadow = true; g.add(t);
      if (round) { const b = new THREE.Mesh(ballGeo, leaf); b.position.y = 3; b.scale.y = 1.15; b.castShadow = true; g.add(b); }
      else { const a = new THREE.Mesh(coneA, leaf); a.position.y = 2.9; a.castShadow = true; g.add(a); const b = new THREE.Mesh(coneB, leaf); b.position.y = 4.3; g.add(b); }
      g.scale.setScalar(rand(.85, 1.6)); g.position.set(x, 0, z); scene.add(g); scenery.push(g);
    };
    const poleGeo = new THREE.CylinderGeometry(.08, .11, 5.2, 8), armGeo = new THREE.BoxGeometry(1.5, .1, .1), lampGeo = new THREE.BoxGeometry(.6, .14, .3);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c6787, metalness: .6, roughness: .4 }), lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe9a0).multiplyScalar(1.8) });
    const lamp = (x: number, z: number, dir: number) => {
      const g = new THREE.Group();
      const p = new THREE.Mesh(poleGeo, poleMat); p.position.y = 2.6; g.add(p);
      const a = new THREE.Mesh(armGeo, poleMat); a.position.set(dir * .7, 5.15, 0); g.add(a);
      const l = new THREE.Mesh(lampGeo, lampMat); l.position.set(dir * 1.35, 5.06, 0); g.add(l);
      g.position.set(x, 0, z); scene.add(g); scenery.push(g);
    };
    // little flower clumps close to the kerb
    const petalGeo = new THREE.SphereGeometry(.22, 8, 6), petalMats = [0xffffff, 0xffd766, 0xf9a8c0, 0xf43f5e].map(c => new THREE.MeshLambertMaterial({ color: c }));
    const flowers = (x: number, z: number) => {
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(petalGeo, pick(petalMats)); f.position.set(rand(-.8, .8), .2, rand(-.8, .8)); g.add(f); }
      g.position.set(x, 0, z); scene.add(g); scenery.push(g);
    };
    for (let i = 0; i < 16; i++) { const z = -200 + i * 14; tree(-rand(8.5, 20), z + rand(0, 6), i % 3 === 0); tree(rand(8.5, 20), z + rand(0, 6), i % 3 === 1); }
    for (let i = 0; i < 8; i++) { const z = -200 + i * 28; lamp(-6.5, z, 1); lamp(6.5, z + 14, -1); }
    for (let i = 0; i < 14; i++) { const z = -200 + i * 16; flowers(-rand(6.6, 8), z + rand(0, 8)); flowers(rand(6.6, 8), z + rand(0, 8)); }
  }

  private buildGates() {
    const row = this.row; row.visible = false; this.scene.add(row);
    const orbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1b8).multiplyScalar(2) }), orbGeo = new THREE.SphereGeometry(.2, 12, 10);
    this.gates = LANE_X.map((x, i) => {
      const g = new THREE.Group(); g.position.x = x; row.add(g);
      const mat = new THREE.MeshStandardMaterial({ color: GATE_COL[i], metalness: .35, roughness: .32 });
      const pillar = new THREE.CylinderGeometry(.14, .16, 3.3, 14);
      [-1.32, 1.32].forEach(px => {
        const p = new THREE.Mesh(pillar, mat); p.position.set(px, 1.65, 0); p.castShadow = true; g.add(p);
        const o = new THREE.Mesh(orbGeo, orbMat); o.position.set(px, 5.3, 0); g.add(o);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.9, .34, .34), mat); beam.position.y = 3.3; beam.castShadow = true; g.add(beam);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.92, 1.8, .18), mat); back.position.set(0, 4.34, -.1); back.castShadow = true; g.add(back);
      const t = tex(512, 300, () => {}, undefined, this.aniso);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.58), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); sign.position.set(0, 4.34, 0); g.add(sign);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 5), new THREE.MeshBasicMaterial({ color: GATE_COL[i], transparent: true, opacity: .34, depthWrite: false }));
      strip.rotation.x = -Math.PI / 2; strip.position.set(0, .03, 1.5); g.add(strip);
      return { g, t, col: GATE_COL[i] };
    });
  }
  drawSign(i: number, text: string, font: (fs: number) => string, ltr: boolean) {
    const gate = this.gates[i], x = gate.t.userData.x, W = 512, H = 300;
    x.clearRect(0, 0, W, H); x.fillStyle = gate.col; x.fillRect(0, 0, W, H);
    roundRect(x, 14, 14, W - 28, H - 28, 34); x.fillStyle = '#FAF8F5'; x.fill();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#1E3A8A';
    x.direction = ltr ? 'ltr' : 'rtl';
    let fs = 150; do { x.font = font(fs); fs -= 8; } while (x.measureText(text).width > W - 90 && fs > 56);
    x.fillText(text, W / 2, H / 2 + 6);
    gate.t.needsUpdate = true;
  }

  private buildGems() {
    const gemGeo = new THREE.OctahedronGeometry(.48), gemMat = new THREE.MeshStandardMaterial({ color: 0x31d0f5, emissive: 0x18b4e6, emissiveIntensity: 1.5, metalness: .5, roughness: .12 });
    this.gems = [0, 1, 2].map(() => { const m = new THREE.Mesh(gemGeo, gemMat); m.visible = false; m.scale.y = 1.25; this.scene.add(m); return m; });
  }
  private buildParticles() {
    for (let i = 0; i < PN; i++) this.pPos[i * 3 + 1] = -99;
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); this.pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    const starTex = tex(64, 64, x => { x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 13 : 30, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.closePath(); x.fill(); });
    const points = new THREE.Points(this.pGeo, new THREE.PointsMaterial({ size: .8, map: starTex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: .2, toneMapped: false }));
    points.frustumCulled = false; this.scene.add(points);
  }

  /* ---------- effects ---------- */
  burst(x: number, y: number, z: number, n: number, colors: number[][] = CONF) {
    const { pPos, pVel, pCol, pLife } = this;
    for (let k = 0; k < n; k++) {
      const i = this.pNext; this.pNext = (this.pNext + 1) % PN; const c = pick(colors);
      pPos[i * 3] = x + rand(-.6, .6); pPos[i * 3 + 1] = y + rand(0, .8); pPos[i * 3 + 2] = z + rand(-.6, .6);
      pVel[i * 3] = rand(-6, 6); pVel[i * 3 + 1] = rand(5, 13); pVel[i * 3 + 2] = rand(-7, 3);
      pCol[i * 3] = c[0]; pCol[i * 3 + 1] = c[1]; pCol[i * 3 + 2] = c[2]; pLife[i] = rand(.8, 1.5);
    }
    this.pGeo.attributes.color.needsUpdate = true;
  }
  /** A quick warm flash around the car when a gate is answered correctly. */
  flash(x: number) { this.flashSprite.position.set(x, 1.4, -1); this.flashSprite.visible = true; this.flashT = .5; }
  paint(hex: string) { this.car.userData.paint.color.set(hex); }

  /* ---------- per-frame ---------- */
  /** Move the world past the car by `d` metres. */
  scroll(d: number, dist: number, dt: number) {
    this.roadTex.offset.y = (dist / TILE) % 1; this.grassTex.offset.y = (dist / TILE) % 1; this.curbTex.offset.y = (dist / 3) % 1;
    for (const s of this.scenery) { s.position.z += d; if (s.position.z > 24) s.position.z -= SPAN; }
    for (const c of this.clouds) { c.position.x += dt * 1.2; if (c.position.x > 240) c.position.x = -240; }
  }
  driveCar(lane: number, d: number, dt: number, t: number, speed: number) {
    const car = this.car, tx = LANE_X[lane], vx = tx - car.position.x;
    car.position.x += vx * Math.min(1, dt * 9);
    car.rotation.y = -vx * .11; car.userData.body.rotation.z = -vx * .05;
    car.userData.body.position.y = Math.sin(t * 22) * .012 * Math.min(1, speed / 20);
    car.userData.wheels.forEach(w => { w.rotation.x -= d / .42; });
    this.sun.target.position.set(car.position.x * .3, 0, -8); this.sun.position.set(car.position.x * .3 + 9, 20, -1);
  }
  particles(dt: number, speed: number) {
    const { pPos, pVel, pLife } = this; let alive = false;
    for (let i = 0; i < PN; i++) {
      if (pLife[i] <= 0) continue; alive = true; pLife[i] -= dt;
      pVel[i * 3 + 1] -= 20 * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += (pVel[i * 3 + 2] + speed * .3) * dt;
      if (pLife[i] <= 0) pPos[i * 3 + 1] = -99;
    }
    if (alive) this.pGeo.attributes.position.needsUpdate = true;
    if (this.flashT > 0) {
      this.flashT -= dt; const k = Math.max(0, this.flashT / .5);
      this.flashSprite.scale.setScalar(4 + (1 - k) * 12); (this.flashSprite.material as THREE.SpriteMaterial).opacity = k * .7;
      if (this.flashT <= 0) this.flashSprite.visible = false;
    }
  }
  aimCamera(shakeX: number, shakeY: number) {
    const cx = this.car.position.x;
    this.camera.position.set(this.camBase.x + cx * .35 + shakeX, this.camBase.y + shakeY, this.camBase.z);
    this.camera.lookAt(cx * .25, 1.3, -15);
  }
  render() { this.composer.render(); }

  resize() {
    const cv = this.canvas, w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    const a = w / h; this.camera.aspect = a;
    this.camera.fov = clamp(2 * Math.atan(.62 / a) * 180 / Math.PI, 55, 86);
    this.camBase.set(0, a < 1 ? 6.4 : 5.2, a < 1 ? 10.2 : 8.6);
    this.camera.updateProjectionMatrix();
  }

  /** Which lane a tap on the screen points at. */
  laneAt(cx: number, cy: number, rowActive: boolean): number {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this.ndc, this.camera);
    const o = this.ray.ray.origin, d = this.ray.ray.direction, zRef = rowActive && this.row.position.z < -6 ? this.row.position.z : -40;
    let px: number | null = null;
    if (d.y < -.02) { const k = -o.y / d.y, pz = o.z + d.z * k; if (pz > zRef) px = o.x + d.x * k; }   // touched the road in front of the gates
    if (px === null) { const k = (zRef - o.z) / d.z; px = o.x + d.x * k; }                               // touched a gate or above it
    return px < -1.5 ? 0 : px > 1.5 ? 2 : 1;
  }
}
