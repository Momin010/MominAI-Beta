const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log('Testing Google Gemini API integration...\n');

  // Get API key
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_GEMINI_API_KEY not found in environment variables');
    return;
  }
  console.log('✅ API key found');

  try {
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ GoogleGenerativeAI initialized');

    // Test different models (including mapped versions from PromptInput.tsx)
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-pro-latest', 'gemini-2.5-flash-exp', 'gemini-2.5-pro-exp'];

    for (const modelName of models) {
      console.log(`\n--- Testing model: ${modelName} ---`);

      try {
        // Get the model
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Model ${modelName} retrieved successfully`);

        // Test prompt
        const testPrompt = 'Hello! Please respond with a simple greeting and confirm you are working.';
        console.log(`📤 Sending prompt: "${testPrompt}"`);

        // Generate content
        const result = await model.generateContent(testPrompt);
        console.log('✅ Content generated successfully');

        // Get response
        const response = result.response.text();
        console.log(`📥 Response: "${response}"`);

        if (response && response.trim().length > 0) {
          console.log(`✅ Model ${modelName} response handling: SUCCESS`);
        } else {
          console.log(`⚠️  Model ${modelName} response handling: Empty response`);
        }

      } catch (modelError) {
        console.error(`❌ Error with model ${modelName}:`, modelError.message);
      }
    }

    console.log('\n🎉 Gemini API integration test completed!');

  } catch (error) {
    console.error('❌ Error initializing Gemini AI:', error.message);
  }
}

// Run the test
testGeminiAPI();