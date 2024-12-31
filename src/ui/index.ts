import FPS from './fps'
import Bag from './bag'
import Terrain from '../terrain'
import Block from '../terrain/mesh/block'
import Control from '../control'
import { Mode } from '../player'
import Joystick from './joystick'
import { isMobile } from '../utils'
import * as THREE from 'three'

export default class UI {
  constructor(terrain: Terrain, control: Control) {
    this.fps = new FPS()
    this.bag = new Bag()
    this.joystick = new Joystick(control)

    this.crossHair.className = 'cross-hair'
    this.crossHair.innerHTML = '+'
    document.body.appendChild(this.crossHair)

    // play

        this.onStart()
        // reset game
        terrain.noise.seed = Math.random()
        terrain.noise.stoneSeed = Math.random()
        terrain.noise.treeSeed = Math.random()
        terrain.noise.coalSeed = Math.random()
        terrain.noise.leafSeed = Math.random()
        terrain.customBlocks = []
        terrain.initBlocks()
        terrain.generate()
        terrain.camera.position.y = 40
        control.player.setMode(Mode.walking)

      !isMobile && control.control.lock()

    // mode
    this.modeInput?.addEventListener('input', (e: Event) => {
      if (e.target instanceof HTMLInputElement) {
        this.mode!.innerHTML = 'Mode: Infinite'     // temporary code (just for the text)
        // add code to change mode...(add a boolean for the mode)
        // this.mode!.innerHTML = `Mode: ${BOOLEAN ? 'Infinite' : 'Levels'}`
      }

    })

    // respawn
    this.respawnInput?.addEventListener('input', (e: Event) => {
      if (e.target instanceof HTMLInputElement) {
        this.newRespawn!.innerHTML = 'New Respawn: Off'     // temporary code (just for the text)
        // add code for respawn...(add a boolean for the respawn)
        // this.newRespawn!.innerHTML = `New Respawn: ${BOOLEAN ? 'Off' : 'On'}`
      }
    })


    // leaderboard
    this.leaderboard?.addEventListener('click', () => {
      // this.leaderboard?.classList.remove('hidden')
    })

    // fov
    this.fovInput?.addEventListener('input', (e: Event) => {
      if (this.fov && e.target instanceof HTMLInputElement) {
        this.fov.innerHTML = `FOV: Normal`
        // should cycle through a bunch of set FOVs (zoom: 50, normal: 70, wide: 90, quake pro: 110)
      }
    })

    // // fov
    // this.fovInput?.addEventListener('input', (e: Event) => {
    //   if (this.fov && e.target instanceof HTMLInputElement) {
    //     this.fov.innerHTML = `FOV: ${e.target.value}`
    //     control.camera.fov = parseInt(e.target.value)
    //     control.camera.updateProjectionMatrix()
    //   }
    // })

    //chunks
    this.chunksInput?.addEventListener('input', (e: Event) => {
      if (this.chunks && e.target instanceof HTMLInputElement) {
        this.chunks.innerHTML = `Chunks: 4`
        // const disabled = e.target.value === '0'
        // control.audio.disabled = disabled
        // this.chunks!.innerHTML = `Chunks: ${disabled ? '' : 'On'}`

      }
    })


    // audio
    this.audioInput?.addEventListener('input', (e: Event) => {
      if (this.audio && e.target instanceof HTMLInputElement) {
        this.audio.innerHTML = `Audio: Music`
        // const disabled = e.target.value === '0'
        // control.audio.disabled = disabled
        // this.chunks!.innerHTML = `Chunks: ${disabled ? '' : 'On'}`
      }
    })

    // done (apply settings)
    this.done?.addEventListener('click', () => {
      if (this.chunksInput instanceof HTMLInputElement) {
        // terrain.distance = parseInt(this.chunksInput.value)
        // terrain.maxCount =
        //   (terrain.distance * terrain.chunkSize * 2 + terrain.chunkSize) ** 2 +
        //   500
        //
        // terrain.initBlocks()
        // terrain.generate()
        // terrain.scene.fog = new THREE.Fog(
        //   0x87ceeb,
        //   1,
        //   terrain.distance * 24 + 24
        // )
      }
      this.onDone()
    })

    // menu and fullscreen
    document.body.addEventListener('keydown', (e: KeyboardEvent) => {
      // menu
      if (e.key === 'e' && document.pointerLockElement) {
        !isMobile && control.control.unlock()
      }

      // fullscreen
      if (e.key === 'f') {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          document.body.requestFullscreen()
        }
      }
    })

    // exit
    // this.exit?.addEventListener('click', () => {
    //   this.onExit()
    // })

    // play / pause handler
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) {
        this.onStart()
      } else {
        this.onPause()
      }
    })

    // disable context menu
    document.addEventListener('contextmenu', e => {
      e.preventDefault()
    })

    // fallback lock handler
    document.querySelector('canvas')?.addEventListener('click', (e: Event) => {
      e.preventDefault()
      !isMobile && control.control.lock()
    })
  }

  fps: FPS
  bag: Bag
  joystick: Joystick

  menu = document.querySelector('.menu')
  crossHair = document.createElement('div')

  // buttons
  mode = document.querySelector('#mode')
  modeInput = document.querySelector('#mode-input')

  newRespawn = document.querySelector('#new-respawn')
  respawnInput = document.querySelector('#respawn-input')

  leaderboard = document.querySelector('#leaderboard')

  fov = document.querySelector('#fov')
  fovInput = document.querySelector('#fov-input')

  chunks = document.querySelector('#chunks')
  chunksInput = document.querySelector('#chunks-input')

  audio = document.querySelector('#audio')
  audioInput = document.querySelector('#audio-input')

  done = document.querySelector('#done')


  // modals
  // saveModal = document.querySelector('.save-modal')
  // loadModal = document.querySelector('.load-modal')
  // settings = document.querySelector('.settings')
  features = document.querySelector('.features')
  github = document.querySelector('.github')

  // settings
  // distance = document.querySelector('#distance')
  // distanceInput = document.querySelector('#distance-input')
  //
  // fov = document.querySelector('#fov')
  // fovInput = document.querySelector('#fov-input')
  //
  // music = document.querySelector('#music')
  // musicInput = document.querySelector('#music-input')
  //
  // settingBack = document.querySelector('#setting-back')

  onStart = () => {
    isMobile && this.joystick.init()
    this.menu?.classList.add('hidden')
    this.menu?.classList.remove('start')
    // this.play && (this.play.innerHTML = 'Resume')
    this.crossHair.classList.remove('hidden')
    this.github && this.github.classList.add('hidden')
    // this.feature?.classList.add('hidden')
  }

  onPause = () => {
    this.menu?.classList.remove('hidden')
    this.crossHair.classList.add('hidden')
    // this.save && (this.save.innerHTML = 'Save and Exit')
    // this.github && this.github.classList.remove('hidden')
  }

  onDone = () => {
    this.menu?.classList.add('hidden')
    this.onStart()
  }
  //
  // onSave = () => {
  //   this.saveModal?.classList.remove('hidden')
  //   setTimeout(() => {
  //     this.saveModal?.classList.add('show')
  //   })
  //   setTimeout(() => {
  //     this.saveModal?.classList.remove('show')
  //   }, 1000)
  //
  //   setTimeout(() => {
  //     this.saveModal?.classList.add('hidden')
  //   }, 1350)
  // }
  //
  // onLoad = () => {
  //   this.loadModal?.classList.remove('hidden')
  //   setTimeout(() => {
  //     this.loadModal?.classList.add('show')
  //   })
  //   setTimeout(() => {
  //     this.loadModal?.classList.remove('show')
  //   }, 1000)
  //
  //   setTimeout(() => {
  //     this.loadModal?.classList.add('hidden')
  //   }, 1350)
  // }

  update = () => {
    this.fps.update()
  }
}
