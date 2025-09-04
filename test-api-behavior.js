// Test script to verify AI response behavior
const testCases = [
  { input: "hi", expected: "conversational" },
  { input: "what is React?", expected: "conversational" },
  { input: "build me a landing page", expected: "programming" },
  { input: "create a button component", expected: "programming" },
  { input: "explain how Next.js works", expected: "conversational" },
  { input: "write a function to calculate fibonacci", expected: "programming" }
];

async function testAPI(prompt) {
  try {
    const response = await fetch('http://localhost:3000/api/openrouter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error(`Error testing "${prompt}":`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('Testing AI response behavior...\n');

  for (const testCase of testCases) {
    console.log(`Testing: "${testCase.input}"`);
    console.log(`Expected: ${testCase.expected} response`);

    const response = await testAPI(testCase.input);

    if (response) {
      // Check if response is JSON (programming mode) or text (conversational)
      try {
        JSON.parse(response);
        console.log('Actual: programming (JSON commands)');
      } catch {
        console.log('Actual: conversational (text response)');
        console.log(`Response: ${response.substring(0, 100)}...`);
      }
    } else {
      console.log('Actual: error');
    }

    console.log('---\n');
  }
}

runTests();