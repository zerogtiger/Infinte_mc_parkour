export enum Mode {
  walking = 'walking',
  sprinting = 'sprinting',
  sneaking = 'sneaking',
  flying = 'flying'

}

export enum Speed {
  walking = 4.317,
  sprinting = 5.612,
  sneaking = 1.295,
  flying = 21.78

}
export default class Player {
  mode = Mode.walking
  speed = Speed[this.mode]

  setMode(Mode: Mode) {
    this.mode = Mode
    this.speed = Speed[this.mode]
  }
  falling = 38.4

  jump = 1.2522

  body = {
    height: 1.8,
    width: 0.5
  }
}