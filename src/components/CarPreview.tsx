import * as React from 'react';
import * as THREE from 'three';
import { makeCar, studioEnvironment } from '@/engine/three/car';
import { cn } from '@/lib/utils';

/** A small turntable with the child's car in the chosen colour. */
export function CarPreview({ color, className }: { color: string; className?: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const paint = React.useRef<THREE.MeshPhysicalMaterial | null>(null);
  React.useEffect(() => {
    const cv = ref.current!; let r: THREE.WebGLRenderer;
    try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { return; }
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, .1, 50); cam.position.set(4.8, 2.6, 6.2); cam.lookAt(0, .6, 0);
    scene.environment = studioEnvironment(r, 0xdfeeff, 0xfff4e0, 0xe9e2d6); scene.environmentIntensity = .9;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d2c4, 1.4)); const d = new THREE.DirectionalLight(0xfff0d6, 2.2); d.position.set(4, 8, 5); scene.add(d);
    const car = makeCar(); scene.add(car); paint.current = car.userData.paint; car.userData.paint.color.set(color);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, .12, 48), new THREE.MeshStandardMaterial({ color: 0xf3eee6, roughness: .5 })); disc.position.y = -.06; scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, .05, 8, 64), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: .6, roughness: .3 })); ring.rotation.x = Math.PI / 2; ring.position.y = .01; scene.add(ring);
    const size = () => { const w = cv.clientWidth || 300, h = cv.clientHeight || 180; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); const ro = new ResizeObserver(size); ro.observe(cv);
    let raf = 0, last = performance.now();
    const frame = (now: number) => { raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; car.rotation.y += dt * .7; car.userData.wheels.forEach(w => { w.rotation.x -= dt * 3; }); r.render(scene, cam); };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); r.dispose(); paint.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => { paint.current?.color.set(color); }, [color]);
  return <canvas ref={ref} className={cn('block', className)} aria-label="معاينة السيارة" />;
}
