import { BlockType } from "..";
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

  toRemove: { x: number, y: number, z: number, type: BlockType }[] = [];

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
        console.log(currZ);
        console.log(currZZ);

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
          currY - 3 - 30 >= -3 &&
          stoneOffsetz < this.noise.stoneThreshold
        ) {

          this.toRemove.push({ x: currX, y: currY, z: currZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 1, z: currZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 2, z: currZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 3, z: currZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 4, z: currZ, type: BlockType.tree });

          for (let j = 0; j <= 4; ++j) {
            // const leafOffset =
            //   this.noise.get(
            //     (currX + j + 3) / this.noise.leafGap,
            //     (currZ) / this.noise.leafGap,
            //     this.noise.leafSeed
            //   ) * this.noise.leafAmp
            // if (leafOffset > this.noise.leafThreshold) {
            // idMap.set(
            //   `${x + i}_${y + yOffset + noise.treeHeight + j}_${z + k}`,
            //   blocksCount[BlockType.leaf]
            // )
            this.toRemove.push({
              x: currX,
              y: currY + j,
              z: currZ,
              type: BlockType.leaf
            })
            // blocks[BlockType.leaf].setMatrixAt(
            //   blocksCount[BlockType.leaf]++,
            //   matrix
            // )
            // }
          }
          if (currZ !== currZZ) {
            for (let j = 0; j <= 4; ++j) {
              // const leafOffset =
              //   this.noise.get(
              //     (currX + j + 3) / this.noise.leafGap,
              //     (currZZ) / this.noise.leafGap,
              //     this.noise.leafSeed
              //   ) * this.noise.leafAmp
              // if (leafOffset > this.noise.leafThreshold) {
              // idMap.set(
              //   `${x + i}_${y + yOffset + noise.treeHeight + j}_${z + k}`,
              //   blocksCount[BlockType.leaf]
              // )
              this.toRemove.push({
                x: currX,
                y: currY + j,
                z: currZZ,
                type: BlockType.leaf
              })
              // blocks[BlockType.leaf].setMatrixAt(
              //   blocksCount[BlockType.leaf]++,
              //   matrix
              // )
              // }
            }
          }
        }
        if (
          currZ != currZZ &&
          treeOffsetZZ > this.noise.treeThreshold &&
          currY - 30 - 3 >= -3 &&
          stoneOffsetZZ < this.noise.stoneThreshold
        ) {
          this.toRemove.push({ x: currX, y: currY, z: currZZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 1, z: currZZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 2, z: currZZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 3, z: currZZ, type: BlockType.tree });
          this.toRemove.push({ x: currX, y: currY + 4, z: currZZ, type: BlockType.tree });
        }
      }
    }

    // retrieve data
    if (this.mapOfCoords.has(`${x},${z}`)) {
      let ret: number = this.mapOfCoords.get(`${x},${z}`)!
      this.mapOfCoords.delete(`${x},${z}`);
      return ret;
    }
    return -1;
  }

}
