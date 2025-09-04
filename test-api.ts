async function testAPI() {
  const models = ['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'];

  for (const model of models) {
    try {
      console.log(`\nTesting ${model}:`);
      const response = await fetch('http://localhost:3000/api/test-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: 'Hello! Please respond with a simple greeting and tell me what model you are.'
        })
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        console.log('✅ Success!');
      } else {
        console.log('❌ Failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

testAPI();