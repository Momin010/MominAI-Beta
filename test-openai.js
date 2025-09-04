const { processPrompt } = require('./lib/model-router');

async function testOpenAIModels() {
  const models = ['gpt-4o-mini', 'gpt-4o'];
  const testPrompt = 'Hello! Please respond with a simple greeting and tell me what model you are.';

  console.log('Testing OpenAI integration...\n');

  for (const model of models) {
    try {
      console.log(`Testing ${model}:`);
      console.log('Prompt:', testPrompt);

      const startTime = Date.now();
      const result = await processPrompt(testPrompt, model);
      const endTime = Date.now();

      console.log('Response:', result.response);
      console.log('Provider:', result.provider);
      console.log('Model used:', result.model);
      console.log('Response time:', endTime - startTime, 'ms');
      console.log('✅ Success!\n');

    } catch (error) {
      console.log('❌ Error:', error.message);
      console.log('');
    }
  }
}

testOpenAIModels().catch(console.error);