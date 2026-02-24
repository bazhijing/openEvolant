import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { motion } from 'framer-motion';

const NEON_RED = 0xff0844;
const NEON_CYAN = 0x00e5ff;
const HELIX_RADIUS = 0.85;
const HELIX_HEIGHT = 2.2;
const SEGMENTS = 64;
const RUNG_COUNT = 22;
const RUNG_RADIUS = 0.022;

const _yUp = new THREE.Vector3(0, 1, 0);
const _tempDir = new THREE.Vector3();

function cylinderBetween(A: THREE.Vector3, B: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const length = A.distanceTo(B);
  const geo = new THREE.CylinderGeometry(radius, radius, length, 10);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  _tempDir.copy(B).sub(A).normalize();
  mesh.quaternion.setFromUnitVectors(_yUp, _tempDir);
  return mesh;
}

/** One full DNA double-helix (red + cyan spiral strands + rungs). Built around local origin, axis along Y. */
function buildDNAHelix(): THREE.Group {
  const group = new THREE.Group();
  const points1: THREE.Vector3[] = [];
  const points2: THREE.Vector3[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * 2 * Math.PI * 2.5;
    const y = (i / SEGMENTS) * 2 * HELIX_HEIGHT - HELIX_HEIGHT;
    points1.push(new THREE.Vector3(HELIX_RADIUS * Math.cos(t), y, HELIX_RADIUS * Math.sin(t)));
    points2.push(new THREE.Vector3(HELIX_RADIUS * Math.cos(t + Math.PI), y, HELIX_RADIUS * Math.sin(t + Math.PI)));
  }
  const curve1 = new THREE.CatmullRomCurve3(points1);
  const curve2 = new THREE.CatmullRomCurve3(points2);
  const tube1 = new THREE.TubeGeometry(curve1, SEGMENTS * 2, 0.032, 10, false);
  const tube2 = new THREE.TubeGeometry(curve2, SEGMENTS * 2, 0.032, 10, false);
  const mat1 = new THREE.MeshPhongMaterial({
    color: NEON_RED,
    emissive: NEON_RED,
    emissiveIntensity: 0.55,
    shininess: 80,
    specular: new THREE.Color(0xff4466),
  });
  const mat2 = new THREE.MeshPhongMaterial({
    color: NEON_CYAN,
    emissive: NEON_CYAN,
    emissiveIntensity: 0.5,
    shininess: 80,
    specular: new THREE.Color(0x88ddff),
  });
  group.add(new THREE.Mesh(tube1, mat1));
  group.add(new THREE.Mesh(tube2, mat2));
  const redRungMat = new THREE.MeshPhongMaterial({
    color: NEON_RED,
    emissive: NEON_RED,
    emissiveIntensity: 0.5,
    shininess: 60,
    specular: new THREE.Color(0xff4466),
  });
  const cyanRungMat = new THREE.MeshPhongMaterial({
    color: NEON_CYAN,
    emissive: NEON_CYAN,
    emissiveIntensity: 0.45,
    shininess: 60,
    specular: new THREE.Color(0x88ddff),
  });
  for (let i = 0; i <= RUNG_COUNT; i++) {
    const segIdx = Math.round((i / RUNG_COUNT) * SEGMENTS);
    const p1 = points1[segIdx].clone();
    const p2 = points2[segIdx].clone();
    const mid = new THREE.Vector3().copy(p1).add(p2).multiplyScalar(0.5);
    group.add(cylinderBetween(p1, mid, RUNG_RADIUS, redRungMat));
    group.add(cylinderBetween(mid, p2, RUNG_RADIUS, cyanRungMat));
  }
  return group;
}

function createParticles(): THREE.Points {
  const count = 400;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 12;
    positions[i + 1] = (Math.random() - 0.5) * 12;
    positions[i + 2] = (Math.random() - 0.5) * 8;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: NEON_RED,
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.08);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x111122, 0.6);
    scene.add(ambient);
    const point1 = new THREE.PointLight(NEON_RED, 1.2, 20);
    point1.position.set(3, 2, 4);
    scene.add(point1);
    const point2 = new THREE.PointLight(NEON_CYAN, 0.8, 20);
    point2.position.set(-3, -1, 3);
    scene.add(point2);

    // Two DNA double-helices: one near top-left, one near bottom-right; each rotates around its own axis
    const dnaTopLeft = buildDNAHelix();
    dnaTopLeft.position.set(-2.4, 1.5, 0.2);
    dnaTopLeft.rotation.x = 0.25;
    dnaTopLeft.rotation.z = -0.15;
    scene.add(dnaTopLeft);

    const dnaBottomRight = buildDNAHelix();
    dnaBottomRight.position.set(2.3, -1.5, -0.1);
    dnaBottomRight.rotation.x = -0.2;
    dnaBottomRight.rotation.z = 0.12;
    scene.add(dnaBottomRight);

    const particles = createParticles();
    scene.add(particles);

    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      dnaTopLeft.rotation.y = time * 0.4;
      dnaBottomRight.rotation.y = time * 0.35;
      particles.rotation.y = time * 0.05;
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.geometry) obj.geometry.dispose();
        if (obj instanceof THREE.Mesh && obj.material) {
          const m = obj.material as THREE.Material;
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
          else m.dispose();
        }
        if (obj instanceof THREE.Points) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) (obj.material as THREE.Material).dispose();
        }
      });
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-8rem)] rounded-xl overflow-hidden bg-[#050508]">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/90 pointer-events-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          className="text-center px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-[0_0_24px_rgba(255,8,68,0.5)]">
            {t('app.title')}
          </h1>
          <p className="mt-3 text-lg text-zinc-400 max-w-md mx-auto">
            {t('home.tagline')}
          </p>
        </motion.div>
        <motion.div
          className="mt-10 pointer-events-auto flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white bg-neon-red/90 hover:bg-neon-red border border-neon-red/50 shadow-neon-red focus-ring-neon transition-all hover:shadow-[0_0_28px_rgba(255,8,68,0.4)]"
          >
            <span>{t('home.enterStudio')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <div className="w-full max-w-3xl mt-10 pt-8 border-t border-white/10" />
          <div className="mt-5 px-2 pointer-events-auto w-full max-w-3xl">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              {t('home.quickStart.title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <FlowIcon className="w-5 h-5 shrink-0 text-neon-red/90" />
                  <span className="text-sm font-semibold text-white">{t('home.quickStart.flow.title')}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">{t('home.quickStart.flow.description')}</p>
                <div className="text-[11px] font-mono text-zinc-500 bg-black/30 rounded-lg px-2.5 py-2 border border-white/5">
                  {t('home.quickStart.flow.steps')}
                </div>
              </div>
              <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <ExampleIcon className="w-5 h-5 shrink-0 text-neon-red/90" />
                  <span className="text-sm font-semibold text-white">{t('home.quickStart.example.title')}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">{t('home.quickStart.example.description')}</p>
                <div className="text-[11px] font-mono text-neon-red/80 bg-black/30 rounded-lg px-2.5 py-2 border border-neon-red/20">
                  “{t('home.quickStart.example.quote')}”
                </div>
              </div>
              <a
                href="https://github.com/OpenEvolant/openEvolant#-documentation"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-left rounded-xl p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-neon-red/30 transition-all focus-ring-neon group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <DocsIcon className="w-5 h-5 shrink-0 text-neon-red/90" />
                  <span className="text-sm font-semibold text-white">{t('home.quickStart.docs.title')}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">{t('home.quickStart.docs.description')}</p>
                <div className="text-[11px] font-mono text-zinc-500 bg-black/30 rounded-lg px-2.5 py-2 border border-white/5 group-hover:text-neon-red/80 group-hover:border-neon-red/20">
                  {t('home.quickStart.docs.linkText')}
                </div>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FlowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6M4 12h4" />
    </svg>
  );
}
function ExampleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
function DocsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
