import type {
  IObjField,
  IObjQuery,
  IObjSortList,
  ITopLevelFieldQuery,
} from "../../definitions/obj.js";
import type { IQueryTransformer } from "../types.js";

export abstract class BaseQueryTransformer<T> implements IQueryTransformer<T> {
  abstract transformFilter(
    query: IObjQuery,
    date: Date,
    fields?: Map<string, IObjField>
  ): T;
  abstract transformSort(sort: IObjSortList, fields?: IObjField[]): T;
  abstract transformPagination(page: number, limit: number): T;

  protected transformRecordQuery(recordQuery: any, date: Date): T {
    // Common logic for transforming record queries
    // This will be implemented by concrete classes
    throw new Error("transformRecordQuery must be implemented by concrete class");
  }

  protected transformMetaQuery(metaQuery: any, date: Date): T {
    // Common logic for transforming meta queries
    // This will be implemented by concrete classes
    throw new Error("transformMetaQuery must be implemented by concrete class");
  }

  protected transformTopLevelFields(
    topLevelFields: ITopLevelFieldQuery,
    date: Date
  ): T {
    // Common logic for transforming top-level field queries
    // This will be implemented by concrete classes
    throw new Error(
      "transformTopLevelFields must be implemented by concrete class"
    );
  }

  protected getNumberOrDurationMsFromValue(value: any): {
    valueNumber: number | undefined;
    durationMs: number | undefined;
  } {
    // Common logic for extracting number or duration from value
    if (typeof value === "number") {
      return { valueNumber: value, durationMs: undefined };
    }

    if (typeof value === "string") {
      // Handle duration strings like "1d", "2h", etc.
      const durationMatch = value.match(/^(\d+)([dhms])$/);
      if (durationMatch) {
        const [, amount, unit] = durationMatch;
        const num = parseInt(amount, 10);
        let durationMs: number;

        switch (unit) {
          case "d":
            durationMs = num * 24 * 60 * 60 * 1000;
            break;
          case "h":
            durationMs = num * 60 * 60 * 1000;
            break;
          case "m":
            durationMs = num * 60 * 1000;
            break;
          case "s":
            durationMs = num * 1000;
            break;
          default:
            durationMs = 0;
        }

        return { valueNumber: undefined, durationMs };
      }

      // Handle ISO date strings
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return { valueNumber: date.getTime(), durationMs: undefined };
      }
    }

    return { valueNumber: undefined, durationMs: undefined };
  }

  protected getGtGteValue(value: any, date: Date): number | undefined {
    const { valueNumber, durationMs } =
      this.getNumberOrDurationMsFromValue(value);

    if (typeof valueNumber === "number") {
      return valueNumber;
    }

    if (durationMs) {
      return new Date(date.getTime() + durationMs).getTime();
    }

    return undefined;
  }

  protected getLtLteValue(value: any, date: Date): number | undefined {
    const { valueNumber, durationMs } =
      this.getNumberOrDurationMsFromValue(value);

    if (typeof valueNumber === "number") {
      return valueNumber;
    }

    if (durationMs) {
      return new Date(date.getTime() - durationMs).getTime();
    }

    return undefined;
  }

  protected getGtGteValueAsDate(value: any, date: Date): Date | undefined {
    const { valueNumber, durationMs } =
      this.getNumberOrDurationMsFromValue(value);

    if (typeof valueNumber === "number") {
      return new Date(valueNumber);
    }

    if (durationMs) {
      return new Date(date.getTime() + durationMs);
    }

    return undefined;
  }

  protected getLtLteValueAsDate(value: any, date: Date): Date | undefined {
    const { valueNumber, durationMs } =
      this.getNumberOrDurationMsFromValue(value);

    if (typeof valueNumber === "number") {
      return new Date(valueNumber);
    }

    if (durationMs) {
      return new Date(date.getTime() - durationMs);
    }

    return undefined;
  }

  protected getBetweenValue(
    value: [any, any],
    date: Date
  ): [number, number] | undefined {
    const [min, max] = value;
    const minValue = this.getGtGteValue(min, date);
    const maxValue = this.getLtLteValue(max, date);

    if (minValue !== undefined && maxValue !== undefined) {
      return [minValue, maxValue];
    }

    return undefined;
  }
}
