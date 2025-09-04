import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';

type Framework = 'react-tailwind' | 'vue-unocss' | 'html-css';

const frameworkPrompts = {
  'react-tailwind': `Generate a React component using Tailwind CSS that recreates the main component/section from the provided website analysis. Focus on:
- Main layout structure and visual hierarchy
- Color scheme and styling
- Typography and spacing
- Interactive elements and hover states
- Responsive design patterns

Return only the complete React component code with proper imports and TypeScript types.`,
  'vue-unocss': `Generate a Vue 3 component using UnoCSS that recreates the main component/section from the provided website analysis. Focus on:
- Main layout structure and visual hierarchy
- Color scheme and styling
- Typography and spacing
- Interactive elements and hover states
- Responsive design patterns

Return only the complete Vue component code with proper script setup and template.`,
  'html-css': `Generate clean HTML and CSS that recreates the main component/section from the provided website analysis. Focus on:
- Main layout structure and visual hierarchy
- Color scheme and styling
- Typography and spacing
- Interactive elements and hover states
- Responsive design patterns

Return only the complete HTML file with embedded CSS.`
};

async function analyzeWebsite(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status}`);
    }

    const html = await response.text();

    // Extract basic information from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'Website';

    // Extract headings
    const headingMatches = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    const headings = headingMatches.slice(0, 5).map(h => {
      const match = h.match(/<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/i);
      return {
        level: match ? parseInt(match[1]) : 1,
        text: match ? match[2] : ''
      };
    });

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const description = metaMatch ? metaMatch[1] : '';

    // Extract CSS classes and styles
    const classMatches = html.match(/class=["']([^"']+)["']/g) || [];
    const classes = Array.from(new Set(classMatches.map(match => match.match(/class=["']([^"']+)["']/)?.[1]).filter(Boolean) as string[]));

    // Extract color information from inline styles
    const colorMatches = html.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g) || [];
    const colors = Array.from(new Set(colorMatches)).slice(0, 10);

    // Extract main content structure
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : '';

    // Simple layout analysis
    const hasFlex = /display:\s*flex|flex-direction/i.test(bodyContent);
    const hasGrid = /display:\s*grid/i.test(bodyContent);

    return JSON.stringify({
      title,
      description,
      headings,
      classes: classes.slice(0, 20),
      colors,
      layout: {
        hasFlex,
        hasGrid,
        contentLength: bodyContent.length
      },
      mainContent: bodyContent.slice(0, 1000)
    }, null, 2);

  } catch (error) {
    console.error('Website analysis error:', error);
    throw new Error('Failed to analyze website');
  }
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
    const { url, framework = 'react-tailwind', prompt = '' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google AI API key not configured' });
    }

    // Analyze the website
    console.log('Analyzing website:', url);
    const scrapedData = await analyzeWebsite(url);

    // Generate component using Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const fullPrompt = `${frameworkPrompts[framework as Framework]}

Website Analysis Data:
${scrapedData}

Additional Requirements: ${prompt || 'Create a modern, responsive component based on the website analysis'}

Return only the code, no explanations.`;

    const result = await model.generateContent(fullPrompt);
    const generatedCode = result.response.text().trim();

    // Generate preview HTML
    const previewHtml = generatePreviewHtml(framework as Framework, generatedCode);

    res.status(200).json({
      code: generatedCode,
      preview: previewHtml,
      framework,
      scrapedData: JSON.parse(scrapedData)
    });

  } catch (error) {
    console.error('URL-to-code API error:', error);
    res.status(500).json({
      error: 'Failed to generate component from URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}