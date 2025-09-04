import { processPrompt } from './lib/openrouter.ts';

async function testOpenRouterIntegration() {
  const models = ['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'];
  const testPrompt = 'Hello! Please respond with a simple greeting and tell me what model you are.';

  console.log('Testing OpenRouter integration...\n');

  for (const model of models) {
    try {
      console.log(`Testing ${model}:`);
      console.log('Prompt:', testPrompt);

      const startTime = Date.now();
      const result = await processPrompt(testPrompt, model);
      const endTime = Date.now();

      console.log('Response:', result.response);
      console.log('Model used:', result.model);
      console.log('Usage:', result.usage);
      console.log('Response time:', endTime - startTime, 'ms');
      console.log('✅ Success!\n');

    } catch (error) {
      console.log('❌ Error:', (error as Error).message);
      console.log('');
    }
  }
}

testOpenRouterIntegration().catch(console.error);