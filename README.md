# Sophie - AI Language Learning Platform 

Sophie is a next-generation language learning application powered by advanced AI. It goes beyond static lessons by offering real-time, voice-driven conversations with an intelligent AI tutor. Designed for serious learners, Sophie allows users to manage multiple learning profiles, practice vocabulary, and master new languages through natural interaction.

## 🚀 Key Features

*   **🎙️ Real-Time AI Conversation**: Engage in fluid, voice-based conversations with "Sophie" (powered by Google Gemini). The AI adapts to your proficiency level and corrects you in real-time.
*   **👤 Multi-Profile System**: Learn multiple languages simultaneously. Create distinct profiles (e.g., "French for Travel", "Business Spanish") with isolated progress, settings, and vocabulary lists.
*   **🛠️ Smart Learning Tools**:
    *   **Instant Translator**: Translate text with context awareness.
    *   **Vocabulary Manager**: Save words/phrases to your personal dictionary and practice them later.
    *   **Audio Visualization**: Dynamic, reactive animations that make the AI feel alive.
*   **🔐 Enterprise-Grade Security**: robust authentication via Supabase and a custom `LargeSecureStore` implementation using AES encryption for safe local data storage.
*   **🎨 Premium One-Handed UI**: A sleek, modern interface built with NativeWind (Tailwind), optimized for one-handed usage on mobile devices.

## 🛠️ Tech Stack

*   **Framework**: [React Native](https://reactnative.dev/) (via [Expo SDK 52](https://expo.dev/))
*   **Language**: TypeScript
*   **Styling**: [NativeWind](https://www.nativewind.dev/) (TailwindCSS)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Backend & Auth**: [Supabase](https://supabase.com/)
*   **AI Engine**: [Google Gemini API](https://deepmind.google/technologies/gemini/) (WebSockets)
*   **Storage**: `expo-secure-store`, `react-native-async-storage` + AES Encryption

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18+)
*   [Expo CLI](https://docs.expo.dev/get-started/installation/)
*   iOS Simulator (Mac) or Android Emulator

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/sophie.git
    cd sophie
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory (copy from `.env.example`):
    ```bash
    cp .env.example .env
    ```
    Fill in your API keys:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
    EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
    ```

4.  **Run the app:**
    ```bash
    npx expo start
    ```
    *   Press `i` to open in iOS Simulator.
    *   Press `a` to open in Android Emulator.

## 📂 Project Structure

```
sophie/
├── app/                 # Expo Router (File-based routing)
├── components/          # Reusable UI components
├── services/            # API integrations (Gemini, Supabase, i18n)
├── stores/              # Global state (Zustand)
├── hooks/               # Custom React hooks
├── constants/           # App constants (Colors, config)
└── assets/              # Images, fonts, and icons
```

## 🔒 Security Note

This project uses a hybrid encryption storage solution (`LargeSecureStore`). Sensitive session data is encrypted with AES before being stored in standard async storage, with the encryption keys kept in the device's secure hardware store.

## 📄 License

[MIT License](LICENSE)
