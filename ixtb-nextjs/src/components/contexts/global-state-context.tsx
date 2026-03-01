"use client";

import { createContext, useMemo, useState } from "react";

export interface IGlobalState {
  projectName?: string;
  orgName?: string;
  setProjectName: (projectName: string | undefined) => void;
  setOrgName: (orgName: string | undefined) => void;
}

export const GlobalStateContext = createContext<IGlobalState>({
  setProjectName: () => {},
  setOrgName: () => {},
});

export function GlobalStateProvider(props: { children: React.ReactNode }) {
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  const [orgName, setOrgName] = useState<string | undefined>(undefined);
  const globalState = useMemo(() => {
    return {
      projectName,
      setProjectName,
      orgName,
      setOrgName,
    };
  }, [projectName, orgName]);

  return (
    <GlobalStateContext.Provider value={globalState}>
      {props.children}
    </GlobalStateContext.Provider>
  );
}
