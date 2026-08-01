import {
  discretePolarArrayToPolarParameterization,
  discretizePolarParamaterization,
  tangentAtIndexOfVertexArray,
} from "./calc";
import type { PitchCurve } from "./pitchCurve";
import { createPolygonalLoop, type PolygonalLoop } from "./polygonalLoop";
import {
  add,
  dot,
  getAngle,
  magnitude,
  normalizeAngle,
  normalizeVector,
  polarToVertex,
  sub,
  vertexToPolar,
  type PolarVector,
  type Vector2d,
} from "./vector";

export interface BaseCurve {
  fidelicDiscreteLoop: PolygonalLoop;
  renderedDiscreteLoop: PolygonalLoop;
  wrapSignMap: (-1 | 1 | 0)[];
  curvatureSignMap: (-1 | 1 | 0)[];
  fidelicSignedCumulativeLengths: number[];
  fidelicSignedTotalLength: number;
  leastInnerOffset: number;
  leastOuterOffset: number;
}

export const createBaseCurve = (
  pitchCurve: PitchCurve,
  pressureAngle: number,
): BaseCurve => {
  const renderFidelity = pitchCurve.renderFidelity;
  const pitchVertices = pitchCurve.fidelicDiscreteLoop.vertices;
  const curvatureSignMap: (-1 | 1 | 0)[] = [];
  const zeroCurvatureAtRadiusThreshold = 2 * pitchCurve.averageRadius;
  let leastInnerOffset = Infinity;
  let leastOuterOffset = Infinity;
  const baseCurveVertices: Vector2d[] = pitchVertices.map((vertex, i) => {
    const curvature = pitchCurve.fidelicDiscreteLoop.curvatureAtIndex(i);
    const curvatureSign =
      1 / Math.abs(curvature) > zeroCurvatureAtRadiusThreshold
        ? 0
        : curvature > 0
          ? 1
          : curvature < 0
            ? -1
            : 0;
    curvatureSignMap.push(curvatureSign);
    const tang = tangentAtIndexOfVertexArray(pitchVertices, i);
    const pitchRadius = curvature === 0 ? NaN : 1 / curvature;
    const offsetMag = pitchRadius * Math.sin(pressureAngle);
    const absMag = Math.abs(offsetMag);
    if (curvatureSign === -1 && absMag < leastOuterOffset) {
      leastOuterOffset = absMag;
    } else if (curvatureSign === 1 && absMag < leastInnerOffset) {
      leastInnerOffset = absMag;
    }
    const offsetDir = normalizeAngle(getAngle(tang)) + pressureAngle;
    const polarOffset: PolarVector = { mag: offsetMag, angle: offsetDir };
    return add(polarToVertex(polarOffset), vertex);
  });
  const baseCurvePolarVectors = baseCurveVertices.map(vertexToPolar);
  // 1 means unwrap, -1 means wrap, 0 means unsure
  let wrapSignMap: (-1 | 1 | 0)[] = [];
  // if abs(alignment) < unsureThreshold, we count it as a 0
  const unsureThreshold = 0.2;
  for (let i = 0; i < pitchVertices.length; i++) {
    const curveDirection = tangentAtIndexOfVertexArray(baseCurveVertices, i);
    const stringDirection = sub(baseCurveVertices[i], pitchVertices[i]);
    const alignment = dot(
      normalizeVector(curveDirection),
      normalizeVector(stringDirection),
    );
    if (
      Math.abs(alignment) < unsureThreshold //||magnitude(baseCurveVertices[i]) > 1000
    )
      wrapSignMap.push(0);
    else if (alignment >= 0) wrapSignMap.push(1);
    else wrapSignMap.push(-1);
  }
  /*
  // wrapSignMap post-processing: we replace all the transitions between + and - with 0
  wrapSignMap = wrapSignMap.map((val, i) => {
    if (i === 0 || i === wrapSignMap.length - 1) return val;
    return val !== wrapSignMap[i - 1] ? 0 : val;
  });
  console.log(wrapSignMap);*/
  // convoluted and prob inefficient but idc way of sampling smaller array for rendering
  const fidelicDiscreteLoop = createPolygonalLoop(baseCurvePolarVectors);
  const cumulativeLengths = fidelicDiscreteLoop.cumulativeLengths;
  const fidelicSignedCumulativeLengths = [0];
  let signedCumulativeLength = 0;
  for (let i = 0; i + 1 < cumulativeLengths.length; i++) {
    if (wrapSignMap[i] === 0 && wrapSignMap[i + 1] === 0) {
    }
    const segmentLength = cumulativeLengths[i + 1] - cumulativeLengths[i];
    signedCumulativeLength += wrapSignMap[i] * segmentLength;
    fidelicSignedCumulativeLengths.push(signedCumulativeLength);
  }
  signedCumulativeLength +=
    wrapSignMap[cumulativeLengths.length - 1] *
    (fidelicDiscreteLoop.totalLength -
      cumulativeLengths[cumulativeLengths.length - 1]);
  const fidelicSignedTotalLength = signedCumulativeLength;
  const polyPar = discretePolarArrayToPolarParameterization(
    baseCurvePolarVectors,
  );
  const renderedPolarVectors = discretizePolarParamaterization(
    polyPar,
    renderFidelity,
  );
  const renderedDiscreteLoop = createPolygonalLoop(renderedPolarVectors);
  return {
    fidelicDiscreteLoop,
    renderedDiscreteLoop,
    wrapSignMap,
    fidelicSignedCumulativeLengths,
    fidelicSignedTotalLength,
    curvatureSignMap,
    leastInnerOffset,
    leastOuterOffset,
  };
};
