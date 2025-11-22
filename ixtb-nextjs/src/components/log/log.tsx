import JsonView from "@uiw/react-json-view";
import { ILog } from "fimidx-core/definitions/log";
import { Badge } from "../ui/badge";

export interface ILogProps {
  log: ILog;
}

export function Log(props: ILogProps) {
  const timestamp = props.log.createdAt.toLocaleString();
  const level = props.log.data.level ?? "unknown";
  const message = props.log.data.message ?? "unknown";

  const json = JSON.stringify(props.log.data, null, 2);

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-bold">{props.log.id}</h1>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm text-muted-foreground">Timestamp</h3>
          <p>{timestamp}</p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm text-muted-foreground">Level</h3>
          <Badge variant="outline">{level}</Badge>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm text-muted-foreground">Message</h3>
          <p>{message}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-muted-foreground">Raw Data</h3>
        <JsonView value={props.log.data} />
      </div>
    </div>
  );
}
