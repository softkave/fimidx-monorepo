import { get, uniq } from "lodash-es";
import type { Model, SortOrder } from "mongoose";
import { mergeObjects, type AnyObject } from "softkave-js-utils";
import { v7 as uuidv7 } from "uuid";
import {
  prefixObjId,
  type IInputObjRecord,
  type IObj,
} from "../../definitions/obj.js";
import { MongoQueryTransformer } from "../query/MongoQueryTransformer.js";
import type {
  BulkDeleteParams,
  BulkDeleteResult,
  BulkUpdateParams,
  BulkUpdateResult,
  BulkUpsertParams,
  BulkUpsertResult,
  CleanupDeletedObjsParams,
  CleanupResult,
  CreateObjsParams,
  CreateObjsResult,
  DeleteObjsParams,
  DeleteObjsResult,
  IObjStorage,
  ReadObjsParams,
  ReadObjsResult,
  UpdateObjsParams,
  UpdateObjsResult,
} from "../types.js";

export class MongoObjStorage implements IObjStorage {
  private queryTransformer: MongoQueryTransformer;

  constructor(private objModel: Model<IObj>) {
    this.queryTransformer = new MongoQueryTransformer();
  }

  async create(
    params: CreateObjsParams,
    session?: any
  ): Promise<CreateObjsResult> {
    const objs = await this.objModel.insertMany(
      params.objs,
      session ? { session } : {}
    );
    return { objs };
  }

  async read(params: ReadObjsParams, session?: any): Promise<ReadObjsResult> {
    const filter = this.queryTransformer.transformFilter(
      params.query,
      params.date || new Date(),
      params.fields
    );

    // console.log("params.sort", params.sort);

    const sort = params.sort
      ? this.queryTransformer.transformSort(
          params.sort,
          params.fields ? Array.from(params.fields.values()) : undefined
        )
      : { createdAt: -1 as SortOrder };

    const pagination = this.queryTransformer.transformPagination(
      params.page || 0,
      params.limit || 100
    );

    // Add tag filter if provided
    if (params.tag) {
      filter.tag = params.tag;
    }

    // Add deleted filter if not including deleted and no deletedAt filter already exists
    // Note: When includeDeleted is true, we don't add any deletedAt filter
    // This means we include both deleted and non-deleted objects
    if (!params.includeDeleted && filter.deletedAt === undefined) {
      filter.deletedAt = null;
    }

    // console.log("read params");
    // console.dir(params, { depth: null });
    // console.log("read filter");
    // console.dir(filter, { depth: null });
    // console.log("read sort");
    // console.dir(sort, { depth: null });
    // console.log("read pagination");
    // console.dir(pagination, { depth: null });

    const objs = await this.objModel
      .find(filter, undefined, session ? { session } : undefined)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    return {
      objs,
      page: params.page || 0,
      limit: params.limit || 100,
      hasMore: objs.length === pagination.limit,
    };
  }

  async update(
    params: UpdateObjsParams,
    session?: any
  ): Promise<UpdateObjsResult> {
    const filter = this.queryTransformer.transformFilter(
      params.query,
      new Date(),
      params.fields
    );

    // Add tag filter if provided
    if (params.tag) {
      filter.tag = params.tag;
    }

    // Add deleted filter
    filter.deletedAt = null;

    // console.log("update filter");
    // console.dir(filter, { depth: null });
    // console.log("update update");
    // console.dir(params.update, { depth: null });

    // Find all objects to update
    const objs = await this.objModel
      .find(filter, undefined, session ? { session } : undefined)
      .lean();
    if (!objs.length) {
      return { updatedCount: 0, updatedObjs: [] };
    }

    const updateWay = params.updateWay || "replace";
    const updatedObjs: IObj[] = [];
    const date = new Date();

    for (const obj of objs) {
      // Merge objRecord using the specified strategy
      const mergedObjRecord = this.applyMergeStrategy(
        obj.objRecord,
        params.update,
        updateWay
      );
      const updatedObj: IObj = {
        ...obj,
        objRecord: mergedObjRecord,
        updatedAt: date,
        updatedBy: params.by,
        updatedByType: params.byType,
        shouldIndex: params.shouldIndex ?? obj.shouldIndex,
        fieldsToIndex:
          params.fieldsToIndex !== undefined
            ? Array.from(new Set(params.fieldsToIndex || []))
            : obj.fieldsToIndex,
      };
      await this.objModel.updateOne(
        { id: obj.id },
        { $set: updatedObj },
        session ? { session } : undefined
      );
      updatedObjs.push(updatedObj);
    }

    return {
      updatedCount: updatedObjs.length,
      updatedObjs,
    };
  }

  async delete(
    params: DeleteObjsParams,
    session?: any
  ): Promise<DeleteObjsResult> {
    const filter = this.queryTransformer.transformFilter(
      params.query,
      params.date || new Date(),
      params.fields
    );

    // Add tag filter if provided
    if (params.tag) {
      filter.tag = params.tag;
    }

    // Add deleted filter
    filter.deletedAt = null;

    const updateData = {
      deletedAt: params.date || new Date(),
      deletedBy: params.deletedBy,
      deletedByType: params.deletedByType,
    };

    // console.log("delete filter");
    // console.dir(filter, { depth: null });
    // console.log("delete updateData");
    // console.dir(updateData, { depth: null });

    const result = await this.objModel.updateMany(
      filter,
      updateData,
      session ? { session } : undefined
    );

    return {
      deletedCount: result.modifiedCount,
    };
  }

  // Phase 3: Bulk/Batch Operations Implementation

  async bulkUpsert(
    params: BulkUpsertParams,
    session?: any
  ): Promise<BulkUpsertResult> {
    const {
      items,
      conflictOnKeys = [],
      onConflict = "replace",
      tag,
      projectId,
      groupId,
      createdBy,
      createdByType,
      shouldIndex = true,
      fieldsToIndex,
      batchSize = 20,
    } = params;

    const date = new Date();
    const newObjs: IObj[] = [];
    const updatedObjs: IObj[] = [];
    const ignoredItems: IInputObjRecord[] = [];
    const failedItems: IInputObjRecord[] = [];
    let totalProcessed = 0;

    // Process items in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Find existing objects for this batch
      const existingObjs = await this.findExistingObjsForBatch({
        items: batch,
        conflictOnKeys,
        projectId,
        tag,
        date,
        session,
      });

      // console.log("existingObjs", existingObjs);
      // console.log("conflictOnKeys", conflictOnKeys);
      // console.log("batch", batch);
      // console.log("projectId", projectId);

      // Group items into new and existing
      const { newItems, existingItems } = this.groupItemsIntoNewAndExisting(
        batch,
        existingObjs
      );

      // Handle new items
      if (newItems.length > 0) {
        const createdObjs = await this.createNewObjs({
          items: newItems,
          projectId,
          tag,
          date,
          groupId,
          createdBy,
          createdByType,
          shouldIndex,
          fieldsToIndex,
          session,
        });
        newObjs.push(...createdObjs);
      }

      // Handle existing items based on conflict strategy
      if (existingItems.length > 0) {
        if (onConflict === "ignore") {
          ignoredItems.push(...existingItems.map((item) => item.inputItem));
        } else if (onConflict === "fail") {
          failedItems.push(...existingItems.map((item) => item.inputItem));
        } else {
          const updated = await this.updateExistingObjs({
            existingItems,
            onConflict,
            date,
            by: createdBy,
            byType: createdByType,
            session,
          });
          updatedObjs.push(...updated);
        }
      }

      totalProcessed += batch.length;
    }

    return {
      newObjs,
      updatedObjs,
      ignoredItems,
      failedItems,
      totalProcessed,
    };
  }

  async bulkUpdate(
    params: BulkUpdateParams,
    session?: any
  ): Promise<BulkUpdateResult> {
    const {
      query,
      tag,
      update,
      by,
      byType,
      updateWay = "mergeButReplaceArrays",
      count,
      shouldIndex,
      fieldsToIndex,
      batchSize = 1000,
      onProgress,
    } = params;

    const date = new Date();
    const filter = this.queryTransformer.transformFilter(query, date);

    // Add tag filter
    if (tag) {
      filter.tag = tag;
    }

    // Add deleted filter
    filter.deletedAt = null;

    const updatedObjs: IObj[] = [];
    let totalProcessed = 0;
    let page = 0;
    let isDone = false;

    while (!isDone) {
      let currentBatchSize = batchSize;
      if (count && count - totalProcessed < batchSize) {
        currentBatchSize = count - totalProcessed;
      }

      // console.log("bulkUpdate filter");
      // console.dir(filter, { depth: null });
      // console.log("bulkUpdate update");
      // console.dir(update, { depth: null });
      // console.log("bulkUpdate updateWay");
      // console.dir(updateWay, { depth: null });
      // console.log("bulkUpdate count");

      const objs = await this.objModel
        .find(filter, undefined, session ? { session } : undefined)
        .skip(page * currentBatchSize)
        .limit(currentBatchSize)
        .sort({ createdAt: -1 })
        .lean();

      if (objs.length === 0) {
        isDone = true;
        break;
      }

      // Apply updates to each object
      const objsToUpdate = objs.map((obj) => {
        const updatedObjRecord = this.applyMergeStrategy(
          obj.objRecord,
          update,
          updateWay
        );

        return {
          id: obj.id,
          obj: {
            ...obj,
            objRecord: updatedObjRecord,
            updatedAt: date,
            updatedBy: by,
            updatedByType: byType,
            shouldIndex: shouldIndex ?? obj.shouldIndex,
            fieldsToIndex:
              fieldsToIndex !== undefined
                ? Array.from(new Set(fieldsToIndex || []))
                : obj.fieldsToIndex,
          },
        };
      });

      // Perform bulk update
      await this.objModel.bulkWrite(
        objsToUpdate.map(({ id, obj }) => ({
          updateOne: {
            filter: { id },
            update: { $set: obj },
            ...(session ? { session } : {}),
          },
        })),
        session ? { session } : undefined
      );

      updatedObjs.push(...objsToUpdate.map((item) => item.obj));
      totalProcessed += objs.length;
      page++;

      if (onProgress) {
        onProgress(totalProcessed, count || totalProcessed);
      }

      isDone = count ? totalProcessed >= count : objs.length < currentBatchSize;
    }

    return {
      updatedCount: updatedObjs.length,
      updatedObjs,
      totalProcessed,
    };
  }

  async bulkDelete(
    params: BulkDeleteParams,
    session?: any
  ): Promise<BulkDeleteResult> {
    const {
      query,
      tag,
      date = new Date(),
      deletedBy,
      deletedByType,
      deleteMany = false,
      batchSize = 1000,
      hardDelete = false,
    } = params;

    const filter = this.queryTransformer.transformFilter(query, date);

    // Add tag filter
    if (tag) {
      filter.tag = tag;
    }

    // Add deleted filter
    filter.deletedAt = null;

    let totalProcessed = 0;
    let page = 0;
    let isDone = false;

    // If deleteMany is false, we only want to delete one object
    const effectiveBatchSize = deleteMany ? batchSize : 1;

    while (!isDone) {
      // console.log("bulkDelete filter");
      // console.dir(filter, { depth: null });
      // console.log("bulkDelete date");
      // console.dir(date, { depth: null });
      // console.log("bulkDelete deletedBy");
      // console.dir(deletedBy, { depth: null });

      const objs = await this.objModel
        .find(filter, undefined, session ? { session } : undefined)
        .skip(page * effectiveBatchSize)
        .limit(effectiveBatchSize)
        .sort({ createdAt: -1 })
        .lean();

      if (objs.length === 0) {
        isDone = true;
        break;
      }

      if (hardDelete) {
        // Hard delete
        await this.objModel.deleteMany(
          {
            id: { $in: uniq(objs.map((obj) => obj.id)) },
          },
          session ? { session } : undefined
        );
      } else {
        // Soft delete
        await this.objModel.updateMany(
          { id: { $in: uniq(objs.map((obj) => obj.id)) } },
          {
            $set: {
              deletedAt: date,
              deletedBy,
              deletedByType,
            },
          },
          session ? { session } : undefined
        );
      }

      totalProcessed += objs.length;

      // If deleteMany is false, we're done after processing one batch
      if (!deleteMany) {
        isDone = true;
      } else {
        page++;
        isDone = objs.length < effectiveBatchSize;
      }
    }

    return {
      deletedCount: totalProcessed,
      totalProcessed,
    };
  }

  async cleanupDeletedObjs(
    params?: CleanupDeletedObjsParams,
    session?: any
  ): Promise<CleanupResult> {
    const { batchSize = 1000, onProgress } = params || {};

    const filter = { deletedAt: { $ne: null } };
    let cleanedCount = 0;
    let page = 0;
    let isDone = false;

    while (!isDone) {
      const objs = await this.objModel
        .find(filter, undefined, session ? { session } : undefined)
        .skip(page * batchSize)
        .limit(batchSize)
        .lean();

      if (objs.length === 0) {
        isDone = true;
        break;
      }

      // TODO: Delete objFields if they exist
      // For now, just delete the objects
      await this.objModel.deleteMany(
        {
          id: { $in: uniq(objs.map((obj) => obj.id)) },
        },
        session ? { session } : undefined
      );

      cleanedCount += objs.length;
      page++;

      if (onProgress) {
        onProgress(cleanedCount);
      }

      isDone = objs.length < batchSize;
    }

    return { cleanedCount };
  }

  async withTransaction<T>(
    operation: (storage: IObjStorage) => Promise<T>
  ): Promise<T> {
    const session = await this.objModel.db.startSession();

    try {
      let result: T;
      await session.withTransaction(async () => {
        // Create a storage instance that passes the session to all operations
        const storageWithSession = new MongoObjStorage(this.objModel);
        // Patch all methods to use the session
        const patch =
          (fn: any) =>
          (...args: any[]) => {
            return fn.apply(storageWithSession, [...args, session]);
          };
        // Patch all public methods
        (storageWithSession as any).create = patch(storageWithSession.create);
        (storageWithSession as any).read = patch(storageWithSession.read);
        (storageWithSession as any).update = patch(storageWithSession.update);
        (storageWithSession as any).delete = patch(storageWithSession.delete);
        (storageWithSession as any).bulkUpsert = patch(
          storageWithSession.bulkUpsert
        );
        (storageWithSession as any).bulkUpdate = patch(
          storageWithSession.bulkUpdate
        );
        (storageWithSession as any).bulkDelete = patch(
          storageWithSession.bulkDelete
        );
        (storageWithSession as any).cleanupDeletedObjs = patch(
          storageWithSession.cleanupDeletedObjs
        );
        result = await operation(storageWithSession);
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }

  // Helper methods for bulk operations

  private async findExistingObjsForBatch(params: {
    items: IInputObjRecord[];
    conflictOnKeys: string[];
    projectId: string;
    tag: string;
    date: Date;
    session?: any;
  }): Promise<(IObj | undefined)[]> {
    const { items, conflictOnKeys, projectId, tag, date, session } = params;

    if (!conflictOnKeys.length) {
      return new Array(items.length).fill(undefined);
    }

    const existingObjs: (IObj | undefined)[] = [];

    for (const item of items) {
      const conflictFilter = this.buildConflictFilter({
        item,
        conflictOnKeys,
        projectId,
        tag,
      });

      if (Object.keys(conflictFilter).length === 0) {
        existingObjs.push(undefined);
        continue;
      }

      // console.log("conflictFilter", conflictFilter);

      const existing = await this.objModel
        .findOne(conflictFilter, undefined, session ? { session } : undefined)
        .lean();
      existingObjs.push(existing || undefined);
    }

    return existingObjs;
  }

  private buildConflictFilter(params: {
    item: IInputObjRecord;
    conflictOnKeys: string[];
    projectId: string;
    tag: string;
  }): any {
    const { item, conflictOnKeys, projectId, tag } = params;
    const filter: any = {
      projectId,
      tag,
      deletedAt: null,
    };

    conflictOnKeys.forEach((key) => {
      const value = get(item, key);
      if (value !== undefined) {
        filter[`objRecord.${key}`] = value;
      }
    });

    return filter;
  }

  private groupItemsIntoNewAndExisting(
    items: IInputObjRecord[],
    existingObjs: (IObj | undefined)[]
  ): {
    newItems: IInputObjRecord[];
    existingItems: { obj: IObj; inputItem: IInputObjRecord }[];
  } {
    const newItems: IInputObjRecord[] = [];
    const existingItems: { obj: IObj; inputItem: IInputObjRecord }[] = [];

    items.forEach((item, index) => {
      const existingObj = existingObjs[index];
      if (existingObj) {
        existingItems.push({ obj: existingObj, inputItem: item });
      } else {
        newItems.push(item);
      }
    });

    return { newItems, existingItems };
  }

  private async createNewObjs(params: {
    items: IInputObjRecord[];
    projectId: string;
    tag: string;
    date: Date;
    groupId: string;
    createdBy: string;
    createdByType: string;
    shouldIndex: boolean;
    fieldsToIndex?: string[];
    session?: any;
  }): Promise<IObj[]> {
    const {
      items,
      projectId,
      tag,
      date,
      groupId,
      createdBy,
      createdByType,
      shouldIndex,
      fieldsToIndex,
      session,
    } = params;

    const newObjs: IObj[] = items.map((item) => ({
      id: prefixObjId(tag, uuidv7()),
      projectId,
      tag,
      groupId,
      createdAt: date,
      createdBy,
      createdByType,
      updatedAt: date,
      updatedBy: createdBy,
      updatedByType: createdByType,
      objRecord: item,
      deletedAt: null,
      deletedBy: null,
      deletedByType: null,
      shouldIndex,
      fieldsToIndex: fieldsToIndex ? Array.from(new Set(fieldsToIndex)) : null,
    }));

    await this.objModel.insertMany(newObjs, session ? { session } : {});
    return newObjs;
  }

  private async updateExistingObjs(params: {
    existingItems: { obj: IObj; inputItem: IInputObjRecord }[];
    onConflict: string;
    date: Date;
    by: string;
    byType: string;
    session?: any;
  }): Promise<IObj[]> {
    const { existingItems, onConflict, date, by, byType, session } = params;

    const objsToUpdate = existingItems.map(({ obj, inputItem }) => {
      const updatedObjRecord = this.applyMergeStrategy(
        obj.objRecord,
        inputItem,
        onConflict as any
      );

      return {
        id: obj.id,
        obj: {
          ...obj,
          objRecord: updatedObjRecord,
          updatedAt: date,
          updatedBy: by,
          updatedByType: byType,
        },
      };
    });

    await this.objModel.bulkWrite(
      objsToUpdate.map(({ id, obj }) => ({
        updateOne: {
          filter: { id },
          update: { $set: obj },
          ...(session ? { session } : {}),
        },
      })),
      session ? { session } : undefined
    );

    return objsToUpdate.map((item) => item.obj);
  }

  private applyMergeStrategy(
    existingRecord: AnyObject,
    updateRecord: AnyObject,
    strategy: string
  ): AnyObject {
    switch (strategy) {
      case "replace":
        return updateRecord;
      case "merge":
        return { ...existingRecord, ...updateRecord };
      case "mergeButReplaceArrays":
        return mergeObjects(existingRecord, updateRecord, {
          arrayUpdateStrategy: "replace",
        });
      case "mergeButConcatArrays":
        return mergeObjects(existingRecord, updateRecord, {
          arrayUpdateStrategy: "concat",
        });
      case "mergeButKeepArrays":
        return mergeObjects(existingRecord, updateRecord, {
          arrayUpdateStrategy: "retain",
        });
      default:
        return existingRecord;
    }
  }
}
