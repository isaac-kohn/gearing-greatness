import { element } from "three/tsl";
import { createUnit } from "./unit";

export const createComputor = () => {
  let pointer: number = 0;
  let showLogs: boolean = true;

  const numUnits = 4;

  const computorDiv = document.createElement("div");

  const units = Array.from({ length: numUnits }, (_, i) => {
    return createUnit({ address: i });
  });
  units.forEach((unit) => {
    computorDiv.append(unit.element);
    computorDiv.append(document.createElement("br"));
  });

  const controlDiv = document.createElement("div");
  controlDiv.style.display = "flex";
  controlDiv.style.justifyContent = "center";
  controlDiv.style.width = "550px";
  const transitionButton = document.createElement("button");
  transitionButton.textContent = "Next";
  transitionButton.style.fontSize = "30px";
  controlDiv.append(transitionButton);
  computorDiv.append(controlDiv);

  const logVals = () => {
    const unitVals = units.map((unit) => parseInt(unit.getValBits(), 2));
    const log = unitVals.join("  ");
    console.log(log);
  };

  const updateUI = () => {
    units.forEach((unit) => {
      unit.setPointerState(false);
    });
    units[pointer].setPointerState(true);
    if (showLogs) logVals();
  };
  updateUI();

  const stateTransition = () => {
    const opcode = units[pointer].getOpBits();
    const address1 = parseInt(units[pointer].getAd1Bits(), 2);
    const val1 = parseInt(units[address1].getValBits(), 2);
    const address2 = parseInt(units[pointer].getAd2Bits(), 2);
    const val2 = parseInt(units[address2].getValBits(), 2);

    // HALT
    if (opcode === "00") {
      if (val1 > val2) {
        pointer = address2;
        units[pointer].setValBits(val1.toString(2).padStart(6, "0"));
      } else {
        console.log("halted at value " + val1);
      }
    }

    // SUB
    else if (opcode === "10") {
      const diff = (val2 - val1 + 32) % 32;
      units[address2].setValBits(diff.toString(2).padStart(6, "0"));
      pointer = address2;
    }

    // COND
    else if (opcode == "01") {
      if (val2 <= val1) {
        pointer = address2;
      } else {
        pointer = (pointer + 1) % 4;
        //units[pointer].setValBits(valX.toString(2).padStart(6, "0"));
      }
    }

    updateUI();
  };

  transitionButton.onclick = stateTransition;

  return {
    element: computorDiv,
    setPointer: (nextAdress: number) => {
      pointer = nextAdress;
      updateUI();
    },
    units,
  };
};
