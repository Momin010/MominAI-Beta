// Simple test script for the /api/run-backend route
// This tests the basic structure without Docker dependencies

const http = require('http');

const testData = {
  code: 'print("Hello, World!")',
  language: 'python',
  userContext: {
    userId: 'test-user-123',
    roomId: 'test-room-456',
    sessionName: 'Test Execution'
  }
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/test-run-backend',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(testData))
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response body:', body);
    try {
      const parsed = JSON.parse(body);
      console.log('Parsed response:', parsed);
    } catch (e) {
      console.log('Response is not JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify(testData));
req.end();

console.log('Test request sent to /api/test-run-backend');