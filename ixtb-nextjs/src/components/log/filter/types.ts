import { ILogField } from "fimidx-core/definitions/log";
import { IObjRecordQueryItem } from "fimidx-core/definitions/obj";

export interface IWorkingLogPartFilterItem {
  item: IObjRecordQueryItem;
  field?: ILogField;
  error?: string;
}
