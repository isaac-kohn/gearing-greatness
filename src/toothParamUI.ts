export const createToothParamUI = (): HTMLDivElement => {
  const container = document.createElement("div");
  const numTeethInput = document.createElement("input");
  container.append(numTeethInput);
  return container;
};
