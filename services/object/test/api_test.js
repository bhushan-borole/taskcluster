const assert = require('assert');
const helper = require('./helper');
const testing = require('taskcluster-lib-testing');
const { fromNow } = require('taskcluster-client');

helper.secrets.mockSuite(testing.suiteName(), [], function(mock, skipping) {
  helper.withDb(mock, skipping);
  helper.resetTables(mock, skipping);
  helper.withBackends(mock, skipping);
  helper.withServer(mock, skipping);

  test('ping', async function() {
    await helper.apiClient.ping();
  });

  test('should be able to upload', async function() {
    await helper.apiClient.uploadObject('public/foo', { projectId: 'x', expires: fromNow('1 year') });
    const rows = await helper.db.fns.get_object('public/foo');

    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'public/foo');
    assert.equal(rows[0].project_id, 'x');
    assert.equal(rows[0].backend_id, 'testBackend');
    assert.deepEqual(rows[0].data, {});
  });

  test('downloadObject for a supported method succeeds', async function() {
    await helper.apiClient.uploadObject('public/foo', { projectId: 'x', expires: fromNow('1 year') });
    const res = await helper.apiClient.downloadObject('public/foo', { acceptDownloadMethods: ['HTTP:GET'] });
    assert.deepEqual(res, {
      method: 'HTTP:GET',
      details: {
        url: 'https://google.ca',
      },
    });
  });

  test('downloadObject for an unsupported method returns 406', async function() {
    await helper.apiClient.uploadObject('has/no/methods', { projectId: 'x', expires: fromNow('1 year') });
    await assert.rejects(
      () => helper.apiClient.downloadObject('has/no/methods', { acceptDownloadMethods: ['HTTP:GET'] }),
      err => err.code === 'NoMatchingMethod' && err.statusCode === 406,
    );
  });
});