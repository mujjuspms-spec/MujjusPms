import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';

const INTERIOR_PARTS = [
  { key: 'cockpit', label: 'Crew cockpit', position: [0, 1.05, 0] },
  { key: 'tank', label: 'Fuel tank', position: [0, 0.1, 0] },
  { key: 'avionics', label: 'Avionics bay', position: [0, -0.42, 0] },
  { key: 'engine', label: 'Engine core', position: [0, -1.08, 0] },
];

const BUILD_MIN = -1.85;
const BUILD_MAX = 2.15;
const GROUND_Y = -0.66;
const SKIN_TONES = ['#e8b98a', '#c98f5e', '#8d5a3c', '#f0cba0'];

// three.js materials need a resolved color, not a CSS custom-property reference.
function resolveCssColor(value) {
  const m = /^var\((--[\w-]+)\)$/.exec(value || '');
  if (!m) return value;
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
  return resolved || '#8a8f98';
}

function Ship({ progress, theme, interior, setInterior, selected, onSelect }) {
  // The ship builds nose-to-tail along world X (it now lies horizontal), and the
  // cutaway (interior view) slices the top half away along world Y.
  const buildPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), BUILD_MIN), []);
  const cutawayPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const targetX = useRef(BUILD_MIN);
  const currentX = useRef(BUILD_MIN);

  useEffect(() => {
    targetX.current = BUILD_MIN + (Math.max(0, Math.min(100, progress)) / 100) * (BUILD_MAX - BUILD_MIN);
  }, [progress]);

  useFrame((_, delta) => {
    currentX.current += (targetX.current - currentX.current) * Math.min(1, delta * 4);
    buildPlane.constant = currentX.current;
  });

  const hullClip = interior ? [buildPlane, cutawayPlane] : [buildPlane];
  const partClip = [buildPlane];
  const ready = progress >= 100;

  return (
    <group
      rotation={[0, 0, -Math.PI / 2]}
      onClick={(e) => { e.stopPropagation(); setInterior((v) => !v); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* nose cone */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <coneGeometry args={[0.46, 0.9, 32]} />
        <meshStandardMaterial color={theme.primary} metalness={0.35} roughness={0.45} clippingPlanes={hullClip} />
      </mesh>

      {/* upper hull */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.5, 0.85, 32]} />
        <meshStandardMaterial color={theme.primary} metalness={0.35} roughness={0.45} clippingPlanes={hullClip} />
      </mesh>

      {/* cockpit glass */}
      <mesh position={[0, 0.95, 0.4]} rotation={[0.3, 0, 0]} castShadow>
        <sphereGeometry args={[0.22, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        <meshPhysicalMaterial color={theme.glass} transmission={0.85} roughness={0.05} thickness={0.4} ior={1.4} clearcoat={1} clippingPlanes={hullClip} />
      </mesh>

      {/* lower hull */}
      <mesh position={[0, -0.35, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.58, 1.3, 32]} />
        <meshStandardMaterial color={theme.dark} metalness={0.3} roughness={0.5} clippingPlanes={hullClip} />
      </mesh>

      {/* panel rings */}
      {[0.35, -0.15, -0.65].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.51 - i * 0.01, 0.012, 8, 40]} />
          <meshStandardMaterial color={theme.accent} metalness={0.4} roughness={0.45} clippingPlanes={hullClip} />
        </mesh>
      ))}

      {/* engine skirt */}
      <mesh position={[0, -1.15, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.44, 0.5, 32]} />
        <meshStandardMaterial color={theme.primary} metalness={0.35} roughness={0.45} clippingPlanes={hullClip} />
      </mesh>

      {/* fins */}
      {[0, 120, 240].map((deg) => (
        <group key={deg} rotation={[0, (deg * Math.PI) / 180, 0]}>
          <mesh position={[0, -1.0, 0.5]} rotation={[0.15, 0, Math.PI]} castShadow>
            <coneGeometry args={[0.34, 0.6, 3]} />
            <meshStandardMaterial color={theme.accent} metalness={0.3} roughness={0.5} clippingPlanes={hullClip} />
          </mesh>
        </group>
      ))}

      {/* engine nozzles */}
      {[[-0.22, 0], [0.22, 0], [0, 0.22], [0, -0.22]].map(([x, z]) => (
        <group key={`${x}-${z}`}>
          <mesh position={[x * 0.9, -1.42, z * 0.9]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.22, 16]} />
            <meshStandardMaterial color={theme.dark} metalness={0.3} roughness={0.5} clippingPlanes={hullClip} />
          </mesh>
          <mesh position={[x * 0.9, -1.56, z * 0.9]}>
            <coneGeometry args={[0.1, 0.22, 16]} />
            <meshStandardMaterial color={theme.accent2} emissive={theme.accent2} emissiveIntensity={ready ? 1.2 : 0.15} metalness={0.2} roughness={0.3} clippingPlanes={hullClip} />
          </mesh>
          {ready && <pointLight position={[x * 0.9, -1.6, z * 0.9]} color={theme.accent2} intensity={2} distance={1.4} />}
        </group>
      ))}

      {/* interior — revealed once you click the ship to cut the hull away; click a
          specific part to see just its name */}
      {INTERIOR_PARTS.map((p) => (
        <group key={p.key} position={p.position}>
          <mesh
            clippingPlanes={partClip} castShadow
            onClick={(e) => { if (!interior) return; e.stopPropagation(); onSelect('part', p.key); }}
            onPointerOver={(e) => { if (interior) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            {p.key === 'cockpit' && <boxGeometry args={[0.26, 0.2, 0.26]} />}
            {p.key === 'tank' && <capsuleGeometry args={[0.24, 0.32, 8, 16]} />}
            {p.key === 'avionics' && <boxGeometry args={[0.34, 0.22, 0.34]} />}
            {p.key === 'engine' && <sphereGeometry args={[0.22, 20, 20]} />}
            <meshStandardMaterial
              color={p.key === 'engine' ? theme.accent2 : p.key === 'tank' ? '#c9d2dc' : '#8f97a3'}
              emissive={selected?.type === 'part' && selected.id === p.key ? theme.accent : (p.key === 'engine' ? theme.accent2 : '#000000')}
              emissiveIntensity={selected?.type === 'part' && selected.id === p.key ? 0.5 : (p.key === 'engine' ? 0.7 : 0)}
              metalness={0.4} roughness={0.4}
            />
          </mesh>
          {interior && selected?.type === 'part' && selected.id === p.key && (
            <Html distanceFactor={9} position={[0.42, 0, 0]} occlude={false} style={{ pointerEvents: 'none' }}>
              <div className="veh-interior-label">{p.label}</div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

function CrewWorker({ person, x, z, tool, seed, selected, onSelect }) {
  const armRef = useRef(null);
  const torchLightRef = useRef(null);
  const skin = SKIN_TONES[seed % SKIN_TONES.length];
  const suitColor = useMemo(() => resolveCssColor(person.color), [person.color]);
  const isSelected = selected?.type === 'crew' && selected.id === person.id;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 3.4 + seed * 10;
    if (armRef.current) {
      armRef.current.rotation.x = tool === 'hammer'
        ? -0.3 + Math.abs(Math.sin(t)) * 1.5
        : -0.6 + Math.sin(t * 2.2) * 0.15;
    }
    if (torchLightRef.current) {
      torchLightRef.current.intensity = tool === 'weld' ? 0.6 + Math.random() * 1.4 : 0;
    }
  });

  // Face the worker toward the ship's centerline.
  const faceAngle = Math.atan2(-x, -z);

  return (
    <group
      position={[x, GROUND_Y, z]} rotation={[0, faceAngle, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect('crew', person.id); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* legs */}
      <mesh position={[-0.05, 0.14, 0]}><boxGeometry args={[0.06, 0.28, 0.07]} /><meshStandardMaterial color="#2b2f36" roughness={0.7} /></mesh>
      <mesh position={[0.05, 0.14, 0]}><boxGeometry args={[0.06, 0.28, 0.07]} /><meshStandardMaterial color="#2b2f36" roughness={0.7} /></mesh>
      {/* torso */}
      <mesh position={[0, 0.36, 0]} castShadow><boxGeometry args={[0.17, 0.24, 0.11]} /><meshStandardMaterial color={suitColor} roughness={0.6} emissive={isSelected ? suitColor : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} /></mesh>
      {/* head */}
      <mesh position={[0, 0.55, 0]} castShadow><sphereGeometry args={[0.075, 16, 16]} /><meshStandardMaterial color={skin} roughness={0.7} /></mesh>
      {/* static arm */}
      <mesh position={[-0.11, 0.4, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.05, 0.2, 0.05]} /><meshStandardMaterial color={suitColor} roughness={0.6} /></mesh>
      {/* animated working arm + tool */}
      <group ref={armRef} position={[0.11, 0.46, 0]}>
        <mesh position={[0, -0.1, 0]}><boxGeometry args={[0.05, 0.2, 0.05]} /><meshStandardMaterial color={suitColor} roughness={0.6} /></mesh>
        {tool === 'hammer' ? (
          <group position={[0, -0.21, 0]} rotation={[0, 0, -0.5]}>
            <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.014, 0.014, 0.16, 8]} /><meshStandardMaterial color="#6b4a2c" roughness={0.8} /></mesh>
            <mesh position={[0, -0.17, 0]}><boxGeometry args={[0.09, 0.05, 0.05]} /><meshStandardMaterial color="#4a4d52" metalness={0.6} roughness={0.35} /></mesh>
          </group>
        ) : (
          <group position={[0, -0.22, 0]}>
            <mesh><cylinderGeometry args={[0.012, 0.02, 0.14, 8]} /><meshStandardMaterial color="#3a3d42" metalness={0.5} roughness={0.4} /></mesh>
            <mesh position={[0, -0.09, 0]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#bfe4ff" emissive="#8fd6ff" emissiveIntensity={2} />
            </mesh>
            <pointLight ref={torchLightRef} position={[0, -0.09, 0]} color="#9fe0ff" distance={0.6} />
          </group>
        )}
      </group>
      {/* hard hat */}
      <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={suitColor} metalness={0.1} roughness={0.5} /></mesh>

      {isSelected && (
        <Html distanceFactor={9} position={[0, 0.78, 0]} occlude={false} style={{ pointerEvents: 'none' }}>
          <div className="veh-interior-label">{person.initials} · {person.name.split(' ')[0]}</div>
        </Html>
      )}
    </group>
  );
}

function CrewFigures({ crew, selected, onSelect }) {
  if (!crew || crew.length === 0) return null;
  const span = BUILD_MAX - BUILD_MIN - 0.6;
  return (
    <>
      {crew.map((p, i) => {
        const t = crew.length > 1 ? i / (crew.length - 1) : 0.5;
        const x = BUILD_MIN + 0.4 + t * span;
        const z = i % 2 === 0 ? 0.95 : -0.95;
        const tool = i % 2 === 0 ? 'hammer' : 'weld';
        return <CrewWorker key={p.id} person={p} x={x} z={z} tool={tool} seed={i} selected={selected} onSelect={onSelect} />;
      })}
    </>
  );
}

export default function Spaceship3D({ progress, theme, interior, setInterior, crew }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => { setSelected(null); }, [interior]);

  function onSelect(type, id) {
    setSelected((cur) => (cur && cur.type === type && cur.id === id ? null : { type, id }));
  }

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [3.0, 1.75, 5.2], fov: 38 }}
      gl={{ localClippingEnabled: true, antialias: true, alpha: true }}
      onPointerMissed={() => setSelected(null)}
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#ffffff', '#55524a', 0.65]} />
      <directionalLight position={[3, 4, 2]} intensity={1.35} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 1, -2]} color="#4d7cff" intensity={0.5} />
      <Ship progress={progress} theme={theme} interior={interior} setInterior={setInterior} selected={selected} onSelect={onSelect} />
      <CrewFigures crew={crew} selected={selected} onSelect={onSelect} />
      <ContactShadows position={[0, GROUND_Y, 0]} opacity={0.45} scale={6} blur={2.4} far={2} />
      <OrbitControls
        enablePan={false}
        minDistance={3.4}
        maxDistance={10}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate={!interior}
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
