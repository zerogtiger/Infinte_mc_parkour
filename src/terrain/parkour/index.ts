import Noise from "../noise";

enum direction {
  left_small, left_large, left, right_small, right_large, right, forward
}

const getRandom = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default class Parkour {

  lastPosGen: { x: number, y: number, z: number };
  mapOfCoords = new Map<string, number>();

  currDirection = direction.forward;
  currDirCount = -1;
  noise: Noise;

  constructor(noise: Noise, start_x: number, start_z: number) {
    this.noise = noise;
    this.lastPosGen = { x: start_x, y: this.getY(start_x, start_z) + 3, z: start_z }
    this.mapOfCoords.set(`${this.lastPosGen.x},${this.lastPosGen.z}`, this.getY(this.lastPosGen.x, this.lastPosGen.z) + 3)
  }

  getY = (x: number, z: number) => {
    return 30 + Math.floor(
      this.noise.get(x / this.noise.gap, z / this.noise.gap, this.noise.seed) * this.noise.amp
    )
  }

  get = (x: number, z: number) => {
    // requires further generation
    while (this.lastPosGen.x <= x) {
      // if (this.currDirCount > 0) { // continue to proceed in current direction
      // if (this.currDirection == direction.forward) {
      let gap = getRandom(3, 4);

      // if jump is impossible, fill in blocks
      if (this.getY(this.lastPosGen.x + gap, this.lastPosGen.z) + 3 - this.lastPosGen.y >= 2) {
        for (var i = 1; i < gap; ++i) {
          this.mapOfCoords.set(`${this.lastPosGen.x + i},${this.lastPosGen.z}`, this.getY(this.lastPosGen.x + i, this.lastPosGen.z) + 3)
        }
      }
      // console.log(this.lastPosGen.x + gap);
      this.mapOfCoords.set(`${this.lastPosGen.x + gap},${this.lastPosGen.z}`, this.getY(this.lastPosGen.x + gap, this.lastPosGen.z) + 3)
      this.lastPosGen = { x: this.lastPosGen.x + gap, y: this.getY(this.lastPosGen.x + gap, this.lastPosGen.z) + 3, z: this.lastPosGen.z }
    }
    if (this.mapOfCoords.has(`${x},${z}`)) {
      console.log(this.mapOfCoords);
      let ret: number = this.mapOfCoords.get(`${x},${z}`)!
      // this.mapOfCoords.delete(`${x},${z}`);
      return ret;
    }
    return -1;
  }

}
