import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

type Framework = 'react-tailwind' | 'vue-unocss' | 'html-css';

const frameworkPrompts = {
  'react-tailwind': `Generate a React component using Tailwind CSS. Return only the complete component code with proper imports and TypeScript types. Focus on modern React patterns with hooks.`,
  'vue-unocss': `Generate a Vue 3 component using UnoCSS. Return only the complete component code with proper script setup and template. Use modern Vue composition API.`,
  'html-css': `Generate clean HTML and CSS. Return only the complete HTML file with embedded CSS. Make it responsive and modern.`
};

function generatePrompt(framework: Framework, userPrompt: string, inputType: 'text' | 'image' | 'url'): string {
  const basePrompt = frameworkPrompts[framework];

  if (inputType === 'image') {
    return `${basePrompt}

Analyze the provided image and generate a ${framework} component that matches the design and layout shown in the image. Pay attention to:
- Color scheme and styling
- Layout structure
- Component composition
- Interactive elements
- Typography and spacing

Additional requirements: ${userPrompt || 'Create a modern, responsive component'}

Return only the code, no explanations.`;
  }

  if (inputType === 'url') {
    return `${basePrompt}

Analyze the website at the provided URL and recreate the main component/section in ${framework}. Focus on:
- Main layout and structure
- Key visual elements
- Color scheme
- Typography
- Interactive components

Additional requirements: ${userPrompt || 'Recreate the main component from the website'}

Return only the code, no explanations.`;
  }

  // Text prompt
  return `${basePrompt}

${userPrompt || 'Create a modern, responsive component'}

Return only the code, no explanations.`;
}

function generatePreviewHtml(framework: Framework, code: string): string {
  if (framework === 'html-css') {
    return code;
  }

  if (framework === 'react-tailwind') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-gray-100 p-8">
  <div id="root"></div>

  <script type="text/babel">
    ${code}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(GeneratedComponent));
  </script>
</body>
</html>`;
  }

  if (framework === 'vue-unocss') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
</head>
<body class="bg-gray-100 p-8">
  <div id="app"></div>

  <script>
    ${code}

    Vue.createApp(GeneratedComponent).mount('#app');
  </script>
</body>
</html>`;
  }

  return code;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google AI API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Parse form data
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'tmp'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);

    const framework = (fields.framework?.[0] as Framework) || 'react-tailwind';
    const userPrompt = fields.prompt?.[0] || '';
    const inputType = (fields.inputType?.[0] as 'text' | 'image' | 'url') || 'text';
    const url = fields.url?.[0] || '';

    let prompt = generatePrompt(framework, userPrompt, inputType);
    let imageParts: any[] = [];

    // Handle image input
    if (inputType === 'image' && files.image) {
      const imageFile = files.image[0];
      const imageBuffer = fs.readFileSync(imageFile.filepath);
      const mimeType = imageFile.mimetype || 'image/jpeg';

      imageParts = [
        {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: mimeType,
          },
        },
      ];

      // Clean up uploaded file
      fs.unlinkSync(imageFile.filepath);
    }

    // Handle URL input
    if (inputType === 'url' && url) {
      prompt += `\n\nWebsite URL to analyze: ${url}`;
    }

    // Generate content
    const result = await model.generateContent([
      prompt,
      ...imageParts,
    ]);

    const generatedCode = result.response.text().trim();

    // Generate preview HTML
    const previewHtml = generatePreviewHtml(framework, generatedCode);

    res.status(200).json({
      code: generatedCode,
      preview: previewHtml,
      framework,
    });

  } catch (error) {
    console.error('Gemini Vision API error:', error);
    res.status(500).json({
      error: 'Failed to generate component',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}