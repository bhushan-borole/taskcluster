const helper = require('./helper');
const { Schema } = require('taskcluster-lib-postgres');
const { Entity } = require('taskcluster-lib-entities');
const path = require('path');
const assert = require('assert').strict;

helper.dbSuite(path.basename(__filename), function() {
  let db;

  teardown(async function() {
    if (db) {
      try {
        await db.close();
      } finally {
        db = null;
      }
    }
  });

  const schema = Schema.fromDbDirectory(path.join(__dirname, 'db'));
  const properties = {
    taskId: Entity.types.String,
    provisionerId: Entity.types.String,
    workerType: Entity.types.String,
  };
  const configuredTestTable = Entity.configure({
    partitionKey: Entity.keys.StringKey('taskId'),
    rowKey: Entity.keys.StringKey('provisionerId'),
    properties,
  });
  const serviceName = 'test-entities';

  async function insertDocuments(TestTable, num) {
    const documents = [];
    for (let i = 0; i < num; i++) {
      const entry = await TestTable.create({
        taskId: `${i}`,
        provisionerId: `provisionerId-${i}`,
        workerType: `workerType-${i}`,
      });

      documents.push(entry);
    }

    return documents;
  }

  suite('scan', function() {
    test('retrieve all on empty db', async function() {
      db = await helper.withDb({ schema, serviceName });
      const TestTable = configuredTestTable.setup({ tableName: 'test_entities', db, serviceName });

      const result = await TestTable.scan();

      assert(result instanceof Array);
      assert.equal(result.length, 0);
    });
    test('retrieve all documents (condition set to undefined)', async function() {
      db = await helper.withDb({ schema, serviceName });
      const TestTable = configuredTestTable.setup({ tableName: 'test_entities', db, serviceName });

      await insertDocuments(TestTable, 10);
      const result = await TestTable.scan();

      assert.equal(result.length, 10);
    });
    test('retrieve all documents (condition set to null)', async function() {
      db = await helper.withDb({ schema, serviceName });
      const TestTable = configuredTestTable.setup({ tableName: 'test_entities', db, serviceName });

      await insertDocuments(TestTable, 10);
      const result = await TestTable.scan(null);

      assert.equal(result.length, 10);
    });
    test('retrieve documents (with limit)', async function () {
      db = await helper.withDb({ schema, serviceName });
      const TestTable = configuredTestTable.setup({ tableName: 'test_entities', db, serviceName });

      await insertDocuments(TestTable, 10);
      const result = await TestTable.scan(null, { limit: 4 });

      assert.equal(result.length, 4);
    });
    test('retrieve all documents (with condition)', async function() {
      db = await helper.withDb({ schema, serviceName });
      const TestTable = configuredTestTable.setup({ tableName: 'test_entities', db, serviceName });

      await insertDocuments(TestTable, 10);

      const result = await TestTable.scan({
        taskId: Entity.op.equal('9'),
        provisionerId: Entity.op.equal('provisionerId-9'),
      });

      assert.equal(result.length, 1);
      assert.deepEqual(result[0].taskId, '9');
    });
    test('retrieve documents in pages', async function() {
      db = await helper.withDb({ schema, serviceName });
      const TestTable = configuredTestTable.setup({ tableName: 'test_entities', db, serviceName });

      const documents = await insertDocuments(TestTable, 10);

      let result = await TestTable.scan(null, {
        page: 1,
        limit: 4,
      });

      assert.equal(result.length, 4);
      assert.deepEqual(result[0], documents[0]);
      assert.deepEqual(result[1], documents[1]);
      assert.deepEqual(result[2], documents[2]);
      assert.deepEqual(result[3], documents[3]);

      result = await TestTable.scan(null, {
        page: 2,
        limit: 4,
      });

      assert.equal(result.length, 4);
      assert.deepEqual(result[0], documents[4]);
      assert.deepEqual(result[1], documents[5]);
      assert.deepEqual(result[2], documents[6]);
      assert.deepEqual(result[3], documents[7]);

      result = await TestTable.scan(null, {
        page: 3,
        limit: 4,
      });

      assert.equal(result.length, 2);
      assert.deepEqual(result[0], documents[8]);
      assert.deepEqual(result[1], documents[9]);

      result = await TestTable.scan(null, {
        page: 4,
        limit: 4,
      });
      assert.equal(result.length, 0);
    });
  });
});
