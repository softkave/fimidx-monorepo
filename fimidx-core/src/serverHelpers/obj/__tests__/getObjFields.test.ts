import { v7 as uuidv7 } from "uuid";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import type { IObjField } from "../../../definitions/obj.js";
import { getObjFields } from "../getObjFields.js";

const TEST_PROJECT_ID = "test-project-id-getObjFields";
const TEST_GROUP_ID = "test-group-id-getObjFields";
const TEST_TAG = "test-tag-getObjFields";

async function getObjFieldsCollection() {
  const { promise } = getMongoConnection();
  await promise;
  const { connection } = getMongoConnection();
  const db = connection?.db;
  if (!db) {
    throw new Error("Mongo connection is not available");
  }

  return db.collection("objField");
}

function makeObjField(overrides: Partial<IObjField> = {}): IObjField {
  const now = new Date();
  return {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId: TEST_PROJECT_ID,
    groupId: TEST_GROUP_ID,
    path: `field_${uuidv7().slice(0, 8)}`,
    type: "string",
    arrayTypes: [],
    isArrayCompressed: false,
    tag: TEST_TAG,
    ...overrides,
  };
}

describe("getObjFields integration", () => {
  let insertedIds: string[] = [];

  beforeAll(async () => {
    // Clean up any old test data
    await (
      await getObjFieldsCollection()
    ).deleteMany({
      projectId: TEST_PROJECT_ID,
      tag: TEST_TAG,
    });
  }, 20_000);

  afterEach(async () => {
    // Clean up after each test
    if (insertedIds.length > 0) {
      await (
        await getObjFieldsCollection()
      ).deleteMany({
        id: { $in: insertedIds },
      });
      insertedIds = [];
    }
  });

  afterAll(async () => {
    // Final cleanup
    await (
      await getObjFieldsCollection()
    ).deleteMany({
      projectId: TEST_PROJECT_ID,
      tag: TEST_TAG,
    });
  });

  it("returns empty result when no fields exist", async () => {
    const result = await getObjFields({
      projectId: TEST_PROJECT_ID,
      tag: TEST_TAG,
    });
    expect(result.fields).toEqual([]);
    expect(result.page).toBe(0);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });

  it("returns inserted fields and supports pagination", async () => {
    // Insert 3 fields
    const fields = [makeObjField(), makeObjField(), makeObjField()];
    await (await getObjFieldsCollection()).insertMany(fields);
    insertedIds = fields.map((f) => f.id);

    // Page 0, limit 2
    let result = await getObjFields({
      projectId: TEST_PROJECT_ID,
      tag: TEST_TAG,
      page: 0,
      limit: 2,
    });
    expect(result.fields.length).toBe(2);
    expect(result.page).toBe(0);
    expect(result.limit).toBe(2);
    expect(result.hasMore).toBe(true);
    // Page 1, limit 2
    result = await getObjFields({
      projectId: TEST_PROJECT_ID,
      tag: TEST_TAG,
      page: 1,
      limit: 2,
    });
    // Should get the remaining 1 field
    expect(result.fields.length).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it("returns only fields for the given projectId and tag", async () => {
    // Insert a field for a different project/tag
    const otherField = makeObjField({
      projectId: "other-project",
      tag: "other-tag",
    });
    await (await getObjFieldsCollection()).insertOne(otherField);
    insertedIds.push(otherField.id);
    // Insert a field for the test project/tag
    const testField = makeObjField();
    await (await getObjFieldsCollection()).insertOne(testField);
    insertedIds.push(testField.id);
    // Should only return the test project/tag field
    const result = await getObjFields({
      projectId: TEST_PROJECT_ID,
      tag: TEST_TAG,
    });
    expect(result.fields.some((f) => f.id === testField.id)).toBe(true);
    expect(result.fields.some((f) => f.id === otherField.id)).toBe(false);
  });
});
