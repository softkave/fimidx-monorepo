"use client";

import { useGetClientTokens } from "@/src/lib/clientApi/clientToken";
import {
  getClientTokensSchema,
  IClientToken,
} from "fimidx-core/definitions/clientToken";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import { WrapLoader } from "../internal/wrap-loader";
import { ClientToken } from "./client-token";

export interface IClientTokenContainerRenderProps {
  clientToken: IClientToken;
}

export interface IClientTokenContainerProps {
  projectId: string;
  clientTokenId: string;
  groupId: string;
  render?: (response: IClientTokenContainerRenderProps) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: unknown) => React.ReactNode;
}

export function ClientTokenContainer(props: IClientTokenContainerProps) {
  const { projectId, clientTokenId, groupId, renderLoading, renderError } =
    props;

  const args = useMemo(
    (): z.infer<typeof getClientTokensSchema> => ({
      page: 1,
      limit: 1,
      includePermissions: true,
      query: {
        projectId,
        groupId,
        id: {
          eq: clientTokenId,
        },
      },
    }),
    [clientTokenId, groupId, projectId]
  );

  const clientTokenHook = useGetClientTokens(args);

  const error = clientTokenHook.error;
  const isLoading = clientTokenHook.isLoading;
  const data = useMemo((): IClientTokenContainerRenderProps | undefined => {
    if (clientTokenHook.data) {
      return {
        clientToken: clientTokenHook.data.clientTokens[0],
      };
    }
  }, [clientTokenHook.data]);

  const defaultRender = useCallback(
    (response: IClientTokenContainerRenderProps) => (
      <ClientToken clientToken={response.clientToken} />
    ),
    []
  );

  const render = props.render || defaultRender;

  return (
    <WrapLoader
      data={data}
      error={error}
      isLoading={isLoading}
      render={render}
      renderLoading={renderLoading}
      renderError={renderError}
    />
  );
}
