"use client";

import { useGetClientTokens } from "@/src/lib/clientApi/clientToken.ts";
import { cn } from "@/src/lib/utils.ts";
import {
  GetClientTokensEndpointArgs,
  IClientToken,
} from "fimidx-core/definitions/clientToken";
import { useState } from "react";
import { OmitFrom } from "softkave-js-utils";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import UnknownCountListPagination from "../internal/unknown-count-list-pagination.tsx";
import { WrapLoader } from "../internal/wrap-loader.tsx";
import { ClientTokens } from "./client-tokens-list.tsx";

export type IClientTokenListContainerFilter = OmitFrom<
  GetClientTokensEndpointArgs,
  "page" | "limit"
>;

export interface IClientTokenListContainerProps {
  render?: (clientTokens: IClientToken[]) => React.ReactNode;
  showNoClientTokensMessage?: boolean;
  filter?: IClientTokenListContainerFilter;
  className?: string;
  clientTokensContainerClassName?: string;
  projectId: string;
  groupId: string;
}

export function ClientTokenListContainer({
  render: inputRender,
  showNoClientTokensMessage = true,
  filter,
  className,
  clientTokensContainerClassName,
  projectId,
  groupId,
}: IClientTokenListContainerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const clientTokenHooks = useGetClientTokens({
    page,
    limit: pageSize,
    includePermissions: true,
    query: {
      projectId,
      groupId,
      ...filter,
    },
  });

  const defaultRender = (clientTokens: IClientToken[]) => {
    return <ClientTokens clientTokens={clientTokens} />;
  };

  const render = inputRender ?? defaultRender;

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <WrapLoader
        isLoading={clientTokenHooks.isLoading}
        error={clientTokenHooks.error}
        data={clientTokenHooks.data}
        render={(data) =>
          data.clientTokens.length === 0 && showNoClientTokensMessage ? (
            <ComponentListMessage
              title="No client tokens"
              message="Add client tokens to get started"
            />
          ) : (
            <div
              className={cn(
                "flex flex-col items-center w-full",
                clientTokensContainerClassName
              )}
            >
              {render(data.clientTokens)}
              <UnknownCountListPagination
                hasMore={data.hasMore}
                page={page}
                pageSize={pageSize}
                disabled={clientTokenHooks.isLoading}
                setPage={setPage}
                setPageSize={setPageSize}
                className="py-4"
              />
            </div>
          )
        }
      />
    </div>
  );
}
