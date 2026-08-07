import { createContext, useContext } from "react";

const WorkspaceActionsContext = createContext(null);

export const WorkspaceActionsProvider = WorkspaceActionsContext.Provider;

export const useWorkspaceActions = () => {
  const actions = useContext(WorkspaceActionsContext);
  if (!actions) {
    throw new Error("useWorkspaceActions must be used within WorkspaceActionsProvider");
  }
  return actions;
};
