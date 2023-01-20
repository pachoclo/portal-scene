import GUI from 'lil-gui'
import {
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
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
import './style.css'

import firefliesVertexShader from './shaders/fireflies/vertex.glsl'
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'

console.log(firefliesVertexShader)
console.log(firefliesFragmentShader)

const CANVAS_ID = 'scene'

let canvas: HTMLElement
let renderer: WebGLRenderer
let scene: Scene
let loadingManager: LoadingManager
let camera: PerspectiveCamera
let cameraControls: OrbitControls
let axesHelper: AxesHelper
let gui: GUI
let fireflies: Points

const state = {
  clearColor: '#1e2129',
}

init().then(() => animate())

async function init() {
  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = sRGBEncoding
    renderer.setClearColor(state.clearColor)
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
    // Portal

    // Scene
    const gltfLoader = new GLTFLoader(loadingManager)
    const portalGltf = await gltfLoader.loadAsync('/portal-scene.glb')
    scene.add(portalGltf.scene)

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
    const portalLight = scene.getObjectByName('portalLight') as Mesh

    lampLightA.material = lampMaterial
    lampLightB.material = lampMaterial
    portalLight.material = lampMaterial

    // Fireflies

    const firefliesCount = 30
    const firefliesGeometry = new BufferGeometry()
    const positions = new Float32Array(firefliesCount * 3)

    for (let i = 0; i < firefliesCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 4 // x
      positions[i * 3 + 1] = Math.random() * 1.5 // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 // z
    }

    firefliesGeometry.setAttribute('position', new BufferAttribute(positions, 3))

    const firefliesMaterial = new ShaderMaterial({
      vertexShader: firefliesVertexShader,
      fragmentShader: firefliesFragmentShader,
      uniforms: {
        uPixelRatio: { value: renderer.getPixelRatio() },
        uSize: { value: 100 },
      },
    })

    window.addEventListener('resize', () => {
      // Update fireflies
      firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    })

    fireflies = new Points(firefliesGeometry, firefliesMaterial)

    scene.add(fireflies)
  }

  // ===== 🎥 CAMERA =====
  {
    camera = new PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(2.5, 3.15, 3.4)
  }

  // ===== 🕹️ CONTROLS =====
  {
    cameraControls = new OrbitControls(camera, canvas)
    cameraControls.target = new Vector3(0, 0, -1)
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

  // ===== 🐞 DEBUG GUI =====
  {
    gui = new GUI({ title: '🐞 Debug GUI', width: 300 })

    gui.addColor(state, 'clearColor').onChange(() => renderer.setClearColor(state.clearColor))

    const firefliesMaterial = fireflies.material as ShaderMaterial
    gui
      .add(firefliesMaterial.uniforms.uSize, 'value')
      .min(0.1)
      .max(500)
      .step(1)
      .name('firefly size')

    const helpersFolder = gui.addFolder('Helpers')
    helpersFolder.add(axesHelper, 'visible').name('axes')

    const cameraFolder = gui.addFolder('Camera')
    cameraFolder.add(cameraControls, 'autoRotate')

    gui.close()
    // gui.hide()

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

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  }

  cameraControls.update()

  renderer.render(scene, camera)
}
