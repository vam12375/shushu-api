import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function RatBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)

    const bubbles: { mesh: THREE.Mesh; speed: number }[] = []
    const colors = [0xffd23f, 0xff9f1c, 0x2ec4b6]

    for (let i = 0; i < 30; i++) {
      const geom = new THREE.SphereGeometry(Math.random() * 0.3, 32, 32)
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.1,
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5
      )
      scene.add(mesh)
      bubbles.push({ mesh, speed: Math.random() * 0.01 + 0.005 })
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    let animationFrameId: number

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      bubbles.forEach((b) => {
        b.mesh.position.y += b.speed
        if (b.mesh.position.y > 6) b.mesh.position.y = -6
        b.mesh.rotation.x += 0.01
      })
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
      // Clean up Three.js resources
      bubbles.forEach((b) => {
        b.mesh.geometry.dispose()
        if (Array.isArray(b.mesh.material)) {
          b.mesh.material.forEach((m) => m.dispose())
        } else {
          b.mesh.material.dispose()
        }
      })
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      id='three-container'
      className='fixed inset-0 -z-10 opacity-80 pointer-events-none'
    />
  )
}
