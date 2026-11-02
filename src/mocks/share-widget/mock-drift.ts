/**
 * A route handler cannot usefully throw — the request would just hang. When a request does
 * not look like what the mock was written for, the handler records the drift and answers
 * 500; the fixture then fails the test with the recorded message at teardown.
 */
export class MockDrift {
  readonly issues: string[] = [];

  record(issue: string): void {
    this.issues.push(issue);
  }
}
