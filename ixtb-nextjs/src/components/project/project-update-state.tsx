"use client";

import useTitle from "@/src/hooks/use-title.ts";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { IProject } from "fimidx-core/definitions/project";
import { useContext, useEffect } from "react";
import { GlobalStateContext } from "../contexts/global-state-context";

export function ProjectUpdateState(props: { project: IProject }) {
  useTitle(`${kAppConstants.name} - ${props.project.name}`);
  const globalState = useContext(GlobalStateContext);

  useEffect(() => {
    globalState.setProjectName(props.project.name);
    return () => {
      globalState.setProjectName(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we only want to re-run this effect when the list name changes
  }, [props.project.name]);

  return null;
}
