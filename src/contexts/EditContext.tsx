"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import {
  type EditParameters,
  DEFAULT_EDIT_PARAMETERS,
} from "@/types/edit-parameters";

type EditAction =
  | { type: "UPDATE_PARAMETER"; section: string; key: string; value: number }
  | { type: "RESET_ALL" }
  | { type: "RESET_SECTION"; section: keyof EditParameters };

interface EditContextValue {
  params: EditParameters;
  updateParameter: (section: string, key: string, value: number) => void;
  resetAll: () => void;
  resetSection: (section: keyof EditParameters) => void;
}

const EditContext = createContext<EditContextValue | null>(null);

function editReducer(state: EditParameters, action: EditAction): EditParameters {
  switch (action.type) {
    case "UPDATE_PARAMETER": {
      const section = action.section as keyof EditParameters;
      const current = state[section];
      return {
        ...state,
        [section]: {
          ...(current as unknown as Record<string, unknown>),
          [action.key]: action.value,
        },
      };
    }
    case "RESET_ALL":
      return structuredClone(DEFAULT_EDIT_PARAMETERS);
    case "RESET_SECTION":
      return {
        ...state,
        [action.section]: structuredClone(
          DEFAULT_EDIT_PARAMETERS[action.section]
        ),
      };
    default:
      return state;
  }
}

export function EditProvider({ children }: { children: ReactNode }) {
  const [params, dispatch] = useReducer(
    editReducer,
    DEFAULT_EDIT_PARAMETERS,
    () => structuredClone(DEFAULT_EDIT_PARAMETERS)
  );

  const updateParameter = useCallback(
    (section: string, key: string, value: number) => {
      dispatch({ type: "UPDATE_PARAMETER", section, key, value });
    },
    []
  );

  const resetAll = useCallback(() => {
    dispatch({ type: "RESET_ALL" });
  }, []);

  const resetSection = useCallback((section: keyof EditParameters) => {
    dispatch({ type: "RESET_SECTION", section });
  }, []);

  return (
    <EditContext value={{ params, updateParameter, resetAll, resetSection }}>
      {children}
    </EditContext>
  );
}

export function useEditContext(): EditContextValue {
  const ctx = useContext(EditContext);
  if (!ctx) {
    throw new Error("useEditContext must be used within an EditProvider");
  }
  return ctx;
}
