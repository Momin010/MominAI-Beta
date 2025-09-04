
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Diagnostic, DependencyReport, AIFixResponse, EditorActionCommand } from '../types';

const getAiClient = (apiKey: string | null): GoogleGenerativeAI => {
    if (!apiKey) {
        throw new Error("Gemini API key not found. Please set it in the settings panel.");
    }
    try {
        return new GoogleGenerativeAI(apiKey);
    } catch (e) {
        console.error("Failed to initialize GoogleGenAI:", e);
        throw new Error("Failed to initialize Gemini AI. The API key might be invalid.");
    }
};

const AGENT_SYSTEM_INSTRUCTION = `You are an expert, autonomous pair programming assistant, "MominAI", integrated directly into a web-based IDE. Your goal is to fulfill the user's request by generating a precise sequence of actions that will be executed programmatically. You must think step-by-step and use the available tools to modify the user's codebase.

**CONTEXT**
- You have access to the entire file system of the project.
- The user can see your actions happen in real-time, so be logical and efficient.
- You operate by outputting a stream of JSON "action" objects.

**RESPONSE FORMAT**
- Your ENTIRE output must be a stream of raw JSON objects.
- Do NOT use markdown fences (e.g., \`\`\`json).
- Do NOT add any conversational text, greetings, or explanations before, after, or outside of the JSON objects.
- Each JSON object must be a single, complete action.

**AVAILABLE ACTIONS TOOLBOX**
You must use the following JSON objects for your actions:

1.  **comment(text: string)**: Communicate your thought process to the user. Use this to explain what you're about to do.
    \`{ "action": "comment", "text": "Okay, I will start by adding the new state variable to the App component." }\`

2.  **createFile(path: string, content: string)**: Create a new file. The path must be absolute (e.g., \`/src/components/MyComponent.tsx\`).
    \`{ "action": "createFile", "path": "/src/utils/helpers.js", "content": "export const newUtil = () => {};" }\`

3.  **openFile(path: string)**: Open an existing file in the editor. This must be done before you can edit it.
    \`{ "action": "openFile", "path": "/src/App.jsx" }\`

4.  **moveCursor(line: number, column: number)**: Move the cursor to a specific position in the currently open file.
    \`{ "action": "moveCursor", "line": 15, "column": 5 }\`

5.  **type(text: string)**: Type text at the current cursor position. Use \`\\n\` for new lines.
    \`{ "action": "type", "text": "const [count, setCount] = useState(0);\\n" }\`

6.  **select(startLine: number, startColumn: number, endLine: number, endColumn: number)**: Select a block of text.
    \`{ "action": "select", "startLine": 10, "startColumn": 1, "endLine": 12, "endColumn": 1 }\`

7.  **replace(text: string)**: Replace the currently selected text. Must be preceded by a \`select\` action.
    \`{ "action": "replace", "text": "const [value, setValue] = useState('');" }\`

8.  **delete(lines: number)**: Delete a specified number of lines forward from the current cursor position.
    \`{ "action": "delete", "lines": 3 }\`

9.  **finish(reason: string)**: Announce that you have completed the user's request. This must be the VERY LAST action in your plan.
    \`{ "action": "finish", "reason": "I have successfully added the new state variable and integrated it into the component." }\`

**WORKFLOW**
1.  Acknowledge the request and state your plan using the \`comment\` action.
2.  Use a sequence of \`openFile\`, \`moveCursor\`, \`type\`, \`select\`, \`replace\`, and \`delete\` to perform the edits.
3.  Be precise with line and column numbers.
4.  Once all edits are done, use the \`finish\` action.`;


export async function* streamAIActions(prompt: string, files: {path: string, content: string}[], apiKey: string | null): AsyncGenerator<EditorActionCommand> {
    const ai = getAiClient(apiKey);
    const fullPrompt = `The user wants to make the following change: "${prompt}".\n\nHere is the current project structure and content:\n${files.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n')}\n\nGenerate the stream of JSON actions to fulfill the request.`;

    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: AGENT_SYSTEM_INSTRUCTION });
        const responseStream = await model.generateContentStream(fullPrompt);
        
        let buffer = '';
        let braceCount = 0;
        let objectStartIndex = -1;

        for await (const chunk of responseStream.stream) {
            const chunkText = chunk.text();
            buffer += chunkText;
            let i = 0;
            while (i < buffer.length) {
                if (buffer[i] === '{') {
                    if (braceCount === 0) {
                        objectStartIndex = i;
                    }
                    braceCount++;
                } else if (buffer[i] === '}') {
                    braceCount--;
                    if (braceCount === 0 && objectStartIndex !== -1) {
                        const objectStr = buffer.substring(objectStartIndex, i + 1);
                        try {
                            const action = JSON.parse(objectStr);
                            yield action as EditorActionCommand;
                        } catch (e) {
                            // Incomplete JSON, but shouldn't happen if braces match.
                            // Could be a streaming artifact. We'll just continue buffering.
                            console.warn("Could not parse JSON object, might be partial:", objectStr);
                        }
                        // Reset for the next object
                        buffer = buffer.substring(i + 1);
                        i = -1; 
                        objectStartIndex = -1;
                    }
                }
                i++;
            }
        }
    } catch (error) {
        console.error("Error getting AI action stream:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        throw new Error(errorMessage.includes('API key not valid') ? 'Invalid Gemini API key.' : errorMessage);
    }
}


// --- Legacy and other AI functions ---

export const generateCodeForFile = async (userPrompt: string, fileName: string, apiKey: string | null): Promise<string> => {
    const ai = getAiClient(apiKey);
    const prompt = `You are an expert programmer. A user wants to create a file named "${fileName}". Based on their request, generate the complete, production-ready code for this file. Do not add any conversational text, explanations, or markdown formatting like \`\`\` around the code. Only output the raw code for the file content.\nUser's request: "${userPrompt}"`;
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
};

export const getInlineCodeSuggestion = async (codeBeforeCursor: string, apiKey: string | null): Promise<string> => {
    if (codeBeforeCursor.trim().length < 10) return "";
    const ai = getAiClient(apiKey);
    const prompt = `You are an AI code completion assistant. Given the code before the cursor, provide a single-line or multi-line code completion. Only output the code to be completed, with no explanation or markdown.\n\n---\n\n${codeBeforeCursor}`;
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text();
};

export const getSuggestedFix = async (fileContent: string, problem: Diagnostic, activeFile: string, apiKey: string | null): Promise<string> => {
    const ai = getAiClient(apiKey);
    const prompt = `Given the file "${activeFile}" with the following content:\n\n${fileContent}\n\nThere's an issue on line ${problem.line}: "${problem.message}". The problematic line content is: "${fileContent.split('\n')[problem.line - 1]}". Provide a single line of code that fixes this issue. Do not provide explanation or markdown.`;
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
};

export const generateComponentSet = async (componentName: string, description: string, apiKey: string | null): Promise<{ files: { name: string, content: string }[] }> => {
    const ai = getAiClient(apiKey);
    const prompt = `Generate a set of files for a new React component named "${componentName}". The component should be written in TypeScript with JSX (.tsx) and include a basic test file (.test.tsx) and a CSS module file (.module.css). The component should be based on this description: "${description}". Your output must be a single raw JSON object with the structure: {"files": [{"name": "FileName.tsx", "content": "File content here..."}, ...]}`;
    
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(prompt);

    try {
        const responseText = response.response.text();
        const jsonMatch = responseText.match(/({[\s\S]*})/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
        }
        throw new Error("AI response was not valid JSON for component set.");
    } catch(e) {
        console.error("Failed to parse component set from AI:", response.response.text(), e);
        throw new Error("AI returned an invalid response for the component set.");
    }
};

export const generateCommitMessage = async (files: {path: string, content: string}[], apiKey: string | null): Promise<string> => {
    const ai = getAiClient(apiKey);
    const prompt = `Generate a conventional commit message for these file changes:\n\n${files.map(f => `Path: ${f.path}\nContent:\n${f.content}`).join('\n---\n')}`;
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
}

// Fix: Add missing AI service functions
export const generateRegex = async (description: string, apiKey: string | null): Promise<string> => {
    throw new Error("Regex generation is not implemented in this version.");
};

export const deployProject = async (): Promise<{ success: boolean; url: string; }> => {
    throw new Error("Project deployment is not implemented in this version.");
};

export const migrateCode = async (code: string, from: string, to: string, apiKey: string | null): Promise<string> => {
    throw new Error("Code migration is not implemented in this version.");
};

export const analyzeCodeForBugs = async (code: string, apiKey: string | null): Promise<Omit<Diagnostic, 'source'>[]> => {
    throw new Error("Bug analysis is not implemented in this version.");
};

export const scaffoldProject = async (prompt: string, apiKey: string | null): Promise<Record<string, string>> => {
    throw new Error("Project scaffolding is not implemented in this version.");
};

export const generateDocsForCode = async (code: string, filePath: string, apiKey: string | null): Promise<string> => {
    throw new Error("Documentation generation is not implemented in this version.");
};

export const generateMermaidDiagram = async (code: string, apiKey: string | null): Promise<string> => {
    throw new Error("Mermaid diagram generation is not implemented in this version.");
};

export const optimizeCss = async (css: string, apiKey: string | null): Promise<string> => {
    throw new Error("CSS optimization is not implemented in this version.");
};

export const analyzeDependencies = async (packageJsonContent: string, apiKey: string | null): Promise<DependencyReport> => {
    throw new Error("Dependency analysis is not implemented in this version.");
};

export const generateTestFile = async (code: string, filePath: string, apiKey: string | null): Promise<string> => {
    throw new Error("Test file generation is not implemented in this version.");
};

export const generateTheme = async (description: string, apiKey: string | null): Promise<Record<string, string>> => {
    throw new Error("Theme generation is not implemented in this version.");
};


// Functions below are for plugins and could be refactored or kept as is.

export const generateCodeFromFigma = async (url: string, figmaToken: string, prompt: string, apiKey: string | null): Promise<string> => {
    throw new Error("Figma import is not implemented in this version.");
};

export const generateCodeFromImage = async (base64Image: string, prompt: string, apiKey: string | null): Promise<string> => {
    throw new Error("Image to code is not implemented in this version.");
};

export const reviewCode = async (code: string, apiKey: string | null): Promise<Omit<Diagnostic, 'source'>[]> => {
    throw new Error("Code review is not implemented in this version.");
};

export const getCodeExplanation = async (code: string, apiKey: string | null): Promise<string> => {
    const ai = getAiClient(apiKey);
    const prompt = `Explain the following code snippet concisely:\n\n\`\`\`\n${code}\n\`\`\``;
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text();
};

export const getConversationalResponse = async (prompt: string, mode: string = 'ask', apiKey: string | null): Promise<string> => {
    const ai = getAiClient(apiKey);

    const getSystemPrompt = (currentMode?: string) => {
        const basePrompt = `You are a professional AI coding assistant specialized in React, TypeScript, and modern web development. Generate high-quality, production-ready code with extensive styling and animations.

## PROJECT CONTEXT:
- Next.js 13+ with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- React Hot Toast for notifications
- Supabase for backend services
- Modern, responsive design patterns
- Component-based architecture

## CODE QUALITY STANDARDS:
- Use TypeScript with proper type definitions
- Implement comprehensive error handling
- Follow React best practices and hooks
- Create reusable, modular components
- Include proper accessibility attributes
- Optimize for performance and maintainability`;

        switch (currentMode) {
            case 'ask':
                return `${basePrompt}

## ASK MODE:
- Pure conversational responses only
- Answer questions directly about code, development, and best practices
- No code generation or JSON commands
- Focus on explanation, guidance, and technical information
- Provide detailed explanations when needed`;

            case 'code':
                return `${basePrompt}

## CODE MODE - HIGH-QUALITY CODE GENERATION:
Generate complete, professional React components with extensive Tailwind CSS styling and animations.

## COMPONENT REQUIREMENTS:
- Complete React components with proper imports
- TypeScript interfaces and type safety
- Extensive Tailwind CSS classes for modern design
- Framer Motion animations and transitions
- Responsive design (mobile-first approach)
- Accessibility features (ARIA labels, keyboard navigation)
- Error boundaries and loading states
- Clean, maintainable code structure`;

            case 'architect':
                return `${basePrompt}

## ARCHITECT MODE:
- Focus on planning and task management for complex development projects
- Break down tasks into clear, actionable steps
- Create structured development workflows
- Provide high-level architecture guidance
- Consider scalability, maintainability, and best practices`;

            default:
                return `${basePrompt}

## DEFAULT MODE:
- Auto-detect user intent from input
- Use conversational responses for questions and explanations
- Generate high-quality code commands for programming requests
- Provide technical guidance and best practices
- Adapt response style based on user needs`;
        }
    };

    const messages = [
        {
            role: 'system',
            content: getSystemPrompt(mode),
        },
        {
            role: 'user',
            content: prompt,
        },
    ];

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(prompt);

    return response.response.text().trim();
};