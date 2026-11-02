// Used by the merge-reports CI job: shards upload blob reports, this config turns the
// combined result into one HTML report and one flaky-test summary (counted exactly once).
export default {
  testDir: './tests',
  reporter: [['html', { open: 'never' }], ['./reporters/flaky-reporter.ts'], ['list']],
};
