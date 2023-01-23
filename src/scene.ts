import {
  AdditiveBlending,
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  sRGBEncoding,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { toggleFullScreen } from './helpers/fullscreen'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'

import GUI from 'lil-gui'

import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'
import firefliesVertexShader from './shaders/fireflies/vertex.glsl'

import portalFragmentShader from './shaders/portal/fragment.glsl'
import portalVertexShader from './shaders/portal/vertex.glsl'

import './style.css'

const CANVAS_ID = 'scene'

let canvas: HTMLElement
let renderer: WebGLRenderer
let scene: Scene
let loadingManager: LoadingManager
let camera: PerspectiveCamera
let cameraControls: OrbitControls
let axesHelper: AxesHelper
let gui: GUI
let clock: Clock
let fireflies: Points
let portalLight: Mesh

const config = {
  portal: {
    colorStart: new Color('#c4c4ac'),
    colorEnd: new Color('#4c7976'),
  },
}

init().then(() => animate())

async function init() {
  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = sRGBEncoding
    scene = new Scene()
  }

  // ===== 👨🏻‍💼 LOADING MANAGER =====
  {
    loadingManager = new LoadingManager()

    loadingManager.onStart = () => {
      console.log('loading started')
    }
    loadingManager.onProgress = (url, loaded, total) => {
      console.log('loading in progress:')
      console.log(`${url} -> ${loaded} / ${total}`)
    }
    loadingManager.onLoad = () => {
      console.log('loaded!')
    }
    loadingManager.onError = () => {
      console.log('❌ error while loading')
    }
  }

  // ===== 💡 LIGHTS =====
  {
  }

  // ===== 📦 OBJECTS =====
  {
    // Scene
    const gltfLoader = new GLTFLoader(loadingManager)
    const portalGltf = await gltfLoader.loadAsync('/portal-scene.glb')
    scene.add(portalGltf.scene)

    const sceneMesh = scene.getObjectByName('Scene') as Mesh
    sceneMesh.position.set(0, 0, 0.7)

    // Textures
    const textureLoader = new TextureLoader(loadingManager)
    const bakedTexture = await textureLoader.loadAsync('/baked.jpg')
    bakedTexture.flipY = false
    bakedTexture.encoding = sRGBEncoding

    // Materials
    const bakedMaterial = new MeshBasicMaterial({
      map: bakedTexture,
    })
    const lampMaterial = new MeshBasicMaterial({
      color: 0xffffe5,
    })

    const bakedScene = scene.getObjectByName('baked') as Mesh
    bakedScene.material = bakedMaterial

    const lampLightA = scene.getObjectByName('lampLightA') as Mesh
    const lampLightB = scene.getObjectByName('lampLightB') as Mesh

    lampLightA.material = lampMaterial
    lampLightB.material = lampMaterial

    // Fireflies

    const firefliesCount = 50
    const firefliesGeometry = new BufferGeometry()
    const positions = new Float32Array(firefliesCount * 3)

    const scaleArray = new Float32Array(firefliesCount)

    for (let i = 0; i < firefliesCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 4 // x
      positions[i * 3 + 1] = Math.random() * 1.5 // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 // z

      scaleArray[i] = Math.random()
    }

    firefliesGeometry.setAttribute('position', new BufferAttribute(positions, 3))
    firefliesGeometry.setAttribute('aScale', new BufferAttribute(scaleArray, 1))

    const firefliesMaterial = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uSize: { value: 80 },
      },
      vertexShader: firefliesVertexShader,
      fragmentShader: firefliesFragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    window.addEventListener('resize', () => {
      firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    })

    fireflies = new Points(firefliesGeometry, firefliesMaterial)
    fireflies.name = 'Fireflies'

    scene.add(fireflies)

    // Portal

    const portalMaterial = new ShaderMaterial({
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorStart: { value: config.portal.colorStart },
        uColorEnd: { value: config.portal.colorEnd },
      },
    })

    portalLight = scene.getObjectByName('portalLight') as Mesh
    portalLight.material = portalMaterial
  }

  // ===== 🎥 CAMERA =====
  {
    camera = new PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(2.42, 3.34, 5.96)
  }

  // ===== 🕹️ CONTROLS =====
  {
    cameraControls = new OrbitControls(camera, canvas)
    cameraControls.target = new Vector3(-0.429, 0.26, 0.129)
    cameraControls.enableDamping = true
    cameraControls.autoRotate = false
    cameraControls.update()

    // Full screen
    window.addEventListener('dblclick', (event) => {
      if (event.target === canvas) {
        toggleFullScreen(canvas)
      }
    })
  }

  // ===== 🪄 HELPERS =====
  {
    axesHelper = new AxesHelper(4)
    axesHelper.visible = false
    scene.add(axesHelper)
  }

  // ===== ⏰ Clock =====
  {
    clock = new Clock()
  }

  // ===== 🐞 DEBUG GUI =====
  {
    gui = new GUI({ title: '🐞 Debug GUI', width: 300 })

    const firefliesFolder = gui.addFolder('Fireflies')
    const firefliesMaterial = fireflies.material as ShaderMaterial
    firefliesFolder.close()
    firefliesFolder
      .add(firefliesMaterial.uniforms.uSize, 'value')
      .min(0.1)
      .max(500)
      .step(1)
      .name('size')

    const portalFolder = gui.addFolder('Portal')
    portalFolder.addColor(config.portal, 'colorStart')
    portalFolder.addColor(config.portal, 'colorEnd')

    const helpersFolder = gui.addFolder('Helpers')
    helpersFolder.add(axesHelper, 'visible').name('axes')
    helpersFolder.close()

    const cameraFolder = gui.addFolder('Camera')
    cameraFolder.add(cameraControls, 'autoRotate')
    cameraFolder.close()

    gui.hide()

    // persist GUI state in local storage on changes
    gui.onFinishChange(() => {
      const guiState = gui.save()
      localStorage.setItem('guiState', JSON.stringify(guiState))
    })

    // load GUI state if available in local storage
    const guiState = localStorage.getItem('guiState')
    if (guiState) gui.load(JSON.parse(guiState))
  }
}

function animate() {
  requestAnimationFrame(animate)

  const elapsedTime = clock.getElapsedTime()

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  }

  // Update Controls
  cameraControls.update()

  // Update Materials
  const firefliesMaterial = fireflies.material as ShaderMaterial
  firefliesMaterial.uniforms.uTime.value = elapsedTime

  const portalMaterial = portalLight.material as ShaderMaterial
  portalMaterial.uniforms.uTime.value = elapsedTime

  // Render scene
  renderer.render(scene, camera)
}
