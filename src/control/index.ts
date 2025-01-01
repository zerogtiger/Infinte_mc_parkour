import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import Player, { Mode } from '../player'
import Terrain, { BlockType } from '../terrain'

import Block from '../terrain/mesh/block'
import Noise from '../terrain/noise'
import Audio from '../audio'
import { isMobile } from '../utils'
import { Easing, Tween } from "@tweenjs/tween.js";
import { Vector3 } from 'three'

enum Side {
  front,
  back,
  left,
  right,
  down,
  up
}

export default class Control {
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    player: Player,
    terrain: Terrain,
    audio: Audio
  ) {
    this.scene = scene
    this.camera = camera
    this.player = player
    this.terrain = terrain
    this.control = new PointerLockControls(camera, document.body)
    this.audio = audio

    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 8
    this.far = this.player.body.height


    this.initRayCaster()
    this.initEventListeners()
  }

  // constants
  static FOVS = [50, 70, 90, 110]

  // core properties
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  player: Player
  terrain: Terrain
  control: PointerLockControls
  audio: Audio
  velocity = new THREE.Vector3(0, 0, 0)
  fovInput = 1

  intersect: Vector3 = new THREE.Vector3;

  // collide and jump properties
  frontCollide = false
  backCollide = false
  leftCollide = false
  rightCollide = false
  downCollide = true
  upCollide = false
  isJumping = false

  // double tap 'w' properties
  lastWPressTime: number = 0;
  doubleTapThreshold: number = 300; // milliseconds
  isDoubleTap: boolean = false;

  raycasterDown: THREE.Raycaster[] = [];
  raycasterUp: THREE.Raycaster[] = [];
  raycasterFront: THREE.Raycaster[] = [];
  raycasterBack: THREE.Raycaster[] = [];
  raycasterRight: THREE.Raycaster[] = [];
  raycasterLeft: THREE.Raycaster[] = [];

  // playerRaycaster: THREE.Raycaster[][][]; // top/bottom, front/back, left/right

  tempMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
    100
  )
  // tempMeshMatrix = new THREE.InstancedBufferAttribute(
  //   new Float32Array(100 * 16),
  //   16
  // )

  // other properties
  p1 = performance.now()
  p2 = performance.now()
  raycaster: THREE.Raycaster
  far: number

  holdingBlock = BlockType.grass
  holdingBlocks = [
    BlockType.grass,
    BlockType.stone,
    BlockType.tree,
    BlockType.wood,
    BlockType.diamond,
    BlockType.quartz,
    BlockType.glass,
    BlockType.grass,
    BlockType.grass,
    BlockType.grass
  ]
  holdingIndex = 0
  wheelGap = false
  clickInterval?: ReturnType<typeof setInterval>
  jumpInterval?: ReturnType<typeof setInterval>
  mouseHolding = false
  spaceHolding = false

  initRayCaster = () => {

    for (let i = 0; i < 4; i++) {
      this.raycasterDown[i] = new THREE.Raycaster();
      this.raycasterUp[i] = new THREE.Raycaster();
      this.raycasterFront[i] = new THREE.Raycaster();
      this.raycasterBack[i] = new THREE.Raycaster();
      this.raycasterLeft[i] = new THREE.Raycaster();
      this.raycasterRight[i] = new THREE.Raycaster();

      this.raycasterUp[i].ray.direction = new THREE.Vector3(0, 1, 0)
      this.raycasterDown[i].ray.direction = new THREE.Vector3(0, -1, 0)
      this.raycasterFront[i].ray.direction = new THREE.Vector3(1, 0, 0)
      this.raycasterBack[i].ray.direction = new THREE.Vector3(-1, 0, 0)
      this.raycasterLeft[i].ray.direction = new THREE.Vector3(0, 0, -1)
      this.raycasterRight[i].ray.direction = new THREE.Vector3(0, 0, 1)

      this.raycasterUp[i].far = 1.2
      this.raycasterDown[i].far = this.player.body.height
      this.raycasterFront[i].far = this.player.body.width / 2
      this.raycasterBack[i].far = this.player.body.width / 2
      this.raycasterLeft[i].far = this.player.body.width / 2
      this.raycasterRight[i].far = this.player.body.width / 2
    }

    // for (const ray of this.raycasterDown) {
    //   ray.ray.direction = new THREE.Vector3(0, -1, 0)
    //   ray.far = this.player.body.height
    // }
    // this.raycasterUp.ray.direction = new THREE.Vector3(0, 1, 0)
    // this.raycasterDown.ray.direction = new THREE.Vector3(0, -1, 0)
    // this.raycasterFront.ray.direction = new THREE.Vector3(1, 0, 0)
    // this.raycasterBack.ray.direction = new THREE.Vector3(-1, 0, 0)
    // this.raycasterLeft.ray.direction = new THREE.Vector3(0, 0, -1)
    // this.raycasterRight.ray.direction = new THREE.Vector3(0, 0, 1)
  }

  downKeys = {
    a: false,
    d: false,
    w: false,
    s: false,
  }
  setMovementHandler = (e: KeyboardEvent) => {

    if (e.repeat) {
      if (this.player.mode === Mode.walking && (e.key == 'w' || e.key == 'W') && !this.frontCollide) {
        if (e.ctrlKey) {
          this.player.setMode(Mode.sprinting)
          this.updateFOV(this.camera.fov + 20)
          this.camera.updateProjectionMatrix()
          console.log('w then ctrl sprint')
        }
        this.downKeys.w = true
        this.velocity.x = this.player.speed
      } else if (e.key == 'Shift' && (this.player.mode === Mode.walking || this.player.mode === Mode.sprinting)){
        this.jumpInterval && clearInterval(this.jumpInterval)
        this.jumpInterval = setInterval(() => {
          this.setMovementHandler(e)
        }, 120)
      }
      return
    }

    switch (e.key) {
      case 'q':
        if (this.player.mode != Mode.flying) {
          this.player.setMode(Mode.flying)
        } else {
          this.player.setMode(Mode.walking)
        }
        this.velocity.y = 0
        this.velocity.x = 0
        this.velocity.z = 0
        break

      case 'w':
      case 'W':
        if (e.shiftKey && this.spaceHolding){
          this.jumpInterval && clearInterval(this.jumpInterval)
          this.jumpInterval = setInterval(() => {
            this.setMovementHandler(e)
          }, 120)
        }
        const currentTime = Date.now();

        // Check for double-tap condition
        if (currentTime - this.lastWPressTime <= this.doubleTapThreshold) {
          this.isDoubleTap = true;
        } else {
          this.isDoubleTap = false;
        }

        // Update last press time
        this.lastWPressTime = currentTime;
        if (this.isDoubleTap && !this.frontCollide) {
          this.player.setMode(Mode.sprinting);
          this.updateFOV(this.camera.fov + 20);
          this.camera.updateProjectionMatrix();
          console.log(this.camera.fov);
        }
        else if (e.ctrlKey && !this.isDoubleTap && !this.frontCollide) {
          this.player.setMode(Mode.sprinting)
          this.updateFOV(this.camera.fov + 20)
          this.camera.updateProjectionMatrix()
          console.log("ctrl then w sprint")
        }
        this.downKeys.w = true
        this.velocity.x = this.player.speed
        break
      case 's':
      case 'S':
        this.downKeys.s = true
        this.velocity.x = -this.player.speed
        break
      case 'a':
      case 'A':
        this.downKeys.a = true
        this.velocity.z = -this.player.speed
        break
      case 'd':
      case 'D':
        this.downKeys.d = true
        this.velocity.z = this.player.speed
        break
      case ' ':

        if (this.player.mode === Mode.walking) {
          // jump
          if (!this.isJumping) {
            this.velocity.y = 8*0.9
            this.isJumping = true
            this.downCollide = false
            this.far = 0
            setTimeout(() => {
              this.far = this.player.body.height
            }, 300)
          }
        } else if (this.player.mode === Mode.sprinting) { // sprinting
          // jump (for sprint)
          if (!this.isJumping) {
            this.velocity.y = 8*0.98
            this.isJumping = true
            this.downCollide = false
            this.far = 0
            setTimeout(() => {
              this.far = this.player.body.height
            }, 300)
          }
        } else if (this.player.mode == Mode.sneaking){
          if (!this.isJumping) {
            this.velocity.y = 8 * 0.85
            this.isJumping = true
            this.downCollide = false
            this.far = 0
            setTimeout(() => {
              this.far = this.player.body.height
            }, 300)
          }
        } else { // flying
          this.velocity.y += this.player.speed
        }
        if ((this.player.mode === Mode.walking || this.player.mode === Mode.sprinting) && !this.spaceHolding) {

          this.spaceHolding = true
          this.jumpInterval = setInterval(() => {
            this.setMovementHandler(e)
          }, 60)
        } else if ((this.player.mode === Mode.sneaking) && !this.spaceHolding) {
          this.spaceHolding = true
          this.jumpInterval = setInterval(() => {
            this.setMovementHandler(e)
          }, 120)
        }
        break
      case 'Shift':
        if (this.player.mode != Mode.flying) {
          if (this.player.mode === Mode.sprinting){
            this.updateFOV(this.camera.fov - 20)
            this.camera.updateProjectionMatrix()
            this.player.setMode(Mode.sneaking)
            if (this.spaceHolding){
              this.jumpInterval && clearInterval(this.jumpInterval)
              this.jumpInterval = setInterval(() => {
                this.setMovementHandler(e)
              }, 120)
              if (!this.isJumping) {
                this.velocity.y = 8 * 0.85
                this.isJumping = true
                this.downCollide = false
                this.far = 0
                setTimeout(() => {
                  this.far = this.player.body.height
                }, 300)
              }
            }
          }
          if (this.player.mode === Mode.walking || this.player.mode === Mode.sneaking) {
            this.player.setMode(Mode.sneaking)
            if (this.spaceHolding){
              this.jumpInterval && clearInterval(this.jumpInterval)
              this.jumpInterval = setInterval(() => {
                this.setMovementHandler(e)
              }, 120)
              if (!this.isJumping) {
                this.velocity.y = 8 * 0.85
                this.isJumping = true
                this.downCollide = false
                this.far = 0
                setTimeout(() => {
                  this.far = this.player.body.height
                }, 300)
              }
            }
            if (this.downKeys.w) {
              this.velocity.x = this.player.speed
            }
            if (this.downKeys.s) {
              this.velocity.x = -this.player.speed
            }
            if (this.downKeys.a) {
              this.velocity.z = -this.player.speed
            }
            if (this.downKeys.d) {
              this.velocity.z = this.player.speed
            }
            if (!this.spaceHolding) this.camera.position.setY(this.camera.position.y - 0.2)
          }
        } else {
          this.velocity.y -= this.player.speed
        }
        break
      case 'Control':
        if (!this.frontCollide && this.player.mode == Mode.walking && this.velocity.x != 0) {
          this.player.setMode(Mode.sprinting)
          this.updateFOV(this.camera.fov + 20)
          this.camera.updateProjectionMatrix()
          this.velocity.x = this.player.speed
        }
        console.log("CTRL")
        break
      default:
        break
    }
  }

  resetMovementHandler = (e: KeyboardEvent) => {
    if (e.repeat) {
      return
    }

    switch (e.key) {
      case 'w':
      case 'W':
        if (this.player.mode == Mode.sprinting) {
          this.player.setMode(Mode.walking)
          this.updateFOV(this.camera.fov - 20)
          this.camera.updateProjectionMatrix()
          console.log(this.camera.fov)
        }
        if (Date.now() - this.lastWPressTime < 200) {
          this.updateFOV(Control.FOVS[this.fovInput])
        }
        this.downKeys.w = false
        this.velocity.x = 0
        break
      case 's':
      case 'S':
        this.downKeys.s = false
        this.velocity.x = 0
        break
      case 'a':
      case 'A':
        this.downKeys.a = false
        this.velocity.z = 0
        break
      case 'd':
      case 'D':
        this.downKeys.d = false
        this.velocity.z = 0
        break
      case ' ':

        this.jumpInterval && clearInterval(this.jumpInterval)
        this.spaceHolding = false
        if (this.player.mode === Mode.walking || this.player.mode === Mode.sprinting) {
          return
        }
        this.velocity.y = 0
        break
      case 'Shift':
        if (this.player.mode === Mode.sneaking) {
          this.player.setMode(Mode.walking)
          if (this.downKeys.w) {
            this.velocity.x = this.player.speed
          }
          if (this.downKeys.s) {
            this.velocity.x = -this.player.speed
          }
          if (this.downKeys.a) {
            this.velocity.z = -this.player.speed
          }
          if (this.downKeys.d) {
            this.velocity.z = this.player.speed
          }
          this.camera.position.setY(this.camera.position.y + 0.2)
          }

        if (this.player.mode === Mode.walking || this.player.mode === Mode.sprinting) {
          return
        }
        this.velocity.y = 0
        break
      default:
        break
    }
  }

  updateFOV(target: number) {
    const camera = this.camera
    const tweenData = { fov: camera.fov }
    const tween = new Tween(tweenData)

        .to({fov: target}, 0.2 * 1000)
        .easing(Easing.Cubic.InOut)
        .onUpdate(() =>{
          camera.fov = tweenData.fov
          camera.updateProjectionMatrix()
        })
        .start();
    function animate(){
      requestAnimationFrame(animate)
      tween.update()
    }
    animate()
  }


  mousedownHandler = (e: MouseEvent) => {
    e.preventDefault()
    // let p1 = performance.now()
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera)
    const block = this.raycaster.intersectObjects(this.terrain.blocks)[0]
    const matrix = new THREE.Matrix4()

    switch (e.button) {
      // left click to remove block
      case 0:
        {
          if (block && block.object instanceof THREE.InstancedMesh) {
            // calculate position
            block.object.getMatrixAt(block.instanceId!, matrix)
            const position = new THREE.Vector3().setFromMatrixPosition(matrix)

            // don't remove bedrock
            if (
              (BlockType[block.object.name as any] as unknown as BlockType) ===
              BlockType.bedrock
            ) {
              this.terrain.generateAdjacentBlocks(position)
              return
            }

            // remove the block
            block.object.setMatrixAt(
              block.instanceId!,
              new THREE.Matrix4().set(
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
              )
            )

            // block and sound effect
            this.audio.playSound(
              BlockType[block.object.name as any] as unknown as BlockType
            )

            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(1, 1, 1),
              this.terrain.materials.get(
                this.terrain.materialType[
                parseInt(BlockType[block.object.name as any])
                ]
              )
            )
            mesh.position.set(position.x, position.y, position.z)
            this.scene.add(mesh)
            const time = performance.now()
            let raf = 0
            const animate = () => {
              if (performance.now() - time > 250) {
                this.scene.remove(mesh)
                cancelAnimationFrame(raf)
                return
              }
              raf = requestAnimationFrame(animate)
              mesh.geometry.scale(0.85, 0.85, 0.85)
            }
            animate()

            // update
            block.object.instanceMatrix.needsUpdate = true

            // check existence
            let existed = false
            for (const customBlock of this.terrain.customBlocks) {
              if (
                customBlock.x === position.x &&
                customBlock.y === position.y &&
                customBlock.z === position.z
              ) {
                existed = true
                customBlock.placed = false
              }
            }

            // add to custom blocks when it's not existed
            if (!existed) {
              this.terrain.customBlocks.push(
                new Block(
                  position.x,
                  position.y,
                  position.z,
                  BlockType[block.object.name as any] as unknown as BlockType,
                  false
                )
              )
            }

            // generate adjacent blocks
            this.terrain.generateAdjacentBlocks(position)
          }
        }
        break

      // right click to put block
      case 2:
        {
          if (block && block.object instanceof THREE.InstancedMesh) {
            // calculate normal and position
            const normal = block.face!.normal
            block.object.getMatrixAt(block.instanceId!, matrix)
            const position = new THREE.Vector3().setFromMatrixPosition(matrix)

            // return when block overlaps with player
            if (
              position.x + normal.x === Math.round(this.camera.position.x) &&
              position.z + normal.z === Math.round(this.camera.position.z) &&
              (position.y + normal.y === Math.round(this.camera.position.y) ||
                position.y + normal.y ===
                Math.round(this.camera.position.y - 1))
            ) {
              return
            }

            // put the block
            matrix.setPosition(
              normal.x + position.x,
              normal.y + position.y,
              normal.z + position.z
            )
            this.terrain.blocks[this.holdingBlock].setMatrixAt(
              this.terrain.getCount(this.holdingBlock),
              matrix
            )
            this.terrain.setCount(this.holdingBlock)

            //sound effect
            this.audio.playSound(this.holdingBlock)

            // update
            this.terrain.blocks[this.holdingBlock].instanceMatrix.needsUpdate =
              true

            // add to custom blocks
            console.log(
              normal.x + position.x,
              normal.y + position.y,
              normal.z + position.z,
            );
            this.terrain.customBlocks.push(
              new Block(
                normal.x + position.x,
                normal.y + position.y,
                normal.z + position.z,
                this.holdingBlock,
                true
              )
            )
          }
        }
        break
      default:
        break
    }

    if (!isMobile && !this.mouseHolding) {
      this.mouseHolding = true
      this.clickInterval = setInterval(() => {
        this.mousedownHandler(e)
      }, 333)
    }

    // console.log(performance.now() - p1)
  }
  mouseupHandler = () => {
    this.clickInterval && clearInterval(this.clickInterval)
    this.mouseHolding = false
  }

  changeHoldingBlockHandler = (e: KeyboardEvent) => {
    if (isNaN(parseInt(e.key)) || e.key === '0') {
      return
    }
    this.holdingIndex = parseInt(e.key) - 1

    this.holdingBlock = this.holdingBlocks[this.holdingIndex] ?? BlockType.grass
  }

  wheelHandler = (e: WheelEvent) => {
    if (!this.wheelGap) {
      this.wheelGap = true
      setTimeout(() => {
        this.wheelGap = false
      }, 100)
      if (e.deltaY > 0) {
        this.holdingIndex++
        this.holdingIndex > 9 && (this.holdingIndex = 0)
      } else if (e.deltaY < 0) {
        this.holdingIndex--
        this.holdingIndex < 0 && (this.holdingIndex = 9)
      }
      this.holdingBlock =
        this.holdingBlocks[this.holdingIndex] ?? BlockType.grass
    }
  }

  initEventListeners = () => {
    // add / remove handler when pointer lock / unlock
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) {
        document.body.addEventListener(
          'keydown',
          this.changeHoldingBlockHandler
        )
        document.body.addEventListener('wheel', this.wheelHandler)
        document.body.addEventListener('keydown', this.setMovementHandler)
        document.body.addEventListener('keyup', this.resetMovementHandler)
        document.body.addEventListener('mousedown', this.mousedownHandler)
        document.body.addEventListener('mouseup', this.mouseupHandler)
      } else {
        document.body.removeEventListener(
          'keydown',
          this.changeHoldingBlockHandler
        )
        document.body.removeEventListener('wheel', this.wheelHandler)
        document.body.removeEventListener('keydown', this.setMovementHandler)
        document.body.removeEventListener('keyup', this.resetMovementHandler)
        document.body.removeEventListener('mousedown', this.mousedownHandler)
        document.body.removeEventListener('mouseup', this.mouseupHandler)
        this.velocity = new THREE.Vector3(0, 0, 0)
      }
    })
  }

  // move along X with direction factor
  moveX(distance: number, delta: number) {
    this.camera.position.x +=
      distance * (this.player.speed / Math.PI) * 2 * delta
  }

  // move along Z with direction factor
  moveZ = (distance: number, delta: number) => {
    this.camera.position.z +=
      distance * (this.player.speed / Math.PI) * 2 * delta
  }

  // collide checking
  // collideCheckAll = (
  //   position: THREE.Vector3,
  //   noise: Noise,
  //   customBlocks: Block[],
  //   far: number
  // ) => {
  //   this.collideCheck(Side.down, position, noise, customBlocks, far)
  //   // this.collideCheck(Side.front, position, noise, customBlocks)
  //   // this.collideCheck(Side.back, position, noise, customBlocks)
  //   // this.collideCheck(Side.left, position, noise, customBlocks)
  //   // this.collideCheck(Side.right, position, noise, customBlocks)
  //   // this.collideCheck(Side.up, position, noise, customBlocks)
  // }

  collideCheckAll = (
    position: THREE.Vector3,
    noise: Noise,
    customBlocks: Block[],
    far: number = this.player.body.width / 2
  ) => {

    // console.log(position)
    const matrix = new THREE.Matrix4()
    // const geometry = new THREE.BoxGeometry(this.player.body.width, this.player.body.width, 1);
    // geometry.translate(position.x, position.y - 1, position.z)
    // const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.1 });
    // const cube = new THREE.Mesh(geometry, material);
    // this.scene.add(cube);

    //reset simulation blocks
    let index = 0
    this.tempMesh.instanceMatrix = new THREE.InstancedBufferAttribute(
      new Float32Array(100 * 16),
      16
    )

    // block to remove
    let removed = [[false, false, false], [false, false, false], [false, false, false]];
    let ledge = [[false, false, false], [false, false, false], [false, false, false]];
    let treeRemoved = new Array<boolean>(
      this.terrain.noise.treeHeight + 1
    ).fill(false)

    // get block position
    let x = Math.round(position.x)
    let z = Math.round(position.z)

    const w = this.player.body.width
    const d = this.player.body.width

    this.raycasterFront[0].ray.origin.set(position.x, position.y, position.z - d / 2);
    this.raycasterFront[1].ray.origin.set(position.x, position.y, position.z + d / 2);
    this.raycasterFront[2].ray.origin.set(position.x, position.y - 1, position.z - d / 2);
    this.raycasterFront[3].ray.origin.set(position.x, position.y - 1, position.z + d / 2);

    this.raycasterBack[0].ray.origin.set(position.x, position.y, position.z - d / 2);
    this.raycasterBack[1].ray.origin.set(position.x, position.y, position.z + d / 2);
    this.raycasterBack[2].ray.origin.set(position.x, position.y - 1, position.z - d / 2);
    this.raycasterBack[3].ray.origin.set(position.x, position.y - 1, position.z + d / 2);

    this.raycasterLeft[0].ray.origin.set(position.x + w / 2, position.y, position.z);
    this.raycasterLeft[1].ray.origin.set(position.x - w / 2, position.y, position.z);
    this.raycasterLeft[2].ray.origin.set(position.x + w / 2, position.y - 1, position.z);
    this.raycasterLeft[3].ray.origin.set(position.x - w / 2, position.y - 1, position.z);

    this.raycasterRight[0].ray.origin.set(position.x + w / 2, position.y, position.z);
    this.raycasterRight[1].ray.origin.set(position.x - w / 2, position.y, position.z);
    this.raycasterRight[2].ray.origin.set(position.x + w / 2, position.y - 1, position.z);
    this.raycasterRight[3].ray.origin.set(position.x - w / 2, position.y - 1, position.z);

    this.raycasterUp[0].ray.origin.set(position.x - w / 2, position.y - 1, position.z - d / 2)
    this.raycasterUp[1].ray.origin.set(position.x + w / 2, position.y - 1, position.z - d / 2)
    this.raycasterUp[2].ray.origin.set(position.x - w / 2, position.y - 1, position.z + d / 2)
    this.raycasterUp[3].ray.origin.set(position.x + w / 2, position.y - 1, position.z + d / 2)

    this.raycasterDown[0].ray.origin.set(position.x - w / 2, position.y, position.z - d / 2)
    this.raycasterDown[1].ray.origin.set(position.x + w / 2, position.y, position.z - d / 2)
    this.raycasterDown[2].ray.origin.set(position.x - w / 2, position.y, position.z + d / 2)
    this.raycasterDown[3].ray.origin.set(position.x + w / 2, position.y, position.z + d / 2)

    for (const r of this.raycasterDown) {
      r.far = far
    }

    // check custom blocks
    for (const block of customBlocks) {
      if (Math.abs(block.x - x) <= 1 && Math.abs(block.z - z) <= 1 && Math.abs(block.y - Math.round(position.y)) <= 3) {

        const y =
          Math.floor(
            noise.get(block.x / noise.gap, block.z / noise.gap, noise.seed) * noise.amp
          ) + 30

        if (block.placed) {
          // placed blocks
          matrix.setPosition(block.x, block.y, block.z)
          this.tempMesh.setMatrixAt(index++, matrix)
          if (block.y == Math.round(position.y) || block.y == Math.round(position.y - 1) || block.y == Math.round(position.y - 2)) {
            ledge[block.x - x + 1][block.y - y + 1] = true;
          }
        } else if (block.y === y) {
          // removed blocks
          removed[block.x - x + 1][block.z - z + 1] = true
        } else {
          for (let i = 1; i <= this.terrain.noise.treeHeight; i++) {
            if (block.y === y + i) {
              treeRemoved[i] = true
            }
          }
        }
      }
    }
    for (let dx = -1; dx <= 1; ++dx) {
      for (let dz = -1; dz <= 1; ++dz) {
        const y = Math.floor(noise.get((x + dx) / noise.gap, (z + dz) / noise.gap, noise.seed) * noise.amp) + 30
        if (!removed[dx + 1][dz + 1]) {
          matrix.setPosition(x + dx, y, z + dz)
          this.tempMesh.setMatrixAt(index++, matrix)
          if (y == Math.round(position.y) || y == Math.round(position.y - 1) || y == Math.round(position.y - 2)) {
            ledge[dx + 1][dz + 1] = true;
          }
        }
      }
    }
    let y = Math.floor(noise.get(x / noise.gap, z / noise.gap, noise.seed) * noise.amp) + 30

    // update simulation blocks (ignore removed blocks)
    for (let i = 1; i <= this.terrain.noise.treeHeight; i++) {
      if (!treeRemoved[i]) {
        let treeOffset =
          noise.get(x / noise.treeGap, z / noise.treeGap, noise.treeSeed) *
          noise.treeAmp

        let stoneOffset =
          noise.get(x / noise.stoneGap, z / noise.stoneGap, noise.stoneSeed) *
          noise.stoneAmp

        if (
          treeOffset > noise.treeThreshold &&
          y >= 27 &&
          stoneOffset < noise.stoneThreshold
        ) {
          matrix.setPosition(x, y + i, z)
          this.tempMesh.setMatrixAt(index++, matrix)
          if (y + i == Math.round(position.y) || y + i == Math.round(position.y - 1) || y + i == Math.round(position.y - 2)) {
            // ledge[0][0] = true;
          }
        }
      }
    }

    this.tempMesh.instanceMatrix.needsUpdate = true


    // update collide
    // const origin = new THREE.Vector3(position.x, position.y - 1, position.z)
    this.downCollide = false;
    const st = new Set<number>();
    for (let i = 0; i < 4; ++i) {
      const r = this.raycasterDown[i];
      if (r.intersectObject(this.tempMesh).length > 0) {
        this.downCollide = true;
      }
      else {
        st.add(i);
      }
    }
    if (this.player.mode == Mode.sneaking && !this.isJumping) {
      const shiftDelta = 0.05
      if (st.has(0)) {
        matrix.setPosition(Math.round(this.raycasterDown[0].ray.origin.x) - 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[0].ray.origin.z) - 1 * (w - shiftDelta))
        this.tempMesh.setMatrixAt(index++, matrix)

        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // geometry.translate(Math.round(this.raycasterDown[0].ray.origin.x) - 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[0].ray.origin.z) - 1 * (w - shiftDelta))
        // const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.1 });
        // const cube = new THREE.Mesh(geometry, material);
        // this.scene.add(cube);
      }
      if (st.has(1)) {
        matrix.setPosition(Math.round(this.raycasterDown[1].ray.origin.x) + 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[1].ray.origin.z) - 1 * (w - shiftDelta))
        this.tempMesh.setMatrixAt(index++, matrix)
        // // matrix.setPosition(x + 1 * (w - 0.04) / 2, Math.floor(this.camera.position.y - 1), z - 1 * (w - 0.04) / 2)
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // geometry.translate(Math.round(this.raycasterDown[1].ray.origin.x) + 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[1].ray.origin.z) - 1 * (w - shiftDelta))
        // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.1 });
        // const cube = new THREE.Mesh(geometry, material);
        // this.scene.add(cube);
      }
      if (st.has(2)) {
        matrix.setPosition(Math.round(this.raycasterDown[2].ray.origin.x) - 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[2].ray.origin.z) + 1 * (w - shiftDelta))
        this.tempMesh.setMatrixAt(index++, matrix)
        // // matrix.setPosition(x - 1 * (w - 0.04) / 2, Math.floor(this.camera.position.y - 1), z + 1 * (w - 0.04) / 2)
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // geometry.translate(Math.round(this.raycasterDown[2].ray.origin.x) - 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[2].ray.origin.z) + 1 * (w - shiftDelta))
        // const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.1 });
        // const cube = new THREE.Mesh(geometry, material);
        // this.scene.add(cube);
      }
      if (st.has(3)) {
        matrix.setPosition(Math.round(this.raycasterDown[3].ray.origin.x) + 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[3].ray.origin.z) + 1 * (w - shiftDelta))
        this.tempMesh.setMatrixAt(index++, matrix)
        // // matrix.setPosition(x + 1 * (w - 0.04) / 2, Math.floor(this.camera.position.y - 1), z + 1 * (w - 0.04) / 2)
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // geometry.translate(Math.round(this.raycasterDown[3].ray.origin.x) + 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round(this.raycasterDown[3].ray.origin.z) + 1 * (w - shiftDelta))
        // const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.1 });
        // const cube = new THREE.Mesh(geometry, material);
        // this.scene.add(cube);
      }

      if (st.has(0) && st.has(1)) {
        matrix.setPosition(Math.round((this.raycasterDown[1].ray.origin.x + this.raycasterDown[0].ray.origin.x)/2), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[1].ray.origin.z + this.raycasterDown[0].ray.origin.z)/2) - 1 * (w - shiftDelta))
        this.tempMesh.setMatrixAt(index++, matrix)
      //   const geometry = new THREE.BoxGeometry(1, 1, 1);
      //   geometry.translate(Math.round((this.raycasterDown[1].ray.origin.x + this.raycasterDown[0].ray.origin.x)/2), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[1].ray.origin.z + this.raycasterDown[0].ray.origin.z)/2) - 1 * (w - shiftDelta))
      //   const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.1 });
      //   const cube = new THREE.Mesh(geometry, material);
      //   this.scene.add(cube);
      }
      if (st.has(1) && st.has(3)) {
        matrix.setPosition(Math.round((this.raycasterDown[1].ray.origin.x + this.raycasterDown[3].ray.origin.x)/2) + 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[1].ray.origin.z + this.raycasterDown[3].ray.origin.z)/2))
        this.tempMesh.setMatrixAt(index++, matrix)
        // // matrix.setPosition(x + 1 * (w - 0.04) / 2, Math.floor(this.camera.position.y - 1), z - 1 * (w - 0.04) / 2)
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // geometry.translate(Math.round((this.raycasterDown[1].ray.origin.x + this.raycasterDown[3].ray.origin.x)/2) + 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[1].ray.origin.z + this.raycasterDown[3].ray.origin.z)/2))
        // const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.1 });
        // const cube = new THREE.Mesh(geometry, material);
        // this.scene.add(cube);
      }
      if (st.has(2) && st.has(3)) {
        matrix.setPosition(Math.round((this.raycasterDown[2].ray.origin.x + this.raycasterDown[3].ray.origin.x)/2), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[2].ray.origin.z + this.raycasterDown[3].ray.origin.z)/2) + 1 * (w - shiftDelta))
        this.tempMesh.setMatrixAt(index++, matrix)
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
      //   // matrix.setPosition(x - 1 * (w - 0.04) / 2, Math.floor(this.camera.position.y - 1), z + 1 * (w - 0.04) / 2)
      //   geometry.translate(Math.round((this.raycasterDown[2].ray.origin.x + this.raycasterDown[3].ray.origin.x)/2), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[2].ray.origin.z + this.raycasterDown[3].ray.origin.z)/2) + 1 * (w - shiftDelta))
      //   const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.1 });
      //   const cube = new THREE.Mesh(geometry, material);
      //   this.scene.add(cube);
      }
      if (st.has(2) && st.has(0)) {
        matrix.setPosition(Math.round((this.raycasterDown[2].ray.origin.x + this.raycasterDown[0].ray.origin.x)/2) - 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[2].ray.origin.z + this.raycasterDown[0].ray.origin.z)/2))
        this.tempMesh.setMatrixAt(index++, matrix)
        // // matrix.setPosition(x + 1 * (w - 0.04) / 2, Math.floor(this.camera.position.y - 1), z + 1 * (w - 0.04) / 2)
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // geometry.translate(Math.round((this.raycasterDown[2].ray.origin.x + this.raycasterDown[0].ray.origin.x)/2) - 1 * (w - shiftDelta), Math.floor(this.camera.position.y), Math.round((this.raycasterDown[2].ray.origin.z + this.raycasterDown[0].ray.origin.z)/2))
        // const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.1 });
        // const cube = new THREE.Mesh(geometry, material);
        // this.scene.add(cube);
      }
      // for (let dx = -1; dx <= 1; ++dx) {
      //   for (let dz = -1; dz <= 1; ++dz) {
      //     if (dz == 0 && dx == 0) {
      //       continue;
      //     }
      //     if (!ledge[dx + 1][dz + 1]) {
      //       matrix.setPosition(x + dx + dx * (w - 0.04) / 2, Math.floor(this.camera.position.y - 1), z + dz + dz * (w - 0.04) / 2)
      //       // matrix.setPosition(x + dx, Math.floor(this.camera.position.y - 1), z + dz)
      //       this.tempmesh.setmatrixat(index++, matrix)
      //     }
      //   }
      // }
    }
    this.frontCollide = false;
    for (const r of this.raycasterFront) {
      if (r.intersectObject(this.tempMesh).length > 0) {
        this.frontCollide = true;
        break; // Exit the loop once we detect a collision
      }
    }
    this.backCollide = false;
    for (const r of this.raycasterBack) {
      if (r.intersectObject(this.tempMesh).length > 0) {
        this.backCollide = true;
        break; // Exit the loop once we detect a collision
      }
    }
    this.leftCollide = false;
    for (const r of this.raycasterLeft) {
      if (r.intersectObject(this.tempMesh).length > 0) {
        this.leftCollide = true;
        break; // Exit the loop once we detect a collision
      }
    }
    this.rightCollide = false;
    for (const r of this.raycasterRight) {
      if (r.intersectObject(this.tempMesh).length > 0) {
        this.rightCollide = true;
        break; // Exit the loop once we detect a collision
      }
    }
    this.upCollide = false;
    for (const r of this.raycasterUp) {
      if (r.intersectObject(this.tempMesh).length > 0) {
        this.upCollide = true;
        break; // Exit the loop once we detect a collision
      }
    }
  }

  update = () => {
    this.p1 = performance.now()
    const delta = (this.p1 - this.p2) / 1000
    if (
      // dev mode
      this.player.mode === Mode.flying
    ) {
      this.control.moveForward(this.velocity.x * delta)
      this.control.moveRight(this.velocity.z * delta)
      this.camera.position.y += this.velocity.y * delta
    } else {
      // normal mode
      this.collideCheckAll(
        this.camera.position,
        this.terrain.noise,
        this.terrain.customBlocks,
        this.far - this.velocity.y * delta
      )

      // gravity
      if (Math.abs(this.velocity.y) < this.player.falling) {
        this.velocity.y -= 25 * delta
      }

      // up collide handler
      if (this.upCollide) {
        this.velocity.y = -225 * delta
        this.far = this.player.body.height
      }

      // down collide and jump handler
      if (this.downCollide && !this.isJumping) {
        this.velocity.y = 0
        // console.log("downcollide and not jumping");
      } else if (this.downCollide && this.isJumping) {
        this.isJumping = false
      }

      // side collide handler
      let vector = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.camera.quaternion
      )
      let direction = Math.atan2(vector.x, vector.z)
      if (
        this.frontCollide ||
        this.backCollide ||
        this.leftCollide ||
        this.rightCollide
      ) {
        // collide front (positive x)
        if (this.frontCollide) {
          // camera front
          if (direction < Math.PI && direction > 0 && this.velocity.x > 0) {
            if (
              (!this.leftCollide && direction > Math.PI / 2) ||
              (!this.rightCollide && direction < Math.PI / 2)
            ) {
              this.moveZ(Math.PI / 2 - direction, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera back
          if (direction < 0 && direction > -Math.PI && this.velocity.x < 0) {
            if (
              (!this.leftCollide && direction > -Math.PI / 2) ||
              (!this.rightCollide && direction < -Math.PI / 2)
            ) {
              this.moveZ(-Math.PI / 2 - direction, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera left
          if (
            direction < Math.PI / 2 &&
            direction > -Math.PI / 2 &&
            this.velocity.z < 0
          ) {
            if (
              (!this.rightCollide && direction < 0) ||
              (!this.leftCollide && direction > 0)
            ) {
              this.moveZ(-direction, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }

          // camera right
          if (
            (direction < -Math.PI / 2 || direction > Math.PI / 2) &&
            this.velocity.z > 0
          ) {
            if (!this.rightCollide && direction > 0) {
              this.moveZ(Math.PI - direction, delta)
            }
            if (!this.leftCollide && direction < 0) {
              this.moveZ(-Math.PI - direction, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }
        }

        // collide back (negative x)
        if (this.backCollide) {
          // camera front
          if (direction < 0 && direction > -Math.PI && this.velocity.x > 0) {
            if (
              (!this.leftCollide && direction < -Math.PI / 2) ||
              (!this.rightCollide && direction > -Math.PI / 2)
            ) {
              this.moveZ(Math.PI / 2 + direction, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera back
          if (direction < Math.PI && direction > 0 && this.velocity.x < 0) {
            if (
              (!this.leftCollide && direction < Math.PI / 2) ||
              (!this.rightCollide && direction > Math.PI / 2)
            ) {
              this.moveZ(direction - Math.PI / 2, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera left
          if (
            (direction < -Math.PI / 2 || direction > Math.PI / 2) &&
            this.velocity.z < 0
          ) {
            if (!this.leftCollide && direction > 0) {
              this.moveZ(-Math.PI + direction, delta)
            }
            if (!this.rightCollide && direction < 0) {
              this.moveZ(Math.PI + direction, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }

          // camera right
          if (
            direction < Math.PI / 2 &&
            direction > -Math.PI / 2 &&
            this.velocity.z > 0
          ) {
            if (
              (!this.leftCollide && direction < 0) ||
              (!this.rightCollide && direction > 0)
            ) {
              this.moveZ(direction, delta)
            }
          } else if (
            !this.leftCollide &&
            !this.rightCollide &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }
        }

        // collide left (negative z)
        if (this.leftCollide) {
          // camera front
          if (
            (direction < -Math.PI / 2 || direction > Math.PI / 2) &&
            this.velocity.x > 0
          ) {
            if (!this.frontCollide && direction > 0) {
              this.moveX(Math.PI - direction, delta)
            }
            if (!this.backCollide && direction < 0) {
              this.moveX(-Math.PI - direction, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.frontCollide &&
            direction < 0 &&
            direction > -Math.PI / 2 &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.backCollide &&
            direction < Math.PI / 2 &&
            direction > 0 &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera back
          if (
            direction < Math.PI / 2 &&
            direction > -Math.PI / 2 &&
            this.velocity.x < 0
          ) {
            if (
              (!this.frontCollide && direction < 0) ||
              (!this.backCollide && direction > 0)
            ) {
              this.moveX(-direction, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.frontCollide &&
            direction < Math.PI &&
            direction > Math.PI / 2 &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.backCollide &&
            direction > -Math.PI &&
            direction < -Math.PI / 2 &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera left
          if (direction > 0 && direction < Math.PI && this.velocity.z < 0) {
            if (
              (!this.backCollide && direction > Math.PI / 2) ||
              (!this.frontCollide && direction < Math.PI / 2)
            ) {
              this.moveX(Math.PI / 2 - direction, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.frontCollide &&
            direction > -Math.PI &&
            direction < -Math.PI / 2 &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.backCollide &&
            direction > -Math.PI / 2 &&
            direction < 0 &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }

          // camera right
          if (direction < 0 && direction > -Math.PI && this.velocity.z > 0) {
            if (
              (!this.backCollide && direction > -Math.PI / 2) ||
              (!this.frontCollide && direction < -Math.PI / 2)
            ) {
              this.moveX(-Math.PI / 2 - direction, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.frontCollide &&
            direction < Math.PI / 2 &&
            direction > 0 &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.backCollide &&
            direction < Math.PI &&
            direction > Math.PI / 2 &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }
        }

        // collide right (positive z)
        if (this.rightCollide) {
          // camera front
          if (
            direction < Math.PI / 2 &&
            direction > -Math.PI / 2 &&
            this.velocity.x > 0
          ) {
            if (
              (!this.backCollide && direction < 0) ||
              (!this.frontCollide && direction > 0)
            ) {
              this.moveX(direction, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.frontCollide &&
            direction < -Math.PI / 2 &&
            direction > -Math.PI &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.backCollide &&
            direction < Math.PI &&
            direction > Math.PI / 2 &&
            this.velocity.x > 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera back
          if (
            (direction < -Math.PI / 2 || direction > Math.PI / 2) &&
            this.velocity.x < 0
          ) {
            if (!this.backCollide && direction > 0) {
              this.moveX(-Math.PI + direction, delta)
            }
            if (!this.frontCollide && direction < 0) {
              this.moveX(Math.PI + direction, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.frontCollide &&
            direction < Math.PI / 2 &&
            direction > 0 &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          } else if (
            this.backCollide &&
            direction < 0 &&
            direction > -Math.PI / 2 &&
            this.velocity.x < 0
          ) {
            this.control.moveForward(this.velocity.x * delta)
          }

          // camera left
          if (direction < 0 && direction > -Math.PI && this.velocity.z < 0) {
            if (
              (!this.frontCollide && direction > -Math.PI / 2) ||
              (!this.backCollide && direction < -Math.PI / 2)
            ) {
              this.moveX(Math.PI / 2 + direction, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.frontCollide &&
            direction > Math.PI / 2 &&
            direction < Math.PI &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.backCollide &&
            direction > 0 &&
            direction < Math.PI / 2 &&
            this.velocity.z < 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }

          // camera right
          if (direction > 0 && direction < Math.PI && this.velocity.z > 0) {
            if (
              (!this.frontCollide && direction > Math.PI / 2) ||
              (!this.backCollide && direction < Math.PI / 2)
            ) {
              this.moveX(direction - Math.PI / 2, delta)
            }
          } else if (
            !this.frontCollide &&
            !this.backCollide &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.frontCollide &&
            direction > -Math.PI / 2 &&
            direction < 0 &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          } else if (
            this.backCollide &&
            direction > -Math.PI &&
            direction < -Math.PI / 2 &&
            this.velocity.z > 0
          ) {
            this.control.moveRight(this.velocity.z * delta)
          }
        }
      } else {
        // no collide
        this.control.moveForward(this.velocity.x * delta)
        this.control.moveRight(this.velocity.z * delta)
      }

      this.camera.position.y += this.velocity.y * delta

      // catching net
      if (this.camera.position.y < -100) {
        this.camera.position.y = 60
      }
    }
    this.p2 = this.p1
  }
}
