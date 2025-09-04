# 🚀 MominAI Hybrid Sandbox - Quick Start

## How to Launch

### Option 1: Double-click the batch file (Easiest)
1. Locate `start-dev.bat` in your project folder
2. Double-click it to run
3. The script will automatically:
   - Check for port conflicts
   - Use local Node.js if available
   - Start the development server
   - Open your browser to `http://localhost:3000`

### Option 2: Manual commands
```bash
# If you have npm in PATH:
npm run dev

# Or use the local Node.js:
node-v22.19.0-win-x64\npm.cmd run dev
```

## What You'll See

Once running, visit `http://localhost:3000` and you'll have:

### ✅ **Core Features**
- **AI Chat**: Talk with GPT-4o/mini
- **Code Execution**: Run JS/TS in browser OR Python/Node.js locally
- **Real-time Collaboration**: Create rooms for team coding
- **Model Selection**: Choose between fast (GPT-4o-mini) or powerful (GPT-4o)
- **Theme Toggle**: Dark/light mode
- **PWA Support**: Install as desktop app

### 🧪 **Test the Hybrid Execution**

1. **Frontend (Browser) Execution**:
   ```javascript
   console.log("Hello from browser!");
   for(let i = 0; i < 3; i++) {
       console.log(`Count: ${i}`);
   }
   ```
   - Select "Frontend" in dropdown
   - Click "Run Code"
   - See output in "Frontend Console" tab

2. **Backend (Local) Execution**:
   ```python
   print("Hello from Python!")
   for i in range(3):
       print(f"Python count: {i}")
   ```
   - Select "Backend" in dropdown
   - Click "Run Code"
   - See real-time output in "Backend Terminal" tab

## System Requirements

- ✅ **Node.js**: Included locally (`node-v22.19.0-win-x64/`)
- ✅ **Python**: Available in system PATH (`python3`)
- ✅ **Supabase**: Database configured
- ❌ **Docker**: NOT required!

## Troubleshooting

### If the server won't start:
1. **Port 3000 in use**: Close other dev servers
2. **Node.js issues**: Check if `node-v22.19.0-win-x64/node.exe` exists
3. **Dependencies**: Run `npm install` if needed
4. **Environment**: Check `.env.local` has Supabase credentials

### If backend execution fails:
1. **Python not found**: Install Python 3 and add to PATH
2. **Node.js not found**: The local Node.js should work for backend too
3. **Permissions**: Make sure you can execute scripts

## 🎯 Ready to Code!

Your MominAI Hybrid Sandbox combines the best of both worlds:
- **Frontend**: Fast, interactive browser execution
- **Backend**: Powerful local process execution
- **Real-time**: Live collaboration and streaming
- **No Docker**: Runs directly on your system

**Happy coding!** 🎉