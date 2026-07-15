"use client";

import { IOrg } from "@/src/definitions/org";
import { useGetOrg } from "@/src/lib/clientApi/org";
import { useCallback, useMemo } from "react";
import { PageError } from "../internal/error";
import { PageNotFound } from "../internal/page-not-found";
import { WrapLoader } from "../internal/wrap-loader";
import { Org, OrgTab, kOrgTabs } from "./org";

export interface IOrgContainerRenderProps {
  org: IOrg;
}

export interface IOrgContainerProps {
  orgId: string;
  defaultTab?: OrgTab;
  render?: (response: IOrgContainerRenderProps) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: unknown) => React.ReactNode;
}

const kOrgNotFoundMessages = new Set([
  "Organization not found",
  // Permission check runs before the org lookup, so a missing/inaccessible org
  // usually surfaces as this message instead.
  "Member not found",
]);

export function OrgContainer(props: IOrgContainerProps) {
  const {
    orgId,
    defaultTab = kOrgTabs.projects,
    renderLoading,
    renderError,
  } = props;
  const getOrgHook = useGetOrg({ orgId });

  const error = getOrgHook.error;
  const isLoading = getOrgHook.isLoading;
  const data = useMemo((): IOrgContainerRenderProps | undefined => {
    if (getOrgHook.data) {
      return {
        org: getOrgHook.data.org,
      };
    }
  }, [getOrgHook.data]);

  const defaultRender = useCallback(
    (response: IOrgContainerRenderProps) => (
      <Org org={response.org} defaultTab={defaultTab} />
    ),
    [defaultTab]
  );

  const defaultRenderError = useCallback((err: unknown) => {
    const message = (err as Error | undefined)?.message;
    if (message && kOrgNotFoundMessages.has(message)) {
      return (
        <PageNotFound
          title="Organization not found"
          message="This organization may have been deleted or you may not have access to it."
        />
      );
    }

    return <PageError error={err} />;
  }, []);

  const render = props.render || defaultRender;

  return (
    <WrapLoader
      data={data}
      error={error}
      isLoading={isLoading}
      render={render}
      renderLoading={renderLoading}
      renderError={renderError ?? defaultRenderError}
    />
  );
}
