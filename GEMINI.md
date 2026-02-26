# Bowen: AI-Powered Genogram & Psychoanalysis - Context & Guidelines

This document provides essential context and instructions for AI agents (like Gemini) working on the Bowen project.

## 🚀 Project Overview

Bowen is a specialized platform for mapping generational patterns, life context, and personal relationships using systemic psychological frameworks. It allows users to build a "Genogram" (relationship graph) and interact with an AI that has "Global Context" of their entire social and psychological landscape.

### Core Technologies
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Graph Engine:** [ReactFlow](https://reactflow.dev/) (for genogram visualization and interaction)
- **Database:** MongoDB (via `mongodb` driver)
- **Authentication:** [Clerk](https://clerk.com/)
- **AI Integration:** Google Generative AI (Gemini 1.5 Pro) and Anthropic SDK (Claude 3.5 Sonnet)
- **State Management:** Zustand (utilized via ReactFlow's dependency tree and custom store in `src/lib/store.ts`)

---

## 🏗️ Architecture & Key Concepts

### Global Context Architecture
The app's unique feature is how it feeds data to the AI. Instead of isolated chat sessions, the user's entire workspace is serialized into a structured document and provided as system instruction.
- **Graph Serialization:** Managed by `formatGraphForLLM` in `src/lib/gemini.ts`.
- **Frameworks:** Pre-defined psychological lenses (IFS, Bowen Family Systems, Attachment Theory, etc.) located in `src/lib/gemini.ts`.
- **Reflection Cards:** Thematic exercises with hardcoded system prompts in `src/app/(workspace)/cards/page.tsx`.

### Data Flow
1. **Frontend:** User interacts with the ReactFlow canvas or Reflection Cards.
2. **State:** Changes are saved to MongoDB and reflected in the local Zustand store.
3. **AI Request:** The frontend calls `/api/chat`, passing the current graph state and clinical summaries.
4. **Backend:** The API route (`src/app/api/chat/route.ts`) handles streaming responses from either Gemini or Claude, recording token usage for analytics.

---

## 🛠️ Development Workflow

### Key Commands
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Runs the built application.
- `npm run lint`: Executes ESLint for code quality checks.

### Environment Variables
The following variables are required in `.env.local`:
- `MONGODB_URI`: MongoDB connection string.
- `GEMINI_API_KEY`: Google AI API key.
- `CLAUDE_API_KEY`: Anthropic API key.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: Clerk authentication keys.

---

## 📝 Coding Conventions

- **Surgical Updates:** When modifying components or logic, maintain the existing patterns (e.g., Lucide icons, Tailwind utility classes).
- **Type Safety:** Always define interfaces for new data structures, especially for AI responses and database documents.
- **Privacy First:** Never log sensitive user data (notes, relationship details) to the console in production.
- **AI Prompting:** When updating system prompts in `src/lib/gemini.ts`, maintain the "empathetic but analytical" tone specified in the project's philosophy.

## 📂 Directory Structure Highlights
- `src/app`: Routes and API endpoints.
- `src/components`: UI components, including custom ReactFlow nodes (`PersonNode.tsx`) and edges (`RelationshipEdge.tsx`).
- `src/lib`: Core logic for AI, database, metrics, and state management.
- `src/constants`: Static data like therapeutic questions and relationship tags.
