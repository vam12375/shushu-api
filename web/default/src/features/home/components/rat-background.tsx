import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type StampedePiece = {
  band: number
  baseProgress: number
  lane: number
  phase: number
  scale: number
  side: -1 | 1
  speed: number
  spin: THREE.Vector3
}

type Trail = {
  band: number
  baseProgress: number
  lane: number
  phase: number
  side: -1 | 1
  speed: number
}

const CHEESE_YELLOW = 0xffd23f
const CHEESE_LIGHT = 0xffec8a
const CHEESE_ORANGE = 0xff9f1c
const RAT_BROWN = 0x4a3521
const RAT_TEAL = 0x2ec4b6
const CREAM = 0xfff8df

const backdropVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const backdropFragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uPointer;

  float ring(vec2 p, float radius, float width) {
    return smoothstep(width, 0.0, abs(length(p) - radius));
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(2.45, 2.0);
    p.x += uPointer.x * 0.08;
    p.y -= uPointer.y * 0.04;

    float center = smoothstep(0.92, 0.08, length(p * vec2(1.05, 1.35)));
    float amber = smoothstep(1.22, 0.1, length(p - vec2(0.58, 0.12)));
    float teal = smoothstep(1.05, 0.08, length(p + vec2(0.75, -0.36)));
    float pulse = ring(p + vec2(0.04, -0.04), 0.64 + sin(uTime * 0.22) * 0.035, 0.06);
    float trackGlow = smoothstep(0.24, 0.0, abs(abs(p.x) - (0.42 + p.y * 0.18)));
    trackGlow *= smoothstep(1.0, -0.18, p.y);

    vec3 color = vec3(1.0, 0.96, 0.78);
    color = mix(color, vec3(1.0, 0.66, 0.08), amber * 0.56);
    color = mix(color, vec3(0.18, 0.72, 0.66), teal * 0.16);
    color += vec3(1.0, 0.76, 0.18) * pulse * 0.22;
    color += vec3(1.0, 0.50, 0.08) * trackGlow * 0.08;

    float alpha = clamp(center * 0.2 + amber * 0.16 + teal * 0.06 + pulse * 0.06 + trackGlow * 0.08, 0.0, 0.34);
    gl_FragColor = vec4(color, alpha);
  }
`

function seededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function randomBetween(random: () => number, min: number, max: number) {
  return min + random() * (max - min)
}

function track<T>(items: T[], item: T) {
  items.push(item)
  return item
}

function createCheeseShardGeometry() {
  const geometry = new THREE.BufferGeometry()
  const vertices = new Float32Array([
    -0.72, -0.34, -0.12, 0.62, -0.34, -0.12, -0.2, 0.52, -0.12, -0.72, -0.34,
    0.12, 0.62, -0.34, 0.12, -0.2, 0.52, 0.12,
  ])

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.setIndex([
    0, 1, 2, 5, 4, 3, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0,
  ])
  geometry.computeVertexNormals()

  return geometry
}

function getTrackPosition(
  progress: number,
  piece: Pick<StampedePiece, 'band' | 'lane' | 'phase' | 'side'>,
  isCompact: boolean,
  target = new THREE.Vector3()
) {
  const curved = progress * progress
  const z = THREE.MathUtils.lerp(-18, 7.4, curved)
  const maxSpread = isCompact ? 4.4 : 9.2
  const spread = THREE.MathUtils.lerp(
    isCompact ? 1.1 : 1.85,
    maxSpread,
    Math.pow(progress, 1.42)
  )
  const laneOffset = piece.lane * (isCompact ? 0.42 : 0.78)
  const wave =
    Math.sin(progress * 8.6 + piece.phase) * (isCompact ? 0.16 : 0.32)

  const trackY = (() => {
    if (piece.band === 0) return THREE.MathUtils.lerp(0.18, -1.22, progress)
    if (piece.band === 1) return THREE.MathUtils.lerp(-3.12, -1.78, progress)
    return THREE.MathUtils.lerp(-1.1, -1.46, progress)
  })()

  target.set(
    piece.side * (spread + laneOffset + wave),
    trackY + Math.cos(progress * 7.4 + piece.phase) * 0.22,
    z
  )

  return target
}

function createBackdrop(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
) {
  const material = track(
    materials,
    new THREE.ShaderMaterial({
      blending: THREE.NormalBlending,
      depthWrite: false,
      fragmentShader: backdropFragmentShader,
      transparent: true,
      uniforms: {
        uPointer: { value: new THREE.Vector2() },
        uTime: { value: 0 },
      },
      vertexShader: backdropVertexShader,
    })
  )

  const mesh = new THREE.Mesh(
    track(geometries, new THREE.PlaneGeometry(26, 15, 1, 1)),
    material
  )
  mesh.position.set(0, 0.1, -19)

  return { material, mesh }
}

function createCheesePlanet(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  isCompact: boolean
) {
  const group = new THREE.Group()
  const radius = isCompact ? 1.32 : 2.12
  const depth = isCompact ? 0.2 : 0.28
  const wedgeGeometry = track(
    geometries,
    new THREE.CylinderGeometry(
      radius,
      radius,
      depth,
      72,
      1,
      false,
      -0.28,
      Math.PI * 1.42
    )
  )

  const planetMaterial = track(
    materials,
    new THREE.MeshStandardMaterial({
      color: CHEESE_YELLOW,
      depthWrite: false,
      emissive: CHEESE_ORANGE,
      emissiveIntensity: 0.18,
      opacity: 0.42,
      roughness: 0.82,
      transparent: true,
    })
  )

  const edgeMaterial = track(
    materials,
    new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: CHEESE_LIGHT,
      depthWrite: false,
      opacity: 0.28,
      transparent: true,
    })
  )

  const holeMaterial = track(
    materials,
    new THREE.MeshBasicMaterial({
      color: RAT_BROWN,
      depthWrite: false,
      opacity: 0.09,
      transparent: true,
    })
  )

  const planet = new THREE.Mesh(wedgeGeometry, planetMaterial)
  planet.rotation.x = Math.PI / 2
  group.add(planet)

  const edges = new THREE.LineSegments(
    track(geometries, new THREE.EdgesGeometry(wedgeGeometry, 28)),
    edgeMaterial
  )
  edges.rotation.x = Math.PI / 2
  group.add(edges)

  const holeGeometry = track(geometries, new THREE.CircleGeometry(1, 32))
  const holes = [
    [-0.46, 0.34, 0.2],
    [0.24, 0.46, 0.16],
    [0.54, -0.08, 0.22],
    [-0.16, -0.28, 0.13],
    [-0.62, -0.2, 0.11],
  ]

  holes.forEach(([x, y, scale], index) => {
    const hole = new THREE.Mesh(holeGeometry, holeMaterial)
    hole.position.set(
      x * radius * (index === 0 ? 0.82 : 1),
      y * radius,
      depth / 2 + 0.018
    )
    hole.scale.setScalar(radius * scale * 0.86)
    group.add(hole)
  })

  group.position.set(isCompact ? 2.85 : 6.95, isCompact ? -0.4 : -1.0, -8.8)
  group.rotation.set(
    isCompact ? -0.08 : -0.1,
    isCompact ? -0.18 : -0.34,
    isCompact ? -0.36 : -0.42
  )

  return group
}

function createTrackRibbons(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  isCompact: boolean
) {
  const group = new THREE.Group()
  const random = seededRandom(109)
  const trackWidth = isCompact ? 3.3 : 7.3
  const ribbonData = [
    { color: CHEESE_ORANGE, opacity: 0.28, side: -1 as const, y: -1.25 },
    { color: CHEESE_YELLOW, opacity: 0.28, side: 1 as const, y: -1.25 },
    { color: RAT_BROWN, opacity: 0.11, side: -1 as const, y: 0.94 },
    { color: RAT_TEAL, opacity: 0.13, side: 1 as const, y: 0.78 },
  ]

  ribbonData.forEach((ribbon, index) => {
    const points = [
      new THREE.Vector3(ribbon.side * 0.28, ribbon.y + 0.8, -17.2),
      new THREE.Vector3(
        ribbon.side * randomBetween(random, 1.15, 1.8),
        ribbon.y + randomBetween(random, 0.2, 0.8),
        -11.5
      ),
      new THREE.Vector3(
        ribbon.side * randomBetween(random, 2.8, 4.2),
        ribbon.y,
        -4.5
      ),
      new THREE.Vector3(ribbon.side * trackWidth, ribbon.y - 0.42, 5.8),
    ]
    const curve = new THREE.CatmullRomCurve3(points)
    const geometry = track(
      geometries,
      new THREE.TubeGeometry(curve, 180, index < 2 ? 0.026 : 0.016, 8, false)
    )
    const material = track(
      materials,
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: ribbon.color,
        depthWrite: false,
        opacity: ribbon.opacity,
        transparent: true,
      })
    )
    group.add(new THREE.Mesh(geometry, material))
  })

  return group
}

function createStampedePieces(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  isCompact: boolean
) {
  const random = seededRandom(404)
  const count = isCompact ? 24 : 46
  const pieces: StampedePiece[] = []
  const dummy = new THREE.Object3D()
  const position = new THREE.Vector3()
  const color = new THREE.Color()

  const geometry = track(geometries, createCheeseShardGeometry())
  const material = track(
    materials,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthWrite: false,
      opacity: isCompact ? 0.2 : 0.26,
      side: THREE.DoubleSide,
      transparent: true,
      vertexColors: true,
    })
  )
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false

  for (let index = 0; index < count; index += 1) {
    pieces.push({
      band: index % 5 === 0 ? 2 : index % 2,
      baseProgress: random(),
      lane: randomBetween(random, -0.5, 1.15),
      phase: randomBetween(random, 0, Math.PI * 2),
      scale: randomBetween(random, 0.24, 0.64),
      side: random() > 0.5 ? 1 : -1,
      speed: randomBetween(random, 0.035, 0.11),
      spin: new THREE.Vector3(
        randomBetween(random, -0.85, 0.85),
        randomBetween(random, -1.1, 1.1),
        randomBetween(random, -1.2, 1.2)
      ),
    })

    color
      .set(
        index % 9 === 0
          ? CHEESE_LIGHT
          : index % 4 === 0
            ? CHEESE_ORANGE
            : CHEESE_YELLOW
      )
      .lerp(new THREE.Color(CREAM), randomBetween(random, 0.18, 0.42))
    mesh.setColorAt(index, color)
  }

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

  const update = (elapsed: number) => {
    pieces.forEach((piece, index) => {
      const progress = (piece.baseProgress + elapsed * piece.speed) % 1
      getTrackPosition(progress, piece, isCompact, position)

      const scale =
        piece.scale * THREE.MathUtils.lerp(0.22, 1.35, Math.pow(progress, 1.7))
      dummy.position.copy(position)
      dummy.rotation.set(
        piece.spin.x * elapsed + piece.phase,
        piece.spin.y * elapsed * 0.8 + progress * 1.2,
        piece.spin.z * elapsed + progress * Math.PI
      )
      dummy.scale.set(scale, scale * 0.92, scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  update(0)
  return { mesh, update }
}

function createCrumbField(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  isCompact: boolean
) {
  const random = seededRandom(867)
  const count = isCompact ? 34 : 58
  const crumbs: StampedePiece[] = []
  const dummy = new THREE.Object3D()
  const position = new THREE.Vector3()
  const color = new THREE.Color()

  const mesh = new THREE.InstancedMesh(
    track(geometries, new THREE.IcosahedronGeometry(1, 1)),
    track(
      materials,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        depthWrite: false,
        opacity: 0.13,
        transparent: true,
        vertexColors: true,
      })
    ),
    count
  )
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false

  for (let index = 0; index < count; index += 1) {
    crumbs.push({
      band: index % 3,
      baseProgress: random(),
      lane: randomBetween(random, -0.8, 1.6),
      phase: randomBetween(random, 0, Math.PI * 2),
      scale: randomBetween(random, 0.01, 0.028),
      side: random() > 0.5 ? 1 : -1,
      speed: randomBetween(random, 0.06, 0.18),
      spin: new THREE.Vector3(),
    })

    color
      .set(
        index % 12 === 0
          ? RAT_TEAL
          : index % 4 === 0
            ? CHEESE_LIGHT
            : CHEESE_ORANGE
      )
      .lerp(new THREE.Color(CREAM), 0.28)
    mesh.setColorAt(index, color)
  }

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

  const update = (elapsed: number) => {
    crumbs.forEach((crumb, index) => {
      const progress = (crumb.baseProgress + elapsed * crumb.speed) % 1
      getTrackPosition(progress, crumb, isCompact, position)
      position.y += Math.sin(elapsed * 0.8 + crumb.phase) * 0.28
      position.z -= 0.35

      const scale =
        crumb.scale * THREE.MathUtils.lerp(0.55, 4.0, Math.pow(progress, 1.7))
      dummy.position.copy(position)
      dummy.rotation.set(elapsed + crumb.phase, elapsed * 0.6, crumb.phase)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  update(0)
  return { mesh, update }
}

function createSpeedTrails(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  isCompact: boolean
) {
  const random = seededRandom(901)
  const count = isCompact ? 24 : 42
  const trails: Trail[] = []
  const positions = new Float32Array(count * 2 * 3)
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()

  for (let index = 0; index < count; index += 1) {
    trails.push({
      band: index % 3,
      baseProgress: random(),
      lane: randomBetween(random, -0.5, 1.35),
      phase: randomBetween(random, 0, Math.PI * 2),
      side: random() > 0.5 ? 1 : -1,
      speed: randomBetween(random, 0.08, 0.17),
    })
  }

  const geometry = track(geometries, new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = track(
    materials,
    new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: CHEESE_ORANGE,
      depthWrite: false,
      opacity: 0.14,
      transparent: true,
    })
  )
  const lines = new THREE.LineSegments(geometry, material)
  lines.frustumCulled = false

  const update = (elapsed: number) => {
    trails.forEach((trail, index) => {
      const progress = (trail.baseProgress + elapsed * trail.speed) % 1
      getTrackPosition(progress, trail, isCompact, start)
      getTrackPosition(Math.max(progress - 0.045, 0), trail, isCompact, end)
      end.z -= 1.15

      positions.set(start.toArray(), index * 6)
      positions.set(end.toArray(), index * 6 + 3)
    })
    geometry.attributes.position.needsUpdate = true
  }

  update(0)
  return { lines, update }
}

export function RatBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      80
    )
    camera.position.set(0, 2.95, 10.8)
    camera.lookAt(0, -0.48, -8)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearAlpha(0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.domElement.className = 'h-full w-full'
    container.appendChild(renderer.domElement)

    const root = new THREE.Group()
    const world = new THREE.Group()
    scene.add(root)
    root.add(world)

    const isCompact = window.innerWidth < 768
    world.position.y = isCompact ? -1.02 : -0.82

    const ambient = new THREE.AmbientLight(0xfff4cc, 1.8)
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(-3.5, 5.2, 4.4)
    const fill = new THREE.PointLight(CHEESE_ORANGE, 9, 24)
    fill.position.set(3.8, 1.6, -5)
    scene.add(ambient, key, fill)

    const backdrop = createBackdrop(geometries, materials)
    root.add(backdrop.mesh)

    const planet = createCheesePlanet(geometries, materials, isCompact)
    const ribbons = createTrackRibbons(geometries, materials, isCompact)
    const speedTrails = createSpeedTrails(geometries, materials, isCompact)
    const stampedePieces = createStampedePieces(
      geometries,
      materials,
      isCompact
    )
    const crumbs = createCrumbField(geometries, materials, isCompact)
    world.add(
      planet,
      ribbons,
      speedTrails.lines,
      stampedePieces.mesh,
      crumbs.mesh
    )

    const pointer = new THREE.Vector2()
    const targetPointer = new THREE.Vector2()

    const handlePointerMove = (event: PointerEvent) => {
      targetPointer.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2
      )
    }

    const handleResize = () => {
      const compact = window.innerWidth < 768
      camera.aspect = window.innerWidth / window.innerHeight
      camera.position.set(0, compact ? 2.42 : 2.95, compact ? 12.2 : 10.8)
      camera.lookAt(0, compact ? -0.54 : -0.48, -8)
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.render(scene, camera)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('resize', handleResize)

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const clock = new THREE.Clock()
    let animationFrameId: number | undefined

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime()
      pointer.lerp(targetPointer, 0.055)

      backdrop.material.uniforms.uTime.value = elapsed
      backdrop.material.uniforms.uPointer.value.copy(pointer)
      root.rotation.x = pointer.y * 0.028
      root.rotation.y = pointer.x * 0.044
      world.position.x = pointer.x * 0.18
      world.position.y = (isCompact ? -1.02 : -0.82) - pointer.y * 0.06
      planet.rotation.z = -0.18 + elapsed * 0.045 + pointer.x * 0.05
      ribbons.rotation.z = Math.sin(elapsed * 0.24) * 0.012

      speedTrails.update(elapsed)
      stampedePieces.update(elapsed)
      crumbs.update(elapsed)

      renderer.render(scene, camera)
      animationFrameId = window.requestAnimationFrame(renderFrame)
    }

    handleResize()
    if (reduceMotion) {
      speedTrails.update(0)
      stampedePieces.update(0)
      crumbs.update(0)
      renderer.render(scene, camera)
    } else {
      renderFrame()
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('resize', handleResize)
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId)
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden='true'
      className='pointer-events-none fixed inset-0 z-0 opacity-95'
    />
  )
}
