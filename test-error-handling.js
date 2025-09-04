const { getConversationalResponse } = require('./src/IDE/services/aiService');

async function testErrorHandling() {
  console.log('Testing Gemini AI error handling...\n');

  // Test 1: API Key Validation
  console.log('1. Testing API key validation:');
  try {
    // Test with invalid API key first
    const result = await getConversationalResponse('Hello, this is a test message', 'ask', null);
    console.log('API Key validation result: Invalid key should fail');
  } catch (error) {
    console.log('API Key validation error (expected):', error.message);
  }

  // Test 2: Valid request (if API key is working)
  console.log('\n2. Testing valid request:');
  try {
    const result = await getConversationalResponse('Hello, this is a test message', 'ask', process.env.GOOGLE_AI_API_KEY);
    console.log('Success! Response:', result.substring(0, 100) + '...');
  } catch (error) {
    console.log('Request failed:', error.message);
  }

  // Test 3: Different modes
  console.log('\n3. Testing different modes:');
  try {
    const result = await getConversationalResponse('Create a simple React component', 'code', process.env.GOOGLE_AI_API_KEY);
    console.log('Code mode response:', result.substring(0, 100) + '...');
  } catch (error) {
    console.log('Code mode test failed:', error.message);
  }

  console.log('\nError handling tests completed.');
}

testErrorHandling().catch(console.error);