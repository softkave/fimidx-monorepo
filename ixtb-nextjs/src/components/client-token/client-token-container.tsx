"use client";

import { useGetClientTokens } from "@/src/lib/clientApi/clientToken";
import {
  getClientTokensSchema,
  IClientToken,
} from "fimidx-core/definitions/clientToken";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import { renderNotFoundError } from "../internal/page-not-found";
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

const kClientTokenNotFoundMessage = "Client token not found";

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

  const isLoading = clientTokenHook.isLoading;
  const error =
    clientTokenHook.error ||
    (!isLoading &&
    clientTokenHook.data &&
    clientTokenHook.data.clientTokens.length === 0
      ? new Error(kClientTokenNotFoundMessage)
      : undefined);
  const data = useMemo((): IClientTokenContainerRenderProps | undefined => {
    if (clientTokenHook.data?.clientTokens[0]) {
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

  const defaultRenderError = useCallback(
    (err: unknown) =>
      renderNotFoundError({
        error: err,
        notFoundMessage: kClientTokenNotFoundMessage,
        title: "Client token not found",
        description:
          "This client token may have been deleted or you may not have access to it.",
      }),
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
      renderError={renderError ?? defaultRenderError}
    />
  );
}
