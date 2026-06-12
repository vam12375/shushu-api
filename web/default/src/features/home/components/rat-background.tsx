import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/*
  首页 3D 主场景:奶酪星球 🧀
  ------------------------------------------------------------
  从"氛围背景"升级为"视觉主角":
  1. 奶酪星球:被啃掉一角的厚奶酪轮 + 立体孔洞 + 卡通描边 + 双层光环
  2. 鼠群轨道:🐭 sprite 沿光环反向狂奔(颠跑抖动)
  3. 拖拽交互:hero 区域内按住拖动旋转星球,松手带惯性衰减
  4. 滚动驱动相机:下滚时星球滑向左后方让位给看板区,收尾时碎片前涌
  5. 空间氛围:奶酪粒子网(圆球节点+邻近连线) + 奶酪屑点云 + 漂浮 🧀,指针视差联动
*/

const CHEESE_YELLOW = 0xffd23f
const CHEESE_LIGHT = 0xffec8a
const CHEESE_ORANGE = 0xff9f1c
const CHEESE_DEEP = 0xe8a90c
const RAT_TEAL = 0x2ec4b6
const CREAM = 0xfff8df

// Edge 浏览器检测：通过 UA 识别 Edg/ 标识（Edge 79+ 使用 Chromium 内核）
function isEdgeBrowser() {
  return /Edg\//.test(navigator.userAgent)
}

// 确定性随机:每次刷新画面布局一致,避免闪变
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

// 泛型 U extends T:返回值保留子类型,避免被收窄成基类
function track<T, U extends T>(items: T[], item: U): U {
  items.push(item)
  return item
}

// emoji 转 Sprite 贴图(🐭/🧀 都用它,零外部资源请求)
function emojiTexture(textures: THREE.Texture[], emoji: string, size = 160) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = `${size * 0.8}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.04)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return track(textures, texture)
}

type OrbitRat = {
  sprite: THREE.Sprite
  radius: number
  phase: number
  speed: number
  bob: number
}

type NetNode = {
  x: number
  y: number
  z: number
  scale: number
  phase: number
}

type FloatingCheese = {
  sprite: THREE.Sprite
  baseY: number
  phase: number
}

// 创建奶酪星球(主体 + 孔洞 + 描边 + 双光环),返回光环引用供帧循环驱动
function createCheesePlanet(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
) {
  const planet = new THREE.Group()

  // 奶酪轮主体:厚圆柱缺一角(被鼠鼠啃掉的形状)
  const wedgeGeometry = track(
    geometries,
    new THREE.CylinderGeometry(2.5, 2.5, 1.25, 96, 1, false, -0.3, Math.PI * 1.62)
  )
  const wedgeMaterial = track(
    materials,
    new THREE.MeshStandardMaterial({
      color: CHEESE_YELLOW,
      emissive: CHEESE_ORANGE,
      emissiveIntensity: 0.12,
      metalness: 0.02,
      roughness: 0.58,
    })
  )
  planet.add(new THREE.Mesh(wedgeGeometry, wedgeMaterial))

  // 奶酪孔:深色小球半嵌入表面,营造立体孔洞
  const holeMaterial = track(
    materials,
    new THREE.MeshStandardMaterial({ color: CHEESE_DEEP, roughness: 0.85 })
  )
  const holeGeometry = track(geometries, new THREE.SphereGeometry(1, 24, 24))
  const holes: Array<[number, number, number, number]> = [
    [0.9, 0.41, 1.6, 0.34],
    [-0.7, 0.41, 1.1, 0.26],
    [1.7, 0.41, 0.2, 0.3],
    [-1.5, 0.41, 0.9, 0.22],
    [0.2, 0.41, 0.6, 0.2],
    [-0.2, 0.41, 1.9, 0.24],
    [2.1, 0.12, -0.8, 0.26],
    [-2.2, 0.06, -0.4, 0.22],
    [0.4, -0.38, 1.7, 0.28],
  ]
  holes.forEach(([x, y, z, scale]) => {
    const hole = new THREE.Mesh(holeGeometry, holeMaterial)
    hole.position.set(x, y, z)
    hole.scale.setScalar(scale)
    planet.add(hole)
  })

  // 边缘描线:浅黄叠加发光,强化卡通轮廓
  const edges = new THREE.LineSegments(
    track(geometries, new THREE.EdgesGeometry(wedgeGeometry, 30)),
    track(
      materials,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: CHEESE_LIGHT,
        opacity: 0.6,
        transparent: true,
      })
    )
  )
  planet.add(edges)

  // 双层行星光环(鼠群跑道)
  const makeRing = (radius: number, color: number, opacity: number, tube: number) => {
    const ring = new THREE.Mesh(
      track(geometries, new THREE.TorusGeometry(radius, tube, 12, 140)),
      track(
        materials,
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color,
          depthWrite: false,
          opacity,
          transparent: true,
        })
      )
    )
    ring.rotation.x = Math.PI / 2
    return ring
  }
  const ringA = makeRing(3.7, CHEESE_ORANGE, 0.5, 0.02)
  ringA.rotation.z = 0.18
  const ringB = makeRing(4.5, RAT_TEAL, 0.32, 0.014)
  ringB.rotation.z = -0.26
  planet.add(ringA, ringB)

  planet.rotation.set(0.42, -0.4, -0.12)

  return { planet, ringA, ringB }
}

// 鼠群轨道:🐭 sprite 挂在光环节点下,沿环狂奔
function createOrbitRats(
  textures: THREE.Texture[],
  materials: THREE.Material[],
  random: () => number,
  rings: Array<{ ring: THREE.Mesh; radius: number; count: number; speed: number; size: number }>
) {
  const ratTexture = emojiTexture(textures, '🐭')
  const rats: OrbitRat[] = []

  rings.forEach(({ ring, radius, count, speed, size }) => {
    for (let index = 0; index < count; index += 1) {
      const sprite = new THREE.Sprite(
        track(
          materials,
          new THREE.SpriteMaterial({ depthWrite: false, map: ratTexture, transparent: true })
        )
      )
      sprite.scale.setScalar(size)
      ring.add(sprite)
      rats.push({
        bob: randomBetween(random, 0, Math.PI * 2),
        phase: (index / count) * Math.PI * 2,
        radius,
        speed,
        sprite,
      })
    }
  })

  return rats
}

export function RatBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const textures: THREE.Texture[] = []
    const random = seededRandom(42)

    // Edge 性能档位：降低粒子网复杂度和帧率
    const isEdge = isEdgeBrowser()
    const nodeCount = isEdge ? 16 : 32 // Edge: 节点数减半，连线计算从 O(496) 降至 O(120)
    const linkDistance = isEdge ? 3.5 : 4.2 // Edge: 收紧连线距离，进一步减少判定次数
    const crumbCount = isEdge ? 120 : 240 // Edge: 点云数量减半
    const targetFPS = isEdge ? 30 : 60 // Edge: 降低帧率到 30fps
    const frameInterval = 1000 / targetFPS

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      46,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    camera.position.set(0, 0.6, 12)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearAlpha(0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.domElement.className = 'h-full w-full'
    container.appendChild(renderer.domElement)

    // 暖色三点布光
    const ambient = new THREE.AmbientLight(0xfff4cc, 1.6)
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(-4, 6, 5)
    const fill = new THREE.PointLight(CHEESE_ORANGE, 30, 30)
    fill.position.set(5, 2, -2)
    const rim = new THREE.PointLight(RAT_TEAL, 14, 26)
    rim.position.set(-6, -2, -6)
    scene.add(ambient, key, fill, rim)

    const world = new THREE.Group()
    scene.add(world)

    // ---------- 奶酪星球 + 鼠群 ----------
    const { planet, ringA, ringB } = createCheesePlanet(geometries, materials)
    world.add(planet)

    const rats = createOrbitRats(textures, materials, random, [
      { count: 5, radius: 3.7, ring: ringA, size: 0.62, speed: 0.55 },
      { count: 4, radius: 4.5, ring: ringB, size: 0.5, speed: -0.38 },
    ])

    // ---------- 奶酪粒子网:圆球节点 + 邻近连线 ----------
    // 用不受光照影响的 MeshBasicMaterial,避免出现背光发黑的死色
    const nodeMesh = new THREE.InstancedMesh(
      track(geometries, new THREE.SphereGeometry(0.14, 16, 16)),
      track(
        materials,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          depthWrite: false,
          opacity: 0.9,
          transparent: true,
          vertexColors: true,
        })
      ),
      nodeCount
    )
    nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    nodeMesh.frustumCulled = false
    const nodes: NetNode[] = []
    const dummy = new THREE.Object3D()
    const nodeColor = new THREE.Color()
    for (let index = 0; index < nodeCount; index += 1) {
      nodes.push({
        phase: randomBetween(random, 0, Math.PI * 2),
        scale: randomBetween(random, 0.5, 1.4),
        x: randomBetween(random, -11, 11),
        y: randomBetween(random, -5, 5),
        z: randomBetween(random, -14, -2),
      })
      nodeColor.set(
        index % 3 === 0 ? CHEESE_ORANGE : index % 7 === 0 ? RAT_TEAL : CHEESE_YELLOW
      )
      nodeMesh.setColorAt(index, nodeColor)
    }
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true
    world.add(nodeMesh)

    // 连线:每帧把距离小于阈值的节点两两连起来(LineSegments + drawRange)
    const maxSegments = (nodeCount * (nodeCount - 1)) / 2
    const linkPositions = new Float32Array(maxSegments * 6)
    const linkGeometry = track(geometries, new THREE.BufferGeometry())
    linkGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(linkPositions, 3)
    )
    const links = new THREE.LineSegments(
      linkGeometry,
      track(
        materials,
        new THREE.LineBasicMaterial({
          // 橙色在浅色奶油底和深色底上都可见(比加色混合更稳)
          color: CHEESE_ORANGE,
          depthWrite: false,
          opacity: 0.22,
          transparent: true,
        })
      )
    )
    links.frustumCulled = false
    world.add(links)
    // 节点当前坐标缓存,供连线计算复用
    const nodeCurrent = new Float32Array(nodeCount * 3)

    // ---------- 奶酪屑点云 ----------
    const crumbPositions = new Float32Array(crumbCount * 3)
    for (let index = 0; index < crumbCount; index += 1) {
      crumbPositions[index * 3] = randomBetween(random, -16, 16)
      crumbPositions[index * 3 + 1] = randomBetween(random, -8, 8)
      crumbPositions[index * 3 + 2] = randomBetween(random, -18, 2)
    }
    const crumbGeometry = track(geometries, new THREE.BufferGeometry())
    crumbGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(crumbPositions, 3)
    )
    const crumbs = new THREE.Points(
      crumbGeometry,
      track(
        materials,
        new THREE.PointsMaterial({
          color: CREAM,
          depthWrite: false,
          opacity: 0.55,
          size: 0.055,
          transparent: true,
        })
      )
    )
    world.add(crumbs)

    // ---------- 漂浮 🧀 sprite ----------
    const cheeseTexture = emojiTexture(textures, '🧀')
    const floatingCheese: FloatingCheese[] = []
    for (let index = 0; index < 6; index += 1) {
      const sprite = new THREE.Sprite(
        track(
          materials,
          new THREE.SpriteMaterial({
            depthWrite: false,
            map: cheeseTexture,
            opacity: 0.9,
            transparent: true,
          })
        )
      )
      sprite.scale.setScalar(randomBetween(random, 0.4, 0.85))
      sprite.position.set(
        randomBetween(random, -9, 9),
        randomBetween(random, -4, 4),
        randomBetween(random, -10, -3)
      )
      floatingCheese.push({
        baseY: sprite.position.y,
        phase: randomBetween(random, 0, Math.PI * 2),
        sprite,
      })
      world.add(sprite)
    }

    // ---------- 交互状态 ----------
    const pointer = new THREE.Vector2()
    const targetPointer = new THREE.Vector2()
    let dragging = false
    let lastX = 0
    let lastY = 0
    let velX = 0 // 拖拽角速度(带惯性衰减)
    let velY = 0
    let scrollT = 0 // 滚动进度 0~1

    // hero 区域内才允许拖拽(避免抢占下方内容的滚动/点击)
    const inHeroRange = () => window.scrollY < window.innerHeight * 0.8

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest('button, a, input, textarea, select, [role="button"]') !== null

    const handlePointerDown = (event: PointerEvent) => {
      if (!inHeroRange() || isInteractiveTarget(event.target)) return
      dragging = true
      lastX = event.clientX
      lastY = event.clientY
    }

    const handlePointerMove = (event: PointerEvent) => {
      targetPointer.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2
      )
      if (dragging) {
        velY = (event.clientX - lastX) * 0.0045
        velX = (event.clientY - lastY) * 0.0035
        lastX = event.clientX
        lastY = event.clientY
      }
    }

    const handlePointerUp = () => {
      dragging = false
    }

    const handleScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollT = max > 0 ? Math.min(window.scrollY / max, 1) : 0
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.render(scene, camera)
    }

    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    handleScroll()

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const clock = new THREE.Clock()
    let animationFrameId: number | undefined
    let lastFrameTime = 0 // Edge 帧率控制：记录上次渲染时间

    // 单帧更新:滚动镜头语言 + 自转/惯性 + 各元素动画
    const updateFrame = (elapsed: number) => {
      pointer.lerp(targetPointer, 0.06)

      // 滚动镜头语言:
      //   0.05~0.45 hero→看板:星球滑向左后方让出版面,镜头上移
      //   0.55~0.95 收尾:星球远退,碎片前涌
      const p1 = THREE.MathUtils.smoothstep(scrollT, 0.05, 0.45)
      const p2 = THREE.MathUtils.smoothstep(scrollT, 0.55, 0.95)
      const compact = window.innerWidth < 768

      planet.position.x = THREE.MathUtils.lerp(0, compact ? -1.6 : -6.2, p1)
      planet.position.y =
        THREE.MathUtils.lerp(compact ? -2.6 : -2.3, 0.8, p1) +
        Math.sin(elapsed * 0.6) * 0.12
      planet.position.z =
        THREE.MathUtils.lerp(0, -7, p1) + THREE.MathUtils.lerp(0, -6, p2)
      planet.scale.setScalar(THREE.MathUtils.lerp(compact ? 0.62 : 1, 0.8, p1))

      // 自转 + 拖拽惯性(阻尼衰减)
      planet.rotation.y += 0.0028 + velY
      planet.rotation.x = THREE.MathUtils.clamp(
        planet.rotation.x + velX,
        -0.5,
        1.1
      )
      velX *= 0.94
      velY *= 0.94

      // 光环各自旋转 + 鼠群沿环狂奔(小幅颠跑增加生动感)
      ringA.rotation.y = elapsed * 0.1
      ringB.rotation.y = -elapsed * 0.07
      rats.forEach((rat) => {
        const angle = rat.phase + elapsed * rat.speed
        rat.sprite.position.set(
          Math.cos(angle) * rat.radius,
          Math.sin(angle) * rat.radius,
          Math.sin(elapsed * 6 + rat.bob) * 0.1
        )
      })

      // 粒子网:节点漂浮(p2 阶段整体前涌),再把邻近节点两两连线
      nodes.forEach((node, index) => {
        const nx = node.x
        const ny = node.y + Math.sin(elapsed * 0.5 + node.phase) * 0.5
        const nz = node.z + p2 * 5
        nodeCurrent[index * 3] = nx
        nodeCurrent[index * 3 + 1] = ny
        nodeCurrent[index * 3 + 2] = nz
        dummy.position.set(nx, ny, nz)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(node.scale)
        dummy.updateMatrix()
        nodeMesh.setMatrixAt(index, dummy.matrix)
      })
      nodeMesh.instanceMatrix.needsUpdate = true

      let segment = 0
      const maxDistSq = linkDistance * linkDistance
      for (let i = 0; i < nodeCount; i += 1) {
        for (let j = i + 1; j < nodeCount; j += 1) {
          const dx = nodeCurrent[i * 3] - nodeCurrent[j * 3]
          const dy = nodeCurrent[i * 3 + 1] - nodeCurrent[j * 3 + 1]
          const dz = nodeCurrent[i * 3 + 2] - nodeCurrent[j * 3 + 2]
          if (dx * dx + dy * dy + dz * dz > maxDistSq) continue
          linkPositions.set(
            [
              nodeCurrent[i * 3],
              nodeCurrent[i * 3 + 1],
              nodeCurrent[i * 3 + 2],
              nodeCurrent[j * 3],
              nodeCurrent[j * 3 + 1],
              nodeCurrent[j * 3 + 2],
            ],
            segment * 6
          )
          segment += 1
        }
      }
      linkGeometry.setDrawRange(0, segment * 2)
      linkGeometry.attributes.position.needsUpdate = true

      // 🧀 缓慢浮动
      floatingCheese.forEach((cheese) => {
        cheese.sprite.position.y =
          cheese.baseY + Math.sin(elapsed * 0.7 + cheese.phase) * 0.4
        const material = cheese.sprite.material
        material.rotation = Math.sin(elapsed * 0.4 + cheese.phase) * 0.3
      })

      // 指针视差 + 滚动相机俯仰
      world.rotation.y = pointer.x * 0.05
      world.rotation.x = pointer.y * 0.03
      camera.position.x = pointer.x * 0.5
      camera.position.y = 0.6 - pointer.y * 0.3 + p1 * 0.8
      camera.lookAt(0, p1 * 0.5, 0)
    }

    const renderFrame = () => {
      const now = performance.now()
      // Edge 帧率限制：只有距离上次渲染超过 frameInterval 才执行
      if (isEdge && now - lastFrameTime < frameInterval) {
        animationFrameId = window.requestAnimationFrame(renderFrame)
        return
      }
      lastFrameTime = now

      updateFrame(clock.getElapsedTime())
      renderer.render(scene, camera)
      animationFrameId = window.requestAnimationFrame(renderFrame)
    }

    handleResize()
    if (reduceMotion) {
      // 降级:只渲染静态首帧
      updateFrame(0)
      renderer.render(scene, camera)
    } else {
      renderFrame()
    }

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId)
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      textures.forEach((texture) => texture.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden='true'
      // 深色模式下整体调低不透明度,避免暖色奶酪在深色背景上过亮
      className='pointer-events-none fixed inset-0 z-0 opacity-95 dark:opacity-75'
    />
  )
}
