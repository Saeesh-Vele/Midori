## 🌱 Midori – Eco-Friendly AI Companion

**Midori is an AI-powered sustainability web app that helps people understand and reduce their environmental impact through carbon tracking, eco‑maps, green travel planning, and a social community.** It runs entirely in the browser (React + Vite) and integrates Firebase and Gemini to provide personalized, real‑time guidance.

---

## ✨ Features

- **AI Eco Chatbot** (`/chat`): Ask sustainability questions (recycling, lifestyle changes, product choices, impact of habits) and get answers powered by Gemini.
- **Carbon Footprint Calculator** (`/carbon`): Estimate emissions across transport, energy, travel, shopping, and waste, with tips on how to reduce them.
- **Trip Emissions Calculator** (`/trip-calculator`): Compare the CO₂ impact of different travel modes for a journey (car, bus, train, flight).
- **Eco Map** (`/eco-map`): Interactive Leaflet map that surfaces nearby eco‑friendly places such as recycling centers, composting sites, sustainable stores, and e‑waste drop‑offs.
- **Community Hub** (`/community`): Share tips, join challenges, and see activity from other users.
- **User Accounts & Profiles** (`/auth`, `/profile`): Firebase‑backed auth, profiles, points, and eco‑stats.
- **Smart Camera** (`/smart-camera`): Camera interface for scanning items, powered by `react-webcam` and AI helpers to provide recycling / reuse guidance.
- **Responsive UI & Theming**: Modern UI components, tooltips, toasts, and adaptive layouts built with Tailwind, Radix UI, and Lucide icons.

All routes are wired in `App.tsx` and rendered via `BrowserRouter` from React Router.

---

## 🛠 Tech Stack

| Area        | Technology                                                                 |
|------------|-----------------------------------------------------------------------------|
| Framework  | React 18, TypeScript                                                        |
| Tooling    | Vite, ESLint, TypeScript                                                    |
| Styling    | Tailwind CSS, Tailwind Typography, class-variance-authority, tailwind-merge |
| UI         | Radix UI primitives, custom components (buttons, inputs, dialogs, toasts)   |
| State/Data | @tanstack/react-query                                                       |
| Maps       | Leaflet, React Leaflet, OpenStreetMap                                       |
| AI         | Google Gemini API (via custom service)                                     |
| Backend    | Firebase (Auth, Firestore/Storage – via `src/services/firebase.ts`)         |
| Other      | React Hook Form, Zod, Recharts, react-dropzone, react-webcam                |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or newer
- **npm** (comes with Node) or another package manager
- A **Firebase project** (for Auth + data)
- A **Gemini API key** (for the AI features)

### Install & Run

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

By default Vite serves on `http://localhost:5173` (or the next available port).

---

## ⚙️ Environment Variables

Create a `.env` file in the project root and provide the necessary config for Gemini and Firebase. A typical setup looks like:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Refer to `src/services/gemini.ts` and `src/services/firebase.ts` to see how these values are used.

---

## 📂 Project Structure (High Level)

```text
src/
  App.tsx              # App shell and route definitions
  main.tsx             # React entry point
  index.css            # Global styles (Tailwind)
  pages/               # Route pages (Index, Auth, Profile, CarbonCalculator, EcoMap, etc.)
  components/          # Reusable UI + feature components (EcoChatbot, SmartCamera, etc.)
  components/ui/       # Design system primitives (button, input, dialog, toast, etc.)
  components/carbon/   # Carbon calculator views
  components/chat/     # Chat / reuse-recycle UI
  components/ai/       # Voice AI assistant
  services/            # API, Gemini, Firebase, user services
  contexts/            # React context (AuthContext)
  hooks/               # Custom hooks (e.g. toast, mobile)
  config/              # API / app configuration
```

---

## 📜 Scripts

From `package.json`:

- **`npm run dev`** – start the Vite development server.
- **`npm run build`** – create a production build.
- **`npm run build:dev`** – build using the `development` mode.
- **`npm run preview`** – preview the production build locally.
- **`npm run lint`** – run ESLint across the project.

---

## 🤝 Contributing

- Please read `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` before opening pull requests or issues.
- Use `npm run lint` to ensure your code passes basic checks.
- Prefer small, focused PRs with clear descriptions and screenshots or screen recordings for UI changes.

---

## 🔒 Security

Security considerations and responsible disclosure guidelines are documented in `SECURITY.md`. Never commit secrets (API keys, service account JSON, etc.) to the repository—keep them only in `.env` or your deployment environment.

---

## 📄 License

This project is open source under the terms of the **MIT License**. See `LICENSE` for details.

---

## 🌍 Vision

Midori aims to make sustainable living **easy, transparent, and motivating** by combining AI guidance, real‑world eco‑resources, and a supportive community. Every small action inside the app is a step toward a greener planet.
