# Fnote - AI-Powered Note Taking App

Modern note-taking application with AI assistance powered by NVIDIA NIM.

## Features

- 📝 Rich text editor with Tiptap
- ⚡ Slash commands (/) for quick formatting
- 🤖 AI-powered writing assistance (NVIDIA models)
- 📁 Project and folder organization
- 💬 AI chat assistant
- ☁️ Cloud sync with Firebase (optional)
- 👤 Google Sign-In & Guest mode
- 📱 Responsive design (Desktop & Mobile)
- 💾 Local storage with import/export
- 🎨 Dark theme UI

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Editor**: Tiptap (Rich text editor)
- **AI**: NVIDIA NIM API
- **Auth & Database**: Firebase (Authentication + Firestore)
- **Deployment**: Vercel (Serverless Functions)

## Setup & Deployment

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd fnote
```

### 2. Setup Firebase (for Cloud Sync)

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** > Sign-in method > Google
4. Enable **Firestore Database** > Create database (Start in production mode)
5. Set Firestore Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### Get Firebase Config

1. Go to Project Settings > General
2. Scroll to "Your apps" > Web app
3. Copy the config values

#### Update firebase-config.js

Replace the config in `firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Configure Environment Variables

For Vercel deployment, add this environment variable:

```env
NVIDIA_API_KEY=your_nvidia_api_key_here
```

Get your NVIDIA API key from: https://build.nvidia.com/

### 4. Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel
```

#### Option B: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variable `NVIDIA_API_KEY`
4. Deploy

### 5. Local Development

For local testing:

```bash
# Install Vercel CLI
npm i -g vercel

# Start local dev server
vercel dev
```

This will start a local server with serverless functions support.

## Project Structure

```
fnote/
├── api/
│   └── ai.js           # Serverless API endpoint for NVIDIA
├── index.html          # Main HTML file
├── script.js           # Application logic
├── tiptap-setup.js     # Tiptap editor configuration
├── style.css           # Styles
└── README.md
```

## Available AI Models

The app uses NVIDIA NIM with the following models:

- GPT-OSS 120B (Recommended)
- Nemotron Super 49B
- Nemotron Ultra 253B
- Mistral Large 2
- Llama 3.1 405B
- Llama 3.3 70B
- Qwen 2.5 72B

## Usage

### Authentication

1. **Sign in with Google**: Full cloud sync, data saved to your Google account
2. **Continue as Guest**: Local storage only, can upgrade to Google account later
3. **Upgrade Guest Account**: Convert guest data to Google account (keeps all data)

### Features

1. **First Time Setup**: Complete onboarding (name, role, preferences, AI model)
2. **Create Projects**: Organize your notes into projects
3. **Write Notes**: Use the rich text editor with formatting tools
4. **Slash Commands**: Type "/" to quickly insert:
   - Headings (H1, H2, H3)
   - Lists (Bullet, Numbered, Task)
   - Quote blocks
   - Code blocks
   - Tables
   - Dividers
5. **AI Assistance**: 
   - Use "AI Fill" dropdown for quick actions (write, continue, improve, etc.)
   - Chat with AI assistant about your notes
6. **Cloud Sync**: 
   - Automatic sync when signed in with Google
   - Real-time sync across devices
   - Guest mode uses local storage only
7. **Export/Import**: Backup your data via Settings (works offline)

## API Endpoint

The app uses a single serverless function at `/api/ai` that:
- Accepts: `{ model, messages, system }`
- Returns: `{ text }`
- Handles CORS and authentication with NVIDIA API

## Security Notes

- API key is stored securely in Vercel environment variables
- No API keys are exposed to the client
- All AI requests go through the serverless proxy

## License

MIT

## Credits

Built with ❤️ using Tiptap and NVIDIA NIM
