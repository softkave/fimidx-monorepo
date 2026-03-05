import { useEncodeClientTokenJWT } from "@/src/lib/clientApi/clientToken";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import { useCallback } from "react";
import { Copyable } from "../internal/copyable";
import { ObfuscateText } from "../internal/obfuscate-text";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { ClientTokenItemMenu } from "./client-token-item-menu";
import { PermissionSelector } from "./permission-selector";
export interface IClientTokenProps {
  clientToken: IClientToken;
}

export function ClientToken(props: IClientTokenProps) {
  const encodeClientTokenJWT = useEncodeClientTokenJWT({
    clientTokenId: props.clientToken.id,
  });

  const handleEncodeClientTokenJWT = useCallback(async () => {
    await encodeClientTokenJWT.trigger({
      id: props.clientToken.id,
    });
  }, [encodeClientTokenJWT, props.clientToken.id]);

  const { data } = encodeClientTokenJWT;

  const orgId = props.clientToken.meta?.orgId;
  const projectId =
    props.clientToken.meta?.projectId ?? props.clientToken.projectId;

  if (!orgId || !projectId) {
    return null;
  }

  const permissions = props.clientToken.permissions ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <div className="flex justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold break-all">
            {props.clientToken.name}
          </h1>
        </div>
        <ClientTokenItemMenu
          clientToken={props.clientToken}
          projectId={projectId}
        />
      </div>
      <div className="flex flex-col gap-4">
        {props.clientToken.description && (
          <p className="text-muted-foreground">
            {props.clientToken.description}
          </p>
        )}
        <Separator />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Project ID
          </h3>
          <Copyable produceText={() => projectId}>
            <pre className="text-sm text-muted-foreground bg-muted p-2 rounded-md whitespace-pre-wrap break-all">
              <code>{projectId}</code>
            </pre>
          </Copyable>
        </div>
        <Separator />
        {permissions.length > 0 && (
          <>
            <PermissionSelector
              value={permissions}
              targetId={projectId}
              readonly
            />
            <Separator />
          </>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center gap-2">
            <h3 className="text-md font-medium">Encode Token</h3>
            <Button
              onClick={handleEncodeClientTokenJWT}
              disabled={encodeClientTokenJWT.isMutating}
              variant="outline"
              type="button"
            >
              {encodeClientTokenJWT.isMutating ? "Encoding..." : "Encode"}
            </Button>
          </div>
          {data?.token && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                JWT Token
              </h3>
              <ObfuscateText
                text={data.token}
                canCopy
                render={() => (
                  <pre className="text-sm text-muted-foreground bg-muted p-2 rounded-md whitespace-pre-wrap break-all">
                    <code>{data.token}</code>
                  </pre>
                )}
              />
            </div>
          )}
          {data?.refreshToken && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Refresh Token
              </h3>
              <ObfuscateText
                text={data.refreshToken}
                canCopy
                render={() => (
                  <pre className="text-sm text-muted-foreground bg-muted p-2 rounded-md whitespace-pre-wrap break-all">
                    <code>{data.refreshToken}</code>
                  </pre>
                )}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
