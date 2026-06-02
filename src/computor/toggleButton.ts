export const createToggleButton = ({ id }: { id: string }) => {
  const button = document.createElement("button");
  button.id = "toggleButton-" + id;

  button.className = "toggleButton";
  button.style.width = "50px";
  button.style.height = "50px";
  button.style.fontSize = "30px";

  let isOn = false;

  const updateUI = () => {
    button.textContent = isOn ? "1" : "0";
    button.style.backgroundColor = isOn ? "lightgreen" : "pink";
  };
  updateUI();

  button.addEventListener("click", () => {
    isOn = !isOn;
    updateUI();
  });

  return {
    element: button,
    getState: () => {
      return isOn;
    },
    setState: (x: boolean) => {
      isOn = x;
      updateUI();
    },
  };
};
