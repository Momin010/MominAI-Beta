// Comprehensive test suite for all improvements
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Starting comprehensive improvement tests...\n');

// Test scenarios
const testScenarios = [
  {
    name: 'Error Handling Tests',
    tests: [
      async () => {
        console.log('Testing error handling...');
        try {
          // Test filesystem error
          const result = await fetch(`${BASE_URL}/api/filesystem?dir=nonexistent`);
          if (result.status === 404) {
            console.log('✅ Filesystem error handling works');
            return true;
          }
        } catch (error) {
          console.log('❌ Filesystem error test failed:', error.message);
        }
        return false;
      },

      async () => {
        console.log('Testing terminal error handling...');
        try {
          const result = await fetch(`${BASE_URL}/api/terminal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'nonexistent_command_xyz' })
          });
          const data = await result.json();
          if (data.error) {
            console.log('✅ Terminal error handling works');
            return true;
          }
        } catch (error) {
          console.log('❌ Terminal error test failed:', error.message);
        }
        return false;
      }
    ]
  },

  {
    name: 'Batch Operations Tests',
    tests: [
      async () => {
        console.log('Testing batch file operations...');
        try {
          // Create test files
          const operations = [
            {
              type: 'write',
              path: 'test_batch_1.txt',
              content: 'Test content 1',
              priority: 'normal'
            },
            {
              type: 'write',
              path: 'test_batch_2.txt',
              content: 'Test content 2',
              priority: 'normal'
            }
          ];

          const result = await fetch(`${BASE_URL}/api/filesystem/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operations })
          });

          if (result.ok) {
            console.log('✅ Batch operations work');
            return true;
          }
        } catch (error) {
          console.log('❌ Batch operations test failed:', error.message);
        }
        return false;
      }
    ]
  },

  {
    name: 'Cancellation Tests',
    tests: [
      async () => {
        console.log('Testing operation cancellation...');
        try {
          // Start a long-running command
          const response = await fetch(`${BASE_URL}/api/terminal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: 'ping -t localhost', // Long-running command
              timeout: 10000
            })
          });

          const data = await response.json();
          if (data.operationId) {
            // Try to cancel it
            const cancelResult = await fetch(`${BASE_URL}/api/terminal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'cancel',
                operationId: data.operationId
              })
            });

            if (cancelResult.ok) {
              console.log('✅ Operation cancellation works');
              return true;
            }
          }
        } catch (error) {
          console.log('❌ Cancellation test failed:', error.message);
        }
        return false;
      }
    ]
  },

  {
    name: 'Progress Feedback Tests',
    tests: [
      async () => {
        console.log('Testing progress feedback...');
        try {
          // This would require frontend testing, but we can test the API responses
          const result = await fetch(`${BASE_URL}/api/filesystem/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operations: [{
                type: 'write',
                path: 'progress_test.txt',
                content: 'Progress test',
                priority: 'normal'
              }]
            })
          });

          const data = await result.json();
          if (data && data.length > 0 && 'duration' in data[0]) {
            console.log('✅ Progress feedback works');
            return true;
          }
        } catch (error) {
          console.log('❌ Progress feedback test failed:', error.message);
        }
        return false;
      }
    ]
  },

  {
    name: 'Recovery Mechanisms Tests',
    tests: [
      async () => {
        console.log('Testing recovery mechanisms...');
        try {
          // Test with invalid API call that should trigger recovery
          const result = await fetch(`${BASE_URL}/api/filesystem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'read',
              filePath: 'nonexistent_file.txt'
            })
          });

          const data = await result.json();
          if (data.error && data.code && 'recoverable' in data) {
            console.log('✅ Recovery mechanisms work');
            return true;
          }
        } catch (error) {
          console.log('❌ Recovery mechanisms test failed:', error.message);
        }
        return false;
      }
    ]
  }
];

// Run all tests
async function runTests() {
  let totalTests = 0;
  let passedTests = 0;

  for (const scenario of testScenarios) {
    console.log(`\n📋 Running ${scenario.name}...`);

    for (const test of scenario.tests) {
      totalTests++;
      const passed = await test();
      if (passed) passedTests++;
    }
  }

  console.log(`\n🎯 Test Results:`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The improvements are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

  // Cleanup test files
  console.log('\n🧹 Cleaning up test files...');
  const testFiles = ['test_batch_1.txt', 'test_batch_2.txt', 'progress_test.txt'];

  for (const file of testFiles) {
    try {
      if (fs.existsSync(path.join(process.cwd(), 'projects', file))) {
        fs.unlinkSync(path.join(process.cwd(), 'projects', file));
      }
    } catch (error) {
      console.log(`Could not clean up ${file}:`, error.message);
    }
  }

  console.log('✅ Cleanup complete.');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };