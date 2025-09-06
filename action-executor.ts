import MominAIAgent from './lib/mominai-agent';

export async function runAgent(prompt: string): Promise<void> {
  const agent = new MominAIAgent();
  await agent.executeWorkflow(prompt);
}