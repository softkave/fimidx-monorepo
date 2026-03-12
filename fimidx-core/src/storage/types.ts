import type { Model } from "mongoose";
import type { AnyObject } from "softkave-js-utils";
import type {
  IGranularUpdate,
  IInputObjRecord,
  IObj,
  IObjField,
  IObjQuery,
  IObjSortList,
  OnConflict,
} from "../definitions/obj.js";

// Core storage interface
export interface IObjStorage {
  // CRUD Operations
  create(params: CreateObjsParams): Promise<CreateObjsResult>;
  read(params: ReadObjsParams): Promise<ReadObjsResult>;
  update(params: UpdateObjsParams): Promise<UpdateObjsResult>;
  delete(params: DeleteObjsParams): Promise<DeleteObjsResult>;

  // Bulk/Batch Operations (Phase 1 & 2)
  bulkUpsert(params: BulkUpsertParams): Promise<BulkUpsertResult>;
  bulkUpdate(params: BulkUpdateParams): Promise<BulkUpdateResult>;
  bulkDelete(params: BulkDeleteParams): Promise<BulkDeleteResult>;
  cleanupDeletedObjs(params?: CleanupDeletedObjsParams): Promise<CleanupResult>;
  withTransaction<T>(
    operation: (storage: IObjStorage) => Promise<T>
  ): Promise<T>;
}

// Parameter types for storage operations
export interface CreateObjsParams {
  objs: IObj[];
  shouldIndex?: boolean;
}

export interface ReadObjsParams {
  query: IObjQuery;
  tag?: string; // Optional: if provided, filters by tag; if not provided, no tag filtering is applied
  page?: number;
  limit?: number;
  sort?: IObjSortList;
  fields?: Map<string, IObjField>;
  date?: Date;
  includeDeleted?: boolean;
}

export interface UpdateObjsParams {
  query: IObjQuery;
  tag?: string; // Optional: if provided, filters by tag; if not provided, no tag filtering is applied
  update?: AnyObject;
  updates?: IGranularUpdate[];
  by: string;
  byType: string;
  updateWay?: OnConflict;
  count?: number;
  shouldIndex?: boolean;
  fieldsToIndex?: string[];
  fields?: Map<string, IObjField>;
}

export interface DeleteObjsParams {
  query: IObjQuery;
  tag?: string; // Optional: if provided, filters by tag; if not provided, no tag filtering is applied
  date?: Date;
  deletedBy: string;
  deletedByType: string;
  deleteMany?: boolean;
  fields?: Map<string, IObjField>;
}

// Result types for storage operations
export interface CreateObjsResult {
  objs: IObj[];
}

export interface ReadObjsResult {
  objs: IObj[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UpdateObjsResult {
  updatedCount: number;
  updatedObjs: IObj[];
}

export interface DeleteObjsResult {
  deletedCount: number;
}

// Storage configuration
export interface StorageConfig {
  type: "mongo" | "postgres";
  mongoModel?: Model<IObj>;
}

// Query transformer interface
export interface IQueryTransformer<T> {
  transformFilter(
    query: IObjQuery,
    date: Date,
    fields?: Map<string, IObjField>
  ): T;
  transformSort(sort: IObjSortList, fields?: IObjField[]): T;
  transformPagination(page: number, limit: number): T;
}

// Extended query parameters for complex operations
export interface ExtendedReadObjsParams extends ReadObjsParams {
  batchSize?: number;
  conflictOnKeys?: string[];
  customFilters?: Record<string, any>;
}

// Bulk operation parameters
export interface BulkUpsertParams {
  items: IInputObjRecord[];
  conflictOnKeys?: string[];
  onConflict?: OnConflict;
  tag: string;
  projectId: string;
  groupId: string;
  createdBy: string;
  createdByType: string;
  shouldIndex?: boolean;
  fieldsToIndex?: string[];
  batchSize?: number;
}

export interface BulkUpsertResult {
  newObjs: IObj[];
  updatedObjs: IObj[];
  ignoredItems: IInputObjRecord[];
  failedItems: IInputObjRecord[];
  totalProcessed: number;
}

export interface BulkUpdateParams extends UpdateObjsParams {
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
}

export interface BulkUpdateResult {
  updatedCount: number;
  updatedObjs: IObj[];
  totalProcessed: number;
}

export interface BulkDeleteParams extends DeleteObjsParams {
  batchSize?: number;
  hardDelete?: boolean;
}

export interface BulkDeleteResult {
  deletedCount: number;
  totalProcessed: number;
}

export interface CleanupDeletedObjsParams {
  batchSize?: number;
  onProgress?: (processed: number) => void;
}

export interface CleanupResult {
  cleanedCount: number;
}

export interface BatchConfig {
  size: number;
  onProgress?: (processed: number, total: number) => void;
  maxConcurrency?: number;
}

export interface BatchOperationParams {
  batchConfig?: BatchConfig;
  retryAttempts?: number;
  retryDelay?: number;
}
