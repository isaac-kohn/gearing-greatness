import { createBaseCurve, type BaseCurve } from "./baseCurve";
import {
  arrayBinarySearch,
  discretePolarArrayToPolarParameterization,
  discretizePolarParamaterization,
  tangentAtIndexOfVertexArray,
  type PolarParamaterization,
} from "./calc";
import {
  createConjugatePitchCurve,
  createPitchCurveFromPolarParam,
  findConjugateCenterDistance,
  type PitchCurve,
} from "./pitchCurve";
import { createPolygonalLoop, type PolygonalLoop } from "./polygonalLoop";
import {
  add,
  createOrientation,
  distance,
  getAngle,
  normalizeAngle,
  normalizeVector,
  perp,
  polarToVertex,
  scale,
  setMagnitude,
  sub,
  vertexLineHandedness,
  vertexToPolar,
  type Line,
  type Orientation,
  type PolarVector,
  type Vector2d,
} from "./vector";

export interface ToothRoot {
  index: number;
  vertex: Vector2d;
  normalLine: Line;
}

export interface ToothFlank {
  root: ToothRoot;
  tip: Vector2d[];
  base: Vector2d[];
}

export interface Gear {
  pitchCurve: PitchCurve;
  pressureAngle: number;
  numTeeth: number;
  addendum: number;
  dedendum: number;
  addendumFn: PolarParamaterization;
  // the t such that pitchCurve.fn(t) gives the point at which each tooth intersects the pitch curve
  toothRoots: ToothRoot[];
  fwdFlanks: ToothFlank[];
  bwdFlanks: ToothFlank[];
  // like for pitch curve, the polygonal loops are used for rendering, while the paramaterizations are used for high fidelity geometry computation
  polyAddendum: PolygonalLoop;
  polyDedendum: PolygonalLoop;
  fwdBaseCurve: BaseCurve;
  bwdBaseCurve: BaseCurve;
  fidelity: number;
  renderFidelity: number;
  renderMode: "default" | "skeleton";
  orientation: Orientation;
  // single conjugate partner, if any
  conjugate: Gear | null;
  setDirection: (angle: number) => void;
  setDirectionIndividually: (angle: number) => void;
  getDirection: () => number;
  getCenter: () => Vector2d;
  setCenter: (v: Vector2d) => void;
}

const generateDedendumFn = (
  pitchCurve: PitchCurve,
  pressureAngle: number,
): PolygonalLoop => {
  const fidelity = pitchCurve.fidelity;
  const pitchVertices = pitchCurve.fidelicDiscreteLoop.vertices;
  const vertexArray = pitchVertices.map((vertex, i) => {
    const curvature = Math.abs(
      pitchCurve.fidelicDiscreteLoop.curvatureAtIndex(i),
    );
    const tang = tangentAtIndexOfVertexArray(pitchVertices, i);
    const pitchRadius = curvature === 0 ? Infinity : 1 / curvature;
    const offsetMag = Math.min(pitchRadius, 1000) * Math.sin(pressureAngle);
    const offsetDir = getAngle(tang) + pressureAngle;
    const polarOffset: PolarVector = { mag: offsetMag, angle: offsetDir };
    return add(polarToVertex(polarOffset), vertex);
  });
  const polarArray: PolarVector[] = vertexArray.map(vertexToPolar);
  return createPolygonalLoop(polarArray);
};

const generateAdendumFn = (
  pitchCurve: PitchCurve,
  addendum: number,
): PolarParamaterization => {
  const fidelity = pitchCurve.fidelity;
  const minDom = pitchCurve.polarParamaterization.domainMin;
  const maxDom = pitchCurve.polarParamaterization.domainMax;
  const vertexArray: Vector2d[] = [];
  for (let i = 0; i < fidelity; i++) {
    const sampleParam = minDom + (i * (maxDom - minDom)) / fidelity;
    const v0 = polarToVertex(pitchCurve.polarParamaterization.fn(sampleParam));
    const v1 = polarToVertex(
      pitchCurve.polarParamaterization.fn(
        i + 1 === fidelity ? 0 : sampleParam + 1 / fidelity,
      ),
    );
    const tangent = sub(v1, v0);
    const normal = normalizeVector(perp(tangent));
    vertexArray.push(add(v0, scale(normal, -addendum)));
  }
  const polarArray = vertexArray.map((v) => vertexToPolar(v));
  const polarParamaterization: PolarParamaterization =
    discretePolarArrayToPolarParameterization(polarArray);
  return polarParamaterization;
};

const ROOTSPERTOOTH = 4;

const generateToothRoots = (
  numTeeth: number,
  fidelicDiscreteLoop: PolygonalLoop,
): ToothRoot[] => {
  const numToothRoots = numTeeth * ROOTSPERTOOTH;
  const totalLength = fidelicDiscreteLoop.totalLength;
  const toothSpacing = totalLength / numToothRoots;
  const toothRoots: ToothRoot[] = [];
  console.log(fidelicDiscreteLoop.cumulativeLengths);
  for (let i = 0; i < numToothRoots; i++) {
    const targetLength = i * toothSpacing;
    const targetIndex =
      fidelicDiscreteLoop.findIndexOfCumulativeLength(targetLength) % 1000;
    //console.log(targetIndex);
    const toothRootVertex = fidelicDiscreteLoop.vertices[targetIndex];
    const tangentVector: Vector2d =
      fidelicDiscreteLoop.tangentAtIndex(targetIndex);
    const normalVector = perp(tangentVector);
    //console.log(toothRootVertex);
    const normalLine: Line = {
      v0: toothRootVertex,
      v1: add(toothRootVertex, normalVector),
    };
    toothRoots.push({
      index: targetIndex,
      vertex: toothRootVertex,
      normalLine,
    });
  }
  return toothRoots;
};

const generateFlankSegments = (
  toothRoots: ToothRoot[],
  pitchCurve: PitchCurve,
  baseCurve: BaseCurve,
  turningDirection: 1 | -1,
  flankDirection: 1 | -1,
): Vector2d[][] => {
  const numRoots = toothRoots.length;
  const numTeeth = toothRoots.length / ROOTSPERTOOTH;
  const rootRootIndices = Array.from(
    { length: numTeeth },
    (_, i) => i * ROOTSPERTOOTH,
  );
  if (flankDirection === 1)
    rootRootIndices.forEach((_, i) => (rootRootIndices[i] += 2));
  const pitchPolars = pitchCurve.fidelicDiscreteLoop.polarVectors;
  const fidelity = pitchPolars.length;
  const pitchVertices = pitchCurve.fidelicDiscreteLoop.vertices;
  const baseVertices = baseCurve.fidelicDiscreteLoop.vertices;
  const flankSegments: Vector2d[][] = [];
  const totalLength = baseCurve.fidelicSignedTotalLength;
  const overflowLengths = baseCurve.fidelicSignedCumulativeLengths.map(
    (len) => len + totalLength,
  );
  const underflowLengths = baseCurve.fidelicSignedCumulativeLengths.map(
    (len) => len - totalLength,
  );
  const baseLengths = [
    ...underflowLengths,
    ...baseCurve.fidelicSignedCumulativeLengths,
    ...overflowLengths,
  ];
  //if (turningDirection === -1) baseLengths[0] = totalLength;
  for (const rootRootIndex of rootRootIndices) {
    const toothRoot = toothRoots[rootRootIndex];
    // terrible naming lol, but i needed smth to differentiate the index of the root in the toothroots array vs in the fidelicloop array
    const rootFidelicIndex = toothRoot.index;
    let prevVertex: Vector2d = { ...pitchVertices[rootFidelicIndex] };
    flankSegments.push([]);
    let whileLoopCount = 0;
    const whileLoopLimit = 20 * (fidelity / numRoots);
    let unNormalizedIndex = rootFidelicIndex + fidelity;
    let baseStartCircum = baseLengths[unNormalizedIndex];
    let tangentStartLength = distance(
      pitchVertices[rootFidelicIndex],
      baseVertices[rootFidelicIndex],
    );
    while (true) {
      const fidelicLoopIndex =
        ((unNormalizedIndex % fidelity) + fidelity) % fidelity;
      const baseLengthIndex = unNormalizedIndex;
      const baseVertex = baseVertices[fidelicLoopIndex];
      const pitchVertex = pitchVertices[fidelicLoopIndex];
      const curvatureSign = baseCurve.curvatureSignMap[fidelicLoopIndex];
      // calculate next vertex of tooth flank
      if (curvatureSign === 0) {
        baseStartCircum = baseLengths[baseLengthIndex];
        tangentStartLength = distance(prevVertex, baseVertex);
      }
      const tangentVector = sub(pitchVertex, baseVertex);
      let unwrapLength =
        tangentStartLength + (baseLengths[baseLengthIndex] - baseStartCircum);
      const unwrappedTangentVector = setMagnitude(tangentVector, unwrapLength);
      const vertex = add(baseVertex, unwrappedTangentVector);
      // stackoverflow break condition
      if (whileLoopCount >= whileLoopLimit) {
        console.warn(
          "check generateFlankSegments and find the bug. This while loop should not be running this long",
        );
        break;
      }
      whileLoopCount++;
      // undercutting break condition
      if (unwrapLength < 0) {
        break;
      }
      // boundary line intersection break condition
      const nextRootRootIndex =
        (((rootRootIndex + turningDirection) % numRoots) + numRoots) % numRoots;
      const nextRoot = toothRoots[nextRootRootIndex];
      const thisRoot = toothRoots[rootRootIndex];
      const nextLineCrossed =
        vertexLineHandedness(nextRoot.normalLine, vertex) * -turningDirection >
        0;
      const thisLineCrossed =
        vertexLineHandedness(thisRoot.normalLine, vertex) * turningDirection >
        0;
      if (whileLoopCount > 1 && (thisLineCrossed || nextLineCrossed)) break;
      // all breaks passed, vertex can be added.
      flankSegments[flankSegments.length - 1].push(vertex);
      prevVertex = vertex;
      unNormalizedIndex += turningDirection;
    }
  }
  return flankSegments;
};

const generateToothFlanks = (
  toothRoots: ToothRoot[],
  pitchCurve: PitchCurve,
  fwdBaseCurve: BaseCurve,
  bwdBaseCurve: BaseCurve,
): { fwdFlank: ToothFlank; bwdFlank: ToothFlank }[] => {
  const fwdFlankTips = generateFlankSegments(
    toothRoots,
    pitchCurve,
    fwdBaseCurve,
    1,
    1,
  );
  const fwdFlankBases = generateFlankSegments(
    toothRoots,
    pitchCurve,
    fwdBaseCurve,
    -1,
    1,
  );
  const bwdFlankTips = generateFlankSegments(
    toothRoots,
    pitchCurve,
    bwdBaseCurve,
    1,
    -1,
  );
  const bwdFlankBases = generateFlankSegments(
    toothRoots,
    pitchCurve,
    bwdBaseCurve,
    -1,
    -1,
  );
  const toothFlankPairs = toothRoots.map((root, index) => {
    index = Math.floor(index / ROOTSPERTOOTH);
    return {
      fwdFlank: { tip: fwdFlankTips[index], base: fwdFlankBases[index], root },
      bwdFlank: { tip: bwdFlankTips[index], base: bwdFlankBases[index], root },
    };
  });
  return toothFlankPairs;
};

const trimFlankSegments = (
  pitchCurve: PitchCurve,
  segmentA: Vector2d[],
  segmentB: Vector2d[],
) => {};

export const createGearFromPolarParam = (
  polarParamaterization: PolarParamaterization,
  pressureAngle: number,
  numTeeth: number,
  addendum: number,
  dedendum: number,
  fidelity: number = 1000,
  renderFidelity: number = 100,
  orientation: Orientation = createOrientation(),
): Gear => {
  orientation = createOrientation(
    orientation.center,
    orientation.rotation,
    orientation.mirrored,
  );
  const pitchCurve = createPitchCurveFromPolarParam(
    polarParamaterization,
    fidelity,
    renderFidelity,
  );
  const fwdBaseCurve = createBaseCurve(
    pitchCurve,
    (pressureAngle * Math.PI) / 180,
  );
  const bwdBaseCurve = createBaseCurve(
    pitchCurve,
    -(pressureAngle * Math.PI) / 180,
  );
  addendum = Math.min(
    fwdBaseCurve.leastOuterOffset,
    bwdBaseCurve.leastOuterOffset,
  );
  dedendum = Math.min(
    fwdBaseCurve.leastInnerOffset,
    bwdBaseCurve.leastInnerOffset,
  );
  const addendumFn = generateAdendumFn(pitchCurve, addendum);
  const dedendumFn = generateAdendumFn(pitchCurve, -dedendum);
  const polyAddendum: PolygonalLoop = createPolygonalLoop(
    discretizePolarParamaterization(addendumFn, renderFidelity),
  );
  const polyDedendum = createPolygonalLoop(
    discretizePolarParamaterization(dedendumFn, renderFidelity),
  );
  const toothRoots = generateToothRoots(
    numTeeth,
    pitchCurve.fidelicDiscreteLoop,
  );
  const toothFlankPairs = generateToothFlanks(
    toothRoots,
    pitchCurve,
    fwdBaseCurve,
    bwdBaseCurve,
  );
  const fwdFlanks = toothFlankPairs.map((pair) => pair.fwdFlank);
  const bwdFlanks = toothFlankPairs.map((pair) => pair.bwdFlank);

  const syncConjugateAngle = (angle: number) => {
    const mate = gear.conjugate;
    if (!mate) return;
    const driveMap = pitchCurve.angleSyncMap;
    const mateMap = mate.pitchCurve.angleSyncMap;
    if (driveMap.length === 0 || mateMap.length === 0) return;
    mate.orientation.rotation = conjugateAngleFromThetaMaps(
      driveMap,
      mateMap,
      angle,
    );
  };

  const gear: Gear = {
    pitchCurve,
    fwdBaseCurve,
    bwdBaseCurve,
    pressureAngle,
    numTeeth,
    addendum,
    dedendum,
    addendumFn,
    polyAddendum,
    polyDedendum,
    fidelity,
    renderFidelity,
    renderMode: "default",
    orientation,
    conjugate: null,
    toothRoots,
    fwdFlanks,
    bwdFlanks,
    getDirection: () => orientation.rotation,
    setDirection: (angle: number) => {
      angle = normalizeAngle(angle);
      orientation.rotation = angle;
      syncConjugateAngle(angle);
    },
    setDirectionIndividually: (angle: number) => {
      orientation.rotation = angle;
    },
    getCenter: () => orientation.center,
    setCenter: (v: Vector2d) => {
      orientation.center = { ...v };
    },
  };
  return gear;
};

const conjugateAngleFromThetaMaps = (
  driveMap: number[],
  mateMap: number[],
  angle: number,
): number => {
  const fidelity = driveMap.length;
  const driveMapFrom = driveMap.at(0);
  const driveMapTo =
    driveMap.at(-1) > driveMapFrom
      ? driveMapFrom + 2 * Math.PI
      : driveMapFrom - 2 * Math.PI;
  const mateMapFrom = mateMap.at(0);
  const mateMapTo =
    mateMap.at(-1) > mateMapFrom
      ? mateMapFrom + 2 * Math.PI
      : mateMapFrom - 2 * Math.PI;
  angle = normalizeAngle(angle, driveMapFrom, driveMapTo);
  // search driveMap for an index approximation to the given angle
  const baseIndex = arrayBinarySearch(driveMap, (sampleAngle) => {
    if (sampleAngle > angle) return driveMapFrom < driveMapTo ? "high" : "low";
    if (sampleAngle < angle) return driveMapFrom < driveMapTo ? "low" : "high";
    return "equal";
  });
  // even though it's prob not the most accurate, we just do a lerp for the anlge overshoot, as error will disappear with higher fidelity
  const baseAngle = driveMap[baseIndex];
  const angleOvershoot = angle - baseAngle;
  const nextIndex = (((baseIndex + 1) % fidelity) + fidelity) % fidelity;
  let nextAngle = driveMap[nextIndex];
  const decimalIndex = baseIndex + angleOvershoot / (nextAngle - baseAngle);
  const lerpRatio = decimalIndex - baseIndex;
  return mateMap[baseIndex]; //+ lerpRatio * (mateMap[nextIndex] - mateMap[baseIndex])
};

export const createConjugateGear = (gearA: Gear): Gear => {
  const L = findConjugateCenterDistance(gearA.pitchCurve);
  const conjPitch = createConjugatePitchCurve(gearA.pitchCurve, L);
  const centerA = gearA.orientation.center;
  const gearB = createGearFromPolarParam(
    conjPitch.polarParamaterization,
    gearA.pressureAngle,
    gearA.numTeeth,
    gearA.addendum,
    gearA.dedendum,
    conjPitch.fidelity,
    conjPitch.renderFidelity,
    createOrientation({ x: centerA.x + L, y: centerA.y }, 0, false),
  );
  gearB.pitchCurve.angleSyncMap = conjPitch.angleSyncMap;
  gearA.conjugate = gearB;
  gearB.conjugate = gearA;
  return gearB;
};
