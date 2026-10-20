import { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import fs from 'fs';

class CountReporter implements Reporter {
  totalTests = 0; passed = 0; failed = 0; skipped = 0;
  totalExpects = 0; expectsPassed = 0; expectsFailed = 0;

  onTestEnd(test: TestCase, result: TestResult) {
    this.totalTests++;
    if (result.status === 'passed') this.passed++;
    else if (result.status === 'failed' || result.status === 'timedOut') this.failed++;
    else this.skipped++;

    const countExpects = (step: TestStep) => {
      if (step.category === 'expect') {
        this.totalExpects++;
        if (step.error) this.expectsFailed++;
        else this.expectsPassed++;
      }
      step.steps.forEach(countExpects);
    };
    result.steps.forEach(countExpects);
  }

  onEnd() {
    fs.writeFileSync('certification-results.json', JSON.stringify({
      tests: { total: this.totalTests, passed: this.passed, failed: this.failed, skipped: this.skipped },
      assertions: { total: this.totalExpects, passed: this.expectsPassed, failed: this.expectsFailed }
    }, null, 2));
  }
}
export default CountReporter;
