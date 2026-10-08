import "mathlive";
import { compile, parse } from "@cortex-js/compute-engine";
import type { MathfieldElement } from "mathlive";

type PitchCurveFunction = (theta: number) => number;

type PitchCurveCompileResult =
  | {
      success: true;
      fn: PitchCurveFunction;
    }
  | {
      success: false;
      error: string;
    };

export interface PitchCurveInput {
  element: HTMLElement;
  mathField: MathfieldElement;
  getFunction: () => PitchCurveCompileResult;
}

export const createPitchCurveInput = (): PitchCurveInput => {
  const container = document.createElement("div");

  const label = document.createElement("label");
  label.textContent = "Pitch curve:";

  const mathField = document.createElement("math-field") as MathfieldElement;

  mathField.mathVirtualKeyboardPolicy = "manual";
  mathField.setAttribute("aria-label", "Pitch curve equation");

  // Example starting expression.
  // The user only sees:
  //     100 - 20 cos(4θ)
  //
  // They never see the internal `theta -> ...` lambda.
  mathField.setValue("100 - 20\\cos(4\\theta)", {
    format: "latex",
  });

  label.appendChild(mathField);
  container.appendChild(label);

  const getFunction = (): PitchCurveCompileResult => {
    try {
      const latex = mathField.getValue("latex");

      if (!latex.trim()) {
        return {
          success: false,
          error: "Enter a pitch curve equation.",
        };
      }

      // Parse first so we can inspect the expression before compiling it.
      const expression = parse(latex);

      // Only θ is allowed to be a free variable.
      //
      // `freeVariables` excludes known constants/functions and
      // locally-bound variables.
      const invalidVariables = expression.freeVariables.filter(
        (variable) => variable !== "theta",
      );

      if (invalidVariables.length > 0) {
        return {
          success: false,
          error:
            `The only variable in your expression should be θ. ` +
            `Unknown variable${
              invalidVariables.length === 1 ? "" : "s"
            }: ${invalidVariables.join(", ")}`,
        };
      }

      // Compile once. Do NOT compile every time theta is evaluated.
      const compiled = compile(expression);

      if (!compiled.success) {
        return {
          success: false,
          error: "This pitch curve could not be compiled.",
        };
      }

      const fn: PitchCurveFunction = (theta: number): number => {
        const result = compiled.run({ theta });

        // The JS compiler normally returns a number for a
        // real-valued expression. Reject complex/non-number results.
        if (typeof result !== "number") {
          return NaN;
        }

        return result;
      };

      // Test once immediately so an expression that compiles
      // but produces an unusable result is caught now.
      const testResult = fn(0);

      if (!Number.isFinite(testResult)) {
        return {
          success: false,
          error: "The pitch curve must produce a finite real number.",
        };
      }

      return {
        success: true,
        fn,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Invalid mathematical expression.",
      };
    }
  };

  return {
    element: container,
    mathField,
    getFunction,
  };
};
