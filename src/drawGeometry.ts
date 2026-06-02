import type { PolygonalLoop } from "./geometry";

export const drawPolygonalLoop = (
  context: CanvasRenderingContext2D,
  loop: PolygonalLoop,
  fill = false,
  stroke = true,
  displayCenter = true,
) => {
  context.beginPath();
  context.moveTo(
    loop.vertices[0].x, // + loop.center.x,
    loop.vertices[0].y, // + loop.center.y,
  );
  for (let i = 1; i < loop.vertices.length; i++) {
    context.lineTo(
      loop.vertices[i].x, // + loop.center.x,
      loop.vertices[i].y, // + loop.center.y,
    );
  }
  context.closePath();
  fill && context.fill();
  stroke && context.stroke();
  if (displayCenter) {
    context.beginPath();
    context.arc(loop.center.x, loop.center.y, 3, 0, 2 * Math.PI);
    context.fillStyle = "red";
    context.fill();
  }
};
