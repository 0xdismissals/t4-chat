# T4-Chat: Your Private, Real-Time, Cross-Device AI Chat Applications

T4-Chat is a sleek, modern, and open-source AI chat application built with Next.js and TypeScript. It's designed to be a private, locally-hosted alternative to other AI chat services, giving you full control over your data and conversations.

With a focus on a local-first architecture and a powerful real-time sync engine, T4-Chat ensures that your data is always yours, accessible across all your devices, and never stored on a central server.

> **A Note from the Developer**
>
> This project was born out of pure inspiration after I saw [Theo's post on X](https://x.com/theo/status/1931515264497254402). I built the entire application in about 8 days, and I'd estimate that 99% of it was vibe coded by AI.
>
> Using Cursor as my editor and Gemini 2.5 Pro as my developer, I brought this idea to life almost entirely through prompts and conversation, with the final 1% being just a bit of manual tinkering. And I can say it's been a wild and incredibly productive experiment and have learned alot during the process.
>
> This project is, and will always be, open source. It's still a work-in-progress, so you might find some bugs. If you're interested in improving it, please feel free to check out the roadmap below and make a contribution. I'd love the help!

![T4-Chat Screenshot](https://i.imgur.com/Ak6Z9rI.png)

## ✨ Features

- **Multi-Provider Support**: Seamlessly switch between AI models from various providers.
  - ✅ **Google Gemini**
  - ✅ **OpenAI**
  - ✅ **OpenRouter** (Connect to hundreds of models)
- **Extensible Model Library**: Add any model from the OpenRouter library to your personal model list.
- **Local-First Architecture**: All conversations, settings, and API keys are stored securely in your browser's IndexedDB. Your data never leaves your devices.
- **Real-Time P2P Sync Engine**:
  - Sync your chats, messages, and settings across multiple devices in real-time.
  - Built with **Yjs** and **WebRTC** for a robust, peer-to-peer connection that doesn't rely on a central database.
  - Sessions are **persistent and resumable** across browser refreshes.
- **Rich Content Rendering**: Displays formatted responses including code blocks (with syntax highlighting), tables, lists, and more.
- **File & Vision Support**: Attach images, PDFs, audio, or video files to your messages for models that support vision.
- **Full Chat Control**:
  - Stop message generation at any time.
  - Regenerate responses.
  - Fork conversations to explore different lines of thought.
- **Customizable AI Persona**: Tailor the AI's personality, name, and role to fit your needs.
- **PWA Ready**: Installable as a Progressive Web App for a native-like experience on desktop and mobile.
- **Modern UI/UX**:
    - Light and Dark mode support.
    - Responsive design for all screen sizes.
    - Keyboard shortcuts for power users.
- **Experimental Features**:
    - **AI Text-to-Speech**: Enable voice narration for AI messages using ElevenLabs.

## 🚀 Getting Started

Follow these instructions to get a local copy up and running.

### 1. Project Setup

**Prerequisites:**
- Node.js (v18.0 or later)
- npm, yarn, or pnpm

**Installation:**
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/t4-chat.git
    cd t4-chat
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 2. API Key Configuration

To start chatting, add your API keys for the AI providers you wish to use:

1.  Click the **Settings** icon in the application.
2.  Navigate to the **API Keys** tab.
3.  Enter your API keys. To use experimental features like Text-to-Speech, you will also need to add an API key for services like ElevenLabs. They are saved locally in your browser and are never transmitted elsewhere.

### 3. Sync Engine Setup (Optional)

To sync between devices across any network, you need to run your own signaling server and securely expose it to the internet. We recommend using **ngrok** for this.

1.  **Start the local signaling server:**
    <p>In a terminal, run the following command in the project's root directory:</p>
    <pre><code>npx y-webrtc-signaling --host 0.0.0.0 --port 4444</code></pre>

2.  **Expose the server with ngrok:**
    <p>If you don't have ngrok, <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer">download and install it</a>. In a <strong>new</strong> terminal window, run:</p>
    <pre><code>ngrok http 4444</code></pre>

3.  **Configure the app with your ngrok URL:**
    <p>Ngrok will provide a public "Forwarding" URL (e.g., <code>https://random-string.ngrok-free.app</code>). You need to use this to create a secure WebSocket URL.</p>
    <ul>
        <li>Create a file named <code>.env.local</code> in the root of your project (if it doesn't exist).</li>
        <li>Add the following line, replacing the URL with your ngrok URL. <strong>Make sure to use <code>wss://</code></strong>.</li>
    </ul>
    <pre><code>NEXT_PUBLIC_SIGNALING_URL=wss://random-string.ngrok-free.app</code></pre>
    <p><strong>Important:</strong> You must restart your Next.js development server (<code>npm run dev</code>) after creating or changing the <code>.env.local</code> file.</p>

4.  **Connect your devices:**
    <p>You can now open the app on any device, anywhere in the world. Use the pairing code or QR scanner in the <strong>Sync</strong> tab in Settings to connect them.</p>

## 🗺️ Roadmap & TODO

This project is actively developed. Here is a list of planned features and improvements:

- [ ] **Code Quality**: General code cleanup and refactoring.
- [ ] **Security**: Perform a security review of the sync engine and other core components.
- [ ] **Anthropic Provider**: Add support for Anthropic's Claude models.
- [ ] **Image Generation**: Integrate a model/provider for image generation (e.g., DALL-E 3).
- [ ] **Audio Generation**: Integrate a model/provider for audio and music generation.
- [ ] **AI Response Formatting**: Improve rendering for more complex markdown, tables, and interactive elements.
- [ ] **UI/UX Enhancements**: Continuously improve the user interface and experience.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/)
- **State Management**: React Context
- **Local Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Real-Time Sync**: [Yjs](https://github.com/yjs/yjs) (CRDTs), `y-webrtc`, `y-indexeddb`
- **AI Providers**: Google Gemini, OpenAI, OpenRouter, ElevenLabs (TTS)

## 🤝 Contributing

Contributions are welcome! If you have a suggestion or find a bug, please open an issue to discuss it.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## Disclaimer

This project is provided "as is" and "with all faults." The developers make no warranties, either expressed or implied, concerning the software, and assume no liability for any damages, whether direct, indirect, special, or consequential, that may result from its use.

The security of this application has not been thoroughly audited. You are responsible for any security implications of running this software and connecting it to third-party services. Use at your own discretion.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

Yes. Generated by AI.