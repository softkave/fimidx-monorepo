import { forEach, groupBy, uniq } from "lodash-es";
import { LRUCache } from "lru-cache";
import { v7 as uuidv7 } from "uuid";
import {
  indexJson,
  type FieldType,
  type IndexedJson,
} from "../../common/indexer.js";
import { getMongoConnection } from "../../db/fimidx.mongo.js";
import { kObjTags, prefixObjId, type IObj, type IObjField } from "../../definitions/obj.js";
import type { IProject } from "../../definitions/project.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import { getProjectsByIds } from "../project/getProjects.js";

const batchSize = 1000;

async function indexObjFields(params: {
  objs: IObj[];
  indexList: IndexedJson[];
}) {
  const { objs, indexList } = params;
  const { connection, promise } = getMongoConnection();
  await promise;
  const db = connection?.db;
  if (!db) {
    throw new Error("Mongo connection is not available");
  }

  const collection = db.collection<IObjField>("objField");

  const fieldsSet = new Map<string, IObjField>();

  indexList.forEach((index, objIndex) => {
    const obj = objs[objIndex];
    forEach(index, (indexedField, fieldPath) => {
      let field: IObjField | undefined = fieldsSet.get(fieldPath);

      if (!field) {
        field = {
          id: prefixObjId(kObjTags.objField, uuidv7()),
          path: fieldPath,
          type: indexedField.type,
          arrayTypes: indexedField.arrayTypes
            ? Array.from(indexedField.arrayTypes)
            : [],
          isArrayCompressed: indexedField.isArrayCompressed,
          projectId: obj.projectId,
          groupId: obj.groupId,
          tag: obj.tag,
          createdAt: obj.createdAt,
          updatedAt: obj.updatedAt,
        };
        fieldsSet.set(fieldPath, field);
      } else {
        // Merge array types if this field already exists
        if (indexedField.arrayTypes) {
          const existingArrayTypes = new Set(field.arrayTypes);
          indexedField.arrayTypes.forEach((type) =>
            existingArrayTypes.add(type),
          );
          field.arrayTypes = Array.from(existingArrayTypes);
        }
        field.updatedAt = obj.updatedAt;
      }
    });
  });

  const fields = Array.from(fieldsSet.values());

  let batchSize = 100;
  let batchIndex = 0;
  while (batchIndex < fields.length) {
    const batch = fields.slice(batchIndex, batchIndex + batchSize);
    const existingFields = await collection
      .find({
        projectId: batch[0].projectId,
        path: { $in: batch.map((field) => field.path) },
      })
      .limit(batchSize)
      .toArray();
    const existingFieldsMap = new Map<string, IObjField>(
      existingFields.map((field) => [
        field.path,
        {
          ...field,
          type: field.type as FieldType,
        },
      ]),
    );
    const newFields: IObjField[] = [];
    const existingFieldsToUpdate: Array<{
      id: string;
      obj: Partial<IObjField>;
    }> = [];
    batch.forEach((field) => {
      const existingField = existingFieldsMap.get(field.path);
      if (existingField) {
        existingFieldsToUpdate.push({
          id: existingField.id,
          obj: {
            arrayTypes: field.arrayTypes,
            updatedAt: field.updatedAt,
          },
        });
      } else {
        newFields.push(field);
      }
    });

    const bulkWriteOps = [
      ...newFields.map((doc) => ({
        insertOne: {
          document: doc,
        },
      })),
      ...existingFieldsToUpdate.map(({ id, obj }) => ({
        updateOne: {
          filter: { id },
          update: { $set: obj },
        },
      })),
    ];

    if (bulkWriteOps.length > 0) {
      await collection.bulkWrite(bulkWriteOps, { ordered: false });
    }
    batchIndex += batchSize;
  }
}

function initProjectGetter() {
  const cache = new LRUCache<string, IProject>({
    max: batchSize * 2,
  });

  const prefetchProjects = async (objs: IObj[]) => {
    const projectIds = uniq(objs.map((obj) => obj.projectId));
    const projects: Record<string, IProject | null> = {};
    projectIds.forEach((projectId) => {
      projects[projectId] = cache.get(projectId) ?? null;
    });
    const projectsToFetch = projectIds.filter(
      (projectId) => !projects[projectId],
    );

    if (projectsToFetch.length === 0) {
      return;
    }

    const fetchedProjects = await getProjectsByIds({
      ids: projectsToFetch,
    });

    fetchedProjects.forEach((project) => {
      cache.set(project.id, project);
    });
  };

  const getProject = (obj: IObj) => {
    const project = cache.get(obj.projectId);
    return project ?? null;
  };

  return {
    getProject,
    prefetchProjects,
  };
}

export async function indexObjsBatch(params: {
  objs: IObj[];
  getProject: (obj: IObj) => IProject | null;
}) {
  const { objs, getProject } = params;

  // TODO: eventually move to or make a background job service to avoid
  // blocking the server
  const indexList = objs.map((obj) => {
    const project = getProject(obj);
    const fieldsToIndex =
      obj.fieldsToIndex ?? project?.objFieldsToIndex ?? null;
    const rawIndex = indexJson(obj.objRecord);
    let index: IndexedJson = rawIndex;
    if (fieldsToIndex) {
      index = {};
      fieldsToIndex.forEach((field) => {
        if (rawIndex[field]) {
          index[field] = rawIndex[field];
        }
      });
    }

    return index;
  });

  await indexObjFields({ objs, indexList });
}

export async function indexObjs(params: {
  lastSuccessAt: Date | null;
  storage?: IObjStorage;
  storageType?: "mongo" | "postgres";
}) {
  const {
    lastSuccessAt,
    storageType = getDefaultStorageType(),
    storage = createStorage({ type: storageType }),
  } = params;

  const { getProject, prefetchProjects } = initProjectGetter();

  let page = 0;
  let batch: IObj[] = [];

  do {
    const cutoffDate = lastSuccessAt ?? new Date("1970-01-01T00:00:00.000Z");
    const readResult = await storage.read({
      query: {
        metaQuery: {
          updatedAt: {
            gte: cutoffDate.getTime(),
          },
          shouldIndex: true,
        },
      },
      // tag is optional - not provided means no tag filtering
      page,
      limit: batchSize,
    });

    batch = readResult.objs;
    await prefetchProjects(batch);
    const batchGroupedByProject = groupBy(batch, (obj) => obj.projectId);

    // index one batch at a time to avoid duplicating fields across batches
    await Object.values(batchGroupedByProject).reduce(async (acc, batch) => {
      await acc;
      return indexObjsBatch({ objs: batch, getProject });
    }, Promise.resolve());

    page++;
  } while (batch.length > 0);
}
