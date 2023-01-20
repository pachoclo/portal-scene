import GUI from 'lil-gui'
import {
  AxesHelper,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
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

const CANVAS_ID = 'scene'

let canvas: HTMLElement
let renderer: WebGLRenderer
let scene: Scene
let loadingManager: LoadingManager
let camera: PerspectiveCamera
let cameraControls: OrbitControls
let axesHelper: AxesHelper
let gui: GUI

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

    scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = bakedMaterial
      }
    })

    const lampLightA = scene.getObjectByName('lampLightA') as Mesh
    const lampLightB = scene.getObjectByName('lampLightB') as Mesh
    const portalLight = scene.getObjectByName('portalLight') as Mesh

    lampLightA.material = lampMaterial
    lampLightB.material = lampMaterial
    portalLight.material = lampMaterial
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

  // ==== 🐞 DEBUG GUI ====
  {
    gui = new GUI({ title: '🐞 Debug GUI', width: 300 })

    const helpersFolder = gui.addFolder('Helpers')
    helpersFolder.add(axesHelper, 'visible').name('axes')

    const cameraFolder = gui.addFolder('Camera')
    cameraFolder.add(cameraControls, 'autoRotate')

    // persist GUI state in local storage on changes
    gui.onFinishChange(() => {
      const guiState = gui.save()
      localStorage.setItem('guiState', JSON.stringify(guiState))
    })

    // load GUI state if available in local storage
    const guiState = localStorage.getItem('guiState')
    if (guiState) gui.load(JSON.parse(guiState))

    gui.close()

    gui.hide()
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
