const { processPrompt, validateApiKey } = require('./lib/openrouter');

async function testErrorHandling() {
  console.log('Testing OpenRouter error handling...\n');

  // Test 1: API Key Validation
  console.log('1. Testing API key validation:');
  try {
    const validation = await validateApiKey();
    console.log('API Key validation result:', validation);
  } catch (error) {
    console.log('API Key validation error:', error.message);
  }

  // Test 2: Valid request (if API key is working)
  console.log('\n2. Testing valid request:');
  try {
    const result = await processPrompt('Hello, this is a test message');
    console.log('Success! Response:', result.response.substring(0, 100) + '...');
  } catch (error) {
    console.log('Request failed:', error.message);
  }

  // Test 3: Invalid model (should fail gracefully)
  console.log('\n3. Testing invalid model:');
  try {
    const result = await processPrompt('Test', 'invalid-model-name');
    console.log('Unexpected success:', result);
  } catch (error) {
    console.log('Expected error for invalid model:', error.message);
  }

  console.log('\nError handling tests completed.');
}

testErrorHandling().catch(console.error);