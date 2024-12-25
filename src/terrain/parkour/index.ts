import Noise from "../noise";

enum direction {
  left_small, left_large, right_small, right_large, forward
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
      if (this.currDirCount < 0) {
        const newD = getRandom(0, 4);
        switch (newD) {
          case 0:
            this.currDirection = direction.left_small;
            break;
          case 1:
            this.currDirection = direction.left_large;
            break;
          case 2:
            this.currDirection = direction.right_small;
            break;
          case 3:
            this.currDirection = direction.right_large;
            break;
          case 4:
            this.currDirection = direction.forward;
            break;
        }
        this.currDirCount = getRandom(10, 20);
      }
      // continue to proceed in current direction
      let deltaX, deltaZ: number;
      switch (this.currDirection) {
        case direction.forward:
          deltaX = getRandom(3, 4);
          deltaZ = 0;
          break;
        case direction.left_small:
          deltaX = 3
          deltaZ = -1;
          break;
        case direction.left_large:
          deltaX = getRandom(2, 3);
          deltaZ = -2;
          break;
        case direction.right_small:
          deltaX = 3
          deltaZ = 1;
          break;
        case direction.right_large:
          deltaX = getRandom(2, 3);
          deltaZ = 2;
          break;
      }
      this.currDirCount--;
      // if (this.currDirection == direction.forward) {
      // let gap = getRandom(3, 4);

      // if jump is impossible, fill in blocks
      if (this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z + deltaZ) + 3 - this.lastPosGen.y >= 2) {
        for (var i = 1; i < deltaX; ++i) {
          this.mapOfCoords.set(`${this.lastPosGen.x + i},${this.lastPosGen.z + Math.floor(i/deltaX * deltaZ)}`, this.getY(this.lastPosGen.x + i, this.lastPosGen.z + Math.floor(i/deltaX * deltaZ)) + 3)
        }
      }
      else if (deltaX == 4 && this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z) + 3 - this.lastPosGen.y >= 1) {
        this.mapOfCoords.set(`${this.lastPosGen.x + 3},${this.lastPosGen.z + deltaZ}`, this.getY(this.lastPosGen.x + 3, this.lastPosGen.z + deltaZ) + 3)
      }
      // console.log(this.lastPosGen.x + gap);
      this.mapOfCoords.set(`${this.lastPosGen.x + deltaX},${this.lastPosGen.z + deltaZ}`, this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z + deltaZ) + 3)
      this.lastPosGen = { x: this.lastPosGen.x + deltaX, y: this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z + deltaZ) + 3, z: this.lastPosGen.z + deltaZ }
    }
    if (this.mapOfCoords.has(`${x},${z}`)) {
      console.log(this.mapOfCoords);
      let ret: number = this.mapOfCoords.get(`${x},${z}`)!
      this.mapOfCoords.delete(`${x},${z}`);
      return ret;
    }
    return -1;
  }

}
