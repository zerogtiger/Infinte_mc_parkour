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

  toRemove: { x: number, y: number, z: number }[] = [];

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

      // if jump is impossible, fill in blocks
      if (this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z + deltaZ) + 3 - this.lastPosGen.y >= 2) {
        for (var i = 1; i < deltaX; ++i) {
          this.mapOfCoords.set(`${this.lastPosGen.x + i},${this.lastPosGen.z + Math.floor(i / deltaX * deltaZ)}`, this.getY(this.lastPosGen.x + i, this.lastPosGen.z + Math.floor(i / deltaX * deltaZ)) + 3)
        }
      }
      else if (deltaX == 4 && this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z) + 3 - this.lastPosGen.y >= 1) {
        this.mapOfCoords.set(`${this.lastPosGen.x + 3},${this.lastPosGen.z + deltaZ}`, this.getY(this.lastPosGen.x + 3, this.lastPosGen.z + deltaZ) + 3)
      }
      // console.log(this.lastPosGen.x + gap);
      this.mapOfCoords.set(`${this.lastPosGen.x + deltaX},${this.lastPosGen.z + deltaZ}`, this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z + deltaZ) + 3)
      this.lastPosGen = { x: this.lastPosGen.x + deltaX, y: this.getY(this.lastPosGen.x + deltaX, this.lastPosGen.z + deltaZ) + 3, z: this.lastPosGen.z + deltaZ }

      // tree detection
      for (var i = 0; i < deltaX; ++i) {
        const currX = this.lastPosGen.x + i;
        const currY = this.getY(this.lastPosGen.x + i, this.lastPosGen.z + Math.floor(i / deltaX * deltaZ)) + 3;
        const currZ = this.lastPosGen.z + Math.floor(i / deltaX * deltaZ);
        const currZZ = this.lastPosGen.z + Math.ceil(i / deltaX * deltaZ);

        const treeOffsetz =
          this.noise.get(currX / this.noise.treeGap, currZ / this.noise.treeGap, this.noise.treeSeed) *
          this.noise.treeAmp
        const stoneOffsetz =
          this.noise.get(currX / this.noise.stoneGap, currZ / this.noise.stoneGap, this.noise.stoneSeed) *
          this.noise.stoneAmp

        const treeOffsetZZ =
          this.noise.get(currX / this.noise.treeGap, currZZ / this.noise.treeGap, this.noise.treeSeed) *
          this.noise.treeAmp
        const stoneOffsetZZ =
          this.noise.get(currX / this.noise.stoneGap, currZZ / this.noise.stoneGap, this.noise.stoneSeed) *
          this.noise.stoneAmp

        if (
          treeOffsetz > this.noise.treeThreshold &&
          currY - 30 >= -3 &&
          stoneOffsetz < this.noise.stoneThreshold
        ) {

          this.toRemove.push({ x: currX, y: currY, z: currZ });
          this.toRemove.push({ x: currX, y: currY + 1, z: currZ });
          this.toRemove.push({ x: currX, y: currY + 2, z: currZ });
          this.toRemove.push({ x: currX, y: currY + 3, z: currZ });

          // leaf
          // for (let i = -3; i < 3; i++) {
          //   for (let j = -3; j < 3; j++) {
          //     for (let k = -3; k < 3; k++) {
          //       if (i === 0 && k === 0) {
          //         continue
          //       }
          //       const leafOffset =
          //         this.noise.get(
          //           (x + i + j) / this.noise.leafGap,
          //           (z + k) / this.noise.leafGap,
          //           this.noise.leafSeed
          //         ) * this.noise.leafAmp
          //       if (leafOffset > this.noise.leafThreshold) {
          //         idMap.set(
          //           `${x + i}_${y + yOffset + noise.treeHeight + j}_${z + k}`,
          //           blocksCount[BlockType.leaf]
          //         )
          //         matrix.setPosition(
          //           x + i,
          //           y + yOffset + noise.treeHeight + j,
          //           z + k
          //         )
          //         blocks[BlockType.leaf].setMatrixAt(
          //           blocksCount[BlockType.leaf]++,
          //           matrix
          //         )
          //       }
          //     }
          //   }
          // }
        }
        if (
          treeOffsetZZ > this.noise.treeThreshold &&
          currY - 30 >= -3 &&
          stoneOffsetZZ < this.noise.stoneThreshold
        ) {

          this.toRemove.push({ x: currX, y: currY, z: currZZ });
          this.toRemove.push({ x: currX, y: currY + 1, z: currZZ });
          this.toRemove.push({ x: currX, y: currY + 2, z: currZZ });
          this.toRemove.push({ x: currX, y: currY + 3, z: currZZ });
        }
      }
    }


    // retrieve data
    if (this.mapOfCoords.has(`${x},${z}`)) {
      console.log(this.mapOfCoords);
      let ret: number = this.mapOfCoords.get(`${x},${z}`)!
      this.mapOfCoords.delete(`${x},${z}`);
      return ret;
    }
    return -1;
  }

}
