"use client"

import * as React from "react"
import * as THREE from "three"

const VERT_ATMO = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const FRAG_ATMO = `
  varying vec3 vNormal;
  void main() {
    float i = pow(0.54 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 5.5);
    gl_FragColor = vec4(0.12, 0.36, 0.88, 1.0) * i;
  }
`

export function HeroGlobe() {
  const mountRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setClearColor(0x020204, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    // 0.60 — тёмно, но текстура Земли видна (как на globaldollar.com)
    renderer.toneMappingExposure = 0.50
    const canvas = renderer.domElement
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 1.4s ease;"
    mount.appendChild(canvas)

    const scene = new THREE.Scene()
    // FOV 60, z=2.8 → шар радиуса 2.3 заполняет ~1.67× высоту экрана
    // Лимб (край) шара виден слева примерно на 15% ширины — как на референсе
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 2.8)
    camera.lookAt(0, 0, 0)

    // Минимальный ambient — тёмная сторона почти чёрная
    scene.add(new THREE.AmbientLight(0xffffff, 0.04))
    // Солнце справа-сверху — освещает правый-верхний квадрант (как на референсе)
    const sun = new THREE.DirectionalLight(0xffffff, 3.2)
    sun.position.set(5, 2, 4)
    scene.add(sun)

    const earthMat = new THREE.MeshPhongMaterial({
      // Приглушаем синий канал текстуры → тёмно-серо-зелёный тон как на референсе
      color: new THREE.Color(0.62, 0.72, 0.62),
      specular: new THREE.Color(0x060608),
      shininess: 3,
    })
    // Шар слегка смещён влево — левый лимб виден в 10-15% от левого края экрана
    const earth = new THREE.Mesh(new THREE.SphereGeometry(2.3, 128, 128), earthMat)
    earth.position.set(-0.15, 0, 0)
    earth.rotation.y = 1.2
    scene.add(earth)

    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(2.42, 128, 128),
      new THREE.ShaderMaterial({
        vertexShader: VERT_ATMO,
        fragmentShader: FRAG_ATMO,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      })
    )
    atmo.position.copy(earth.position)
    scene.add(atmo)

    new THREE.TextureLoader().load(
      "/textures/earth-blue-marble.jpg",
      (tex) => {
        earthMat.map = tex
        earthMat.needsUpdate = true
        canvas.style.opacity = "1"
      },
      undefined,
      () => { canvas.style.opacity = "1" }
    )

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", onResize)

    let raf: number
    const tick = () => {
      raf = requestAnimationFrame(tick)
      earth.rotation.y += 0.0009
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
      if (mount.contains(canvas)) mount.removeChild(canvas)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ background: "#020204" }}
    />
  )
}
