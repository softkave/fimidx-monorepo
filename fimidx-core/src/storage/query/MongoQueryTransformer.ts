import { uniq } from "lodash-es";
import type { FilterQuery, SortOrder } from "mongoose";
import {
  META_QUERY_KEYS,
  TOP_LEVEL_QUERY_KEYS,
  type INumberMetaQuery,
  type IObj,
  type IObjField,
  type IObjMetaQuery,
  type IObjQuery,
  type IObjQueryLeaf,
  type IObjQueryLogical,
  type IObjRecordQueryItem,
  type IObjRecordQueryList,
  type IObjSortList,
  type IStringMetaQuery,
  type ITopLevelFieldQuery,
} from "../../definitions/obj.js";
import { isObjQueryLeaf } from "../../definitions/obj.js";
import { BaseQueryTransformer } from "./BaseQueryTransformer.js";

export class MongoQueryTransformer extends BaseQueryTransformer<
  FilterQuery<IObj>
> {
  transformFilter(
    query: IObjQuery,
    date: Date,
    fields?: Map<string, IObjField>
  ): FilterQuery<IObj> {
    // Breaking change: boolean logic is now expressed at obj-query level only.
    // Still support callers passing a single leaf by treating it as { and: [leaf] }.
    return isObjQueryLeaf(query)
      ? this.transformObjLogicalQuery({ and: [query] }, date, fields)
      : this.transformObjLogicalQuery(query as IObjQueryLogical, date, fields);
  }

  private transformLeafQuery(
    leaf: IObjQueryLeaf,
    date: Date,
    fields?: Map<string, IObjField>
  ): FilterQuery<IObj> {
    const filters: FilterQuery<IObj>[] = [];

    if (leaf.recordQuery?.length) {
      const recordFilter = this.transformRecordQuery(leaf.recordQuery, date, fields);
      if (Object.keys(recordFilter).length > 0) filters.push(recordFilter);
    }

    if (leaf.metaQuery) {
      const metaOnly: IObjMetaQuery = {};
      const topLevelOnly: ITopLevelFieldQuery = {};
      Object.entries(leaf.metaQuery).forEach(([key, value]) => {
        if (value === undefined) return;
        if (META_QUERY_KEYS.has(key)) {
          (metaOnly as Record<string, unknown>)[key] = value;
        } else if (TOP_LEVEL_QUERY_KEYS.has(key)) {
          (topLevelOnly as Record<string, unknown>)[key] = value;
        }
      });

      if (Object.keys(metaOnly).length > 0) {
        const metaFilter = this.transformMetaQuery(metaOnly, date);
        if (Object.keys(metaFilter).length > 0) filters.push(metaFilter);
      }

      if (Object.keys(topLevelOnly).length > 0) {
        const topLevelFilter = this.transformTopLevelFields(topLevelOnly, date);
        if (Object.keys(topLevelFilter).length > 0) filters.push(topLevelFilter);
      }
    }

    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0];
    return { $and: filters };
  }

  private transformObjLogicalQuery(
    logicalQuery: IObjQueryLogical,
    date: Date,
    fields?: Map<string, IObjField>
  ): FilterQuery<IObj> {
    let filter: FilterQuery<IObj> = {};

    const hasAnd = !!logicalQuery.and?.length;
    const hasOr = !!logicalQuery.or?.length;

    const branchToFilter = (branch: IObjQuery): FilterQuery<IObj> =>
      isObjQueryLeaf(branch)
        ? this.transformLeafQuery(branch, date, fields)
        : this.transformObjLogicalQuery(branch as IObjQueryLogical, date, fields);

    if (hasAnd && hasOr) {
      const andFilters = logicalQuery.and!.map((b) => branchToFilter(b as IObjQuery));
      const orFilters = logicalQuery.or!.map((b) => branchToFilter(b as IObjQuery));
      filter = { $or: [{ $and: andFilters }, ...orFilters] };
    } else if (hasAnd) {
      const andFilters = logicalQuery.and!.map((b) => branchToFilter(b as IObjQuery));
      filter =
        andFilters.length === 1
          ? andFilters[0]
          : ({ $and: andFilters } as FilterQuery<IObj>);
    } else if (hasOr) {
      const orFilters = logicalQuery.or!.map((b) => branchToFilter(b as IObjQuery));
      filter =
        orFilters.length === 1
          ? orFilters[0]
          : ({ $or: orFilters } as FilterQuery<IObj>);
    }

    return filter;
  }

  transformSort(
    sort: IObjSortList,
    // TODO: change to Map<string, IObjField>
    _fields?: IObjField[]
  ): Record<string, SortOrder> {
    if (sort.length === 0) {
      return { createdAt: -1 };
    }

    const sortObj: Record<string, SortOrder> = {};

    // List of top-level fields that should not be prefixed
    const topLevelFields = new Set([
      "id",
      "createdAt",
      "updatedAt",
      "createdBy",
      "createdByType",
      "updatedBy",
      "updatedByType",
      "projectId",
      "groupId",
      "tag",
      "deletedAt",
      "deletedBy",
      "deletedByType",
      "shouldIndex",
      "fieldsToIndex",
    ]);

    sort.forEach((sortItem) => {
      const direction = sortItem.direction === "asc" ? 1 : -1;
      let outputField = sortItem.field;

      // Prefix with objRecord. if not a top-level field and not already prefixed
      if (
        !topLevelFields.has(outputField) &&
        !outputField.startsWith("objRecord.")
      ) {
        outputField = `objRecord.${outputField}`;
      }

      sortObj[outputField] = direction;
    });

    // If no valid sort clauses, return default
    if (Object.keys(sortObj).length === 0) {
      return { createdAt: -1 };
    }

    return sortObj;
  }

  transformPagination(
    page: number,
    limit: number
  ): { skip: number; limit: number } {
    return {
      skip: page * limit,
      limit,
    };
  }

  protected transformRecordQuery(
    recordQuery: IObjRecordQueryList,
    date: Date,
    fields?: Map<string, IObjField>
  ): FilterQuery<IObj> {
    const fieldOps: Record<string, Record<string, any>> = {};

    recordQuery.forEach((part) => {
      const fieldInfo = fields?.get(part.field);
      const query = this.generateFieldQuery(part, fieldInfo, date);

      // Merge operations for the same field
      for (const [fieldPath, operations] of Object.entries(query)) {
        if (!fieldOps[fieldPath]) fieldOps[fieldPath] = {};
        Object.assign(fieldOps[fieldPath], operations);
      }
    });

    // Flatten: if only $eq, keep as { $eq: value }, not just value
    const mongoQuery: FilterQuery<IObj> = {};
    for (const [field, ops] of Object.entries(fieldOps)) {
      mongoQuery[field] = { ...ops };
    }
    return mongoQuery;
  }

  protected transformMetaQuery(
    metaQuery: IObjMetaQuery,
    date: Date
  ): FilterQuery<IObj> {
    const filter: FilterQuery<IObj> = {};

    Object.entries(metaQuery).forEach(([key, value]) => {
      // Skip empty objects (e.g., id: {})
      if (
        typeof value === "object" &&
        value !== null &&
        Object.keys(value).length === 0
      ) {
        return;
      }
      // Map meta fields to top-level fields
      const fieldMap: Record<string, string> = {
        projectId: "projectId",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        updatedBy: "updatedBy",
        updatedByType: "updatedByType",
        createdBy: "createdBy",
        createdByType: "createdByType",
        deletedAt: "deletedAt",
        deletedBy: "deletedBy",
        deletedByType: "deletedByType",
      };

      const mongoField = fieldMap[key] || key;

      if (this.isNumberMetaQuery(value)) {
        this.transformNumberMetaQuery(filter, mongoField, value, date);
      } else if (this.isStringMetaQuery(value)) {
        this.transformStringMetaQuery(filter, mongoField, value);
      }
    });

    // Flatten { $eq: value } to value for all fields
    Object.keys(filter).forEach((k) => {
      if (
        filter[k] &&
        typeof filter[k] === "object" &&
        Object.keys(filter[k]).length === 1 &&
        Object.prototype.hasOwnProperty.call(filter[k], "$eq")
      ) {
        filter[k] = filter[k]["$eq"];
      }
    });

    return filter;
  }

  protected transformTopLevelFields(
    topLevelFields: ITopLevelFieldQuery,
    date: Date
  ): FilterQuery<IObj> {
    const filter: FilterQuery<IObj> = {};

    Object.entries(topLevelFields).forEach(([key, value]) => {
      // If deletedAt is explicitly null, skip adding it to the filter here
      // so that the storage layer can handle includeDeleted logic
      if (key === "deletedAt" && value === null) {
        return;
      }
      if (this.isStringMetaQuery(value)) {
        this.transformStringMetaQuery(filter, key, value);
      } else if (this.isNumberMetaQuery(value)) {
        this.transformNumberMetaQuery(filter, key, value, date);
      } else {
        // Handle simple values (boolean, null, array, string, number)
        filter[key] = value;
      }
    });

    // Flatten { $eq: value } to value for all fields
    Object.keys(filter).forEach((k) => {
      if (
        filter[k] &&
        typeof filter[k] === "object" &&
        Object.keys(filter[k]).length === 1 &&
        Object.prototype.hasOwnProperty.call(filter[k], "$eq")
      ) {
        filter[k] = filter[k]["$eq"];
      }
    });

    return filter;
  }

  private generateFieldQuery(
    part: IObjRecordQueryItem,
    fieldInfo: IObjField | undefined,
    date: Date
  ): Record<string, Record<string, any>> {
    const fieldPath = part.field;

    // If field is not indexed, we need to generate a dynamic query
    if (!fieldInfo) {
      return this.generateDynamicQuery(part, date);
    }

    // Handle array-compressed fields
    if (fieldInfo.isArrayCompressed) {
      return this.generateArrayCompressedQuery(part, fieldInfo, date);
    }

    // Handle regular fields
    return this.generateRegularFieldQuery(part, fieldInfo, date);
  }

  private generateDynamicQuery(
    part: IObjRecordQueryItem,
    date: Date
  ): Record<string, Record<string, any>> {
    const fieldPath = part.field;

    // Check if this is an array-compressed field (contains [*])
    if (fieldPath.includes("[*]")) {
      return this.generateDynamicArrayQuery(part, date);
    }

    // Generate regular field query
    const field = `objRecord.${fieldPath}`;
    const operations: Record<string, any> = {};
    this.addFieldOperation(operations, part, date);

    return { [field]: operations };
  }

  private generateDynamicArrayQuery(
    part: IObjRecordQueryItem,
    date: Date
  ): Record<string, Record<string, any>> {
    const fieldPath = part.field;

    // Replace [*] with MongoDB array access pattern
    const arrayPath = fieldPath.replace(/\.\[\*\]/g, "");
    const field = `objRecord.${arrayPath}`;

    const operations: Record<string, any> = {};
    this.addArrayFieldOperation(operations, part, date);

    return { [field]: operations };
  }

  private generateArrayCompressedQuery(
    part: IObjRecordQueryItem,
    fieldInfo: IObjField,
    date: Date
  ): Record<string, Record<string, any>> {
    const fieldPath = part.field;

    // Remove [*] for the base path
    const basePath = fieldPath.replace(/\.\[\*\]/g, "");
    const field = `objRecord.${basePath}`;

    const operations: Record<string, any> = {};
    this.addArrayFieldOperation(operations, part, date);

    return { [field]: operations };
  }

  private generateRegularFieldQuery(
    part: IObjRecordQueryItem,
    fieldInfo: IObjField,
    date: Date
  ): Record<string, Record<string, any>> {
    const fieldPath = part.field;
    const field = `objRecord.${fieldPath}`;

    const operations: Record<string, any> = {};
    this.addFieldOperation(operations, part, date);

    return { [field]: operations };
  }

  private addArrayFieldOperation(
    fieldOps: Record<string, any>,
    part: IObjRecordQueryItem,
    date: Date
  ): void {
    const { op, value } = part;

    switch (op) {
      case "eq":
        fieldOps.$elemMatch = { $eq: value };
        break;
      case "neq":
        fieldOps.$not = { $elemMatch: { $eq: value } };
        break;
      case "gt":
        const gtValue = this.getGtGteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$elemMatch = { $gt: new Date(gtValue!) };
        } else {
          fieldOps.$elemMatch = { $gt: gtValue ?? value };
        }
        break;
      case "gte":
        const gteValue = this.getGtGteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$elemMatch = { $gte: new Date(gteValue!) };
        } else {
          fieldOps.$elemMatch = { $gte: gteValue ?? value };
        }
        break;
      case "lt":
        const ltValue = this.getLtLteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$elemMatch = { $lt: new Date(ltValue!) };
        } else {
          fieldOps.$elemMatch = { $lt: ltValue ?? value };
        }
        break;
      case "lte":
        const lteValue = this.getLtLteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$elemMatch = { $lte: new Date(lteValue!) };
        } else {
          fieldOps.$elemMatch = { $lte: lteValue ?? value };
        }
        break;
      case "like":
        const likeValue = typeof value === "string" ? value : String(value);
        const caseSensitive = part.caseSensitive ?? false;
        const regex = new RegExp(likeValue, caseSensitive ? "" : "i");
        fieldOps.$elemMatch = { $regex: regex };
        break;
      case "in":
        const inValues = Array.isArray(value) ? value : [value];
        fieldOps.$elemMatch = { $in: uniq(inValues) };
        break;
      case "not_in":
        const notInValues = Array.isArray(value) ? value : [value];
        fieldOps.$not = { $elemMatch: { $in: uniq(notInValues) } };
        break;
      case "between":
        const [min, max] = Array.isArray(value) ? value : [value, value];
        const betweenValues = this.getBetweenValue([min, max], date);
        if (betweenValues) {
          if (this.isDateValue(min) || this.isDateValue(max)) {
            fieldOps.$elemMatch = {
              $gte: new Date(betweenValues[0]),
              $lte: new Date(betweenValues[1]),
            };
          } else {
            fieldOps.$elemMatch = {
              $gte: betweenValues[0],
              $lte: betweenValues[1],
            };
          }
        } else {
          fieldOps.$elemMatch = { $gte: min, $lte: max };
        }
        break;
      case "exists":
        const existsValue = Boolean(value);
        if (existsValue) {
          fieldOps.$exists = true;
          fieldOps.$ne = [];
        } else {
          fieldOps.$exists = false;
        }
        break;
    }
  }

  private isDateValue(value: any): boolean {
    // Check if the value is an ISO date string
    if (typeof value === "string") {
      // Check for ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ or similar)
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (isoDateRegex.test(value)) {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }

      // Check for relative date patterns (e.g., "1d", "2h", "30m", "45s")
      const relativeDateRegex = /^\d+[dhms]$/;
      return relativeDateRegex.test(value);
    }

    // Check if it's already a Date object
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }

    return false;
  }

  private addFieldOperation(
    fieldOps: Record<string, any>,
    part: IObjRecordQueryItem,
    date: Date
  ): void {
    const { op, value } = part;

    switch (op) {
      case "eq":
        fieldOps.$eq = value;
        break;
      case "neq":
        fieldOps.$ne = value;
        break;
      case "gt":
        const gtValue = this.getGtGteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$gt = new Date(gtValue!);
        } else {
          fieldOps.$gt = gtValue ?? value;
        }
        break;
      case "gte":
        const gteValue = this.getGtGteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$gte = new Date(gteValue!);
        } else {
          fieldOps.$gte = gteValue ?? value;
        }
        break;
      case "lt":
        const ltValue = this.getLtLteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$lt = new Date(ltValue!);
        } else {
          fieldOps.$lt = ltValue ?? value;
        }
        break;
      case "lte":
        const lteValue = this.getLtLteValue(value, date);
        if (
          this.isDateValue(value) &&
          typeof value === "string" &&
          value.match(/^\d+[dhms]$/)
        ) {
          fieldOps.$lte = new Date(lteValue!);
        } else {
          fieldOps.$lte = lteValue ?? value;
        }
        break;
      case "like":
        const likeValue = typeof value === "string" ? value : String(value);
        const caseSensitive = part.caseSensitive ?? false;
        const regex = new RegExp(likeValue, caseSensitive ? "" : "i");
        fieldOps.$regex = regex;
        break;
      case "in":
        const inValues = Array.isArray(value) ? value : [value];
        fieldOps.$in = uniq(inValues);
        break;
      case "not_in":
        const notInValues = Array.isArray(value) ? value : [value];
        fieldOps.$nin = uniq(notInValues);
        break;
      case "between":
        const [min, max] = Array.isArray(value) ? value : [value, value];
        const betweenValues = this.getBetweenValue([min, max], date);
        if (betweenValues) {
          if (this.isDateValue(min) || this.isDateValue(max)) {
            fieldOps.$gte = new Date(betweenValues[0]);
            fieldOps.$lte = new Date(betweenValues[1]);
          } else {
            fieldOps.$gte = betweenValues[0];
            fieldOps.$lte = betweenValues[1];
          }
        } else {
          fieldOps.$gte = min;
          fieldOps.$lte = max;
        }
        break;
      case "exists":
        const existsValue = Boolean(value);
        fieldOps.$exists = existsValue;
        break;
    }
  }

  private isStringMetaQuery(value: any): value is IStringMetaQuery {
    return (
      typeof value === "object" &&
      value !== null &&
      (value.eq !== undefined ||
        value.neq !== undefined ||
        value.in !== undefined ||
        value.not_in !== undefined)
    );
  }

  private isNumberMetaQuery(value: any): value is INumberMetaQuery {
    return (
      typeof value === "object" &&
      value !== null &&
      (value.eq !== undefined ||
        value.neq !== undefined ||
        value.in !== undefined ||
        value.not_in !== undefined ||
        value.gt !== undefined ||
        value.gte !== undefined ||
        value.lt !== undefined ||
        value.lte !== undefined ||
        value.between !== undefined)
    );
  }

  private transformStringMetaQuery(
    filter: FilterQuery<IObj>,
    key: string,
    value: IStringMetaQuery,
    useFlatKeys = false
  ): void {
    const fieldKey = useFlatKeys ? key : key;

    const hasNeq = value.neq !== undefined;
    const hasIn = value.in !== undefined && value.in.length > 0;
    const hasNotIn = value.not_in !== undefined && value.not_in.length > 0;
    const hasOnlyEq = value.eq !== undefined && !hasNeq && !hasIn && !hasNotIn;

    if (hasOnlyEq) {
      filter[fieldKey] = value.eq;
      return;
    }

    // Build a single filter object for all operations
    const fieldFilter: any = {};

    if (value.eq !== undefined) {
      fieldFilter.$eq = value.eq;
    }
    if (hasNeq) {
      fieldFilter.$ne = value.neq;
    }
    if (hasIn) {
      fieldFilter.$in = uniq(value.in);
    }
    if (hasNotIn) {
      fieldFilter.$nin = uniq(value.not_in);
    }

    // Assign the field filter to the main filter
    filter[fieldKey] = fieldFilter;
  }

  private transformNumberMetaQuery(
    filter: FilterQuery<IObj>,
    key: string,
    value: INumberMetaQuery,
    date: Date,
    useFlatKeys = false
  ): void {
    const fieldKey = useFlatKeys ? key : key;

    const toDate = (v: any) => {
      if (typeof v === "number") return new Date(v);
      if (typeof v === "string") {
        const date = new Date(v);
        if (!isNaN(date.getTime())) return date;
      }
      return v;
    };

    // Check if this is a known date field
    const isDateField = ["createdAt", "updatedAt", "deletedAt"].includes(key);

    // Build a single filter object for all operations
    const fieldFilter: any = {};

    // Check if in/not_in operations are present - they take precedence over eq/neq
    const hasInNotIn =
      (value.in !== undefined && value.in.length > 0) ||
      (value.not_in !== undefined && value.not_in.length > 0);

    // Only process eq/neq if no in/not_in operations are present
    if (!hasInNotIn) {
      if (value.eq !== undefined) {
        const eqVal = isDateField ? toDate(value.eq) : value.eq;
        if (eqVal !== undefined) fieldFilter.$eq = eqVal;
      }
      if (value.neq !== undefined) {
        const neVal = isDateField ? toDate(value.neq) : value.neq;
        if (neVal !== undefined) fieldFilter.$ne = neVal;
      }
    }

    // Process in/not_in operations (they take precedence)
    if (value.in !== undefined && value.in.length > 0) {
      if (isDateField && value.in.some((v) => typeof v !== "number")) {
        fieldFilter.$in = uniq(value.in.map(toDate));
      } else {
        fieldFilter.$in = uniq(value.in);
      }
    }
    if (value.not_in !== undefined && value.not_in.length > 0) {
      if (isDateField && value.not_in.some((v) => typeof v !== "number")) {
        fieldFilter.$nin = uniq(value.not_in.map(toDate));
      } else {
        fieldFilter.$nin = uniq(value.not_in);
      }
    }

    // Process other operations
    if (value.gt !== undefined) {
      const gtValue = isDateField
        ? this.getGtGteValueAsDate(value.gt, date)
        : this.getGtGteValue(value.gt, date);
      if (gtValue !== undefined)
        fieldFilter.$gt =
          gtValue ?? (isDateField ? toDate(value.gt) : value.gt);
    }
    if (value.gte !== undefined) {
      const gteValue = isDateField
        ? this.getGtGteValueAsDate(value.gte, date)
        : this.getGtGteValue(value.gte, date);
      if (gteValue !== undefined)
        fieldFilter.$gte =
          gteValue ?? (isDateField ? toDate(value.gte) : value.gte);
    }
    if (value.lt !== undefined) {
      const ltValue = isDateField
        ? this.getLtLteValueAsDate(value.lt, date)
        : this.getLtLteValue(value.lt, date);
      if (ltValue !== undefined)
        fieldFilter.$lt =
          ltValue ?? (isDateField ? toDate(value.lt) : value.lt);
    }
    if (value.lte !== undefined) {
      const lteValue = isDateField
        ? this.getLtLteValueAsDate(value.lte, date)
        : this.getLtLteValue(value.lte, date);
      if (lteValue !== undefined)
        fieldFilter.$lte =
          lteValue ?? (isDateField ? toDate(value.lte) : value.lte);
    }
    if (value.between !== undefined) {
      const [min, max] = value.between;
      const betweenValues = this.getBetweenValue([min, max], date);
      if (betweenValues) {
        if (isDateField) {
          fieldFilter.$gte = new Date(betweenValues[0]);
          fieldFilter.$lte = new Date(betweenValues[1]);
        } else {
          fieldFilter.$gte = betweenValues[0];
          fieldFilter.$lte = betweenValues[1];
        }
      } else {
        fieldFilter.$gte = isDateField ? toDate(min) : min;
        fieldFilter.$lte = isDateField ? toDate(max) : max;
      }
    }

    // Assign the field filter to the main filter
    if (hasInNotIn) {
      delete fieldFilter.$eq;
      delete fieldFilter.$ne;
    }
    filter[fieldKey] = fieldFilter;
  }
}
