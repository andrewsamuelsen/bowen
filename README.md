# Bowen: AI-Powered Genogram & Psychoanalysis

Bowen is a specialized platform for mapping generational patterns, life context, and personal relationships. 

We deal with highly sensitive, deeply personal psychological data. Because of this, **transparency is our highest priority.** 

We have open-sourced this repository not just for developers, but for **users**. If you are sharing your life's history, your shadow sides, and your relationship dynamics with an AI, you deserve to know exactly how that AI is being instructed to view and analyze you.

---

## 🧠 How the AI Thinks

Unlike standard chatbots that forget who you are between sessions, Bowen uses a "Global Context" architecture. 

Every time you ask Bowen a question, draw a Reflection Card, or run a Report, the system silently compiles your entire workspace into a structured document and feeds it to the AI. This includes:
1. **Your People:** Who is in your life and your notes on them.
2. **Your Relationships:** The lines connecting people, including tags like "Enmeshed," "Draining," or "Supportive."
3. **Your Past Reflections:** The AI reads through the journal entries you've made on past cards so it never gives you redundant advice.

*If you are a developer, you can see exactly how this graph is formatted for the AI in the `formatGraphForLLM` function inside [`src/lib/gemini.ts`](src/lib/gemini.ts).*

---

## 🎴 The Reflection Cards (The Prompts)

The core of Bowen is the **Reflection Deck**. These are bite-sized psychological exercises. We have hardcoded the "System Prompts" (the hidden instructions given to the AI) for every single card directly into the codebase.

We want you to know exactly what the AI is trying to do when you click a card. We instruct the AI to be direct, constructive, and occasionally ruthless in pointing out your blind spots.

**Where to find them:**
You can read the exact, unedited system prompts for every card in the `CARDS` array located in:
👉 [`src/app/(workspace)/cards/page.tsx`](src/app/(workspace)/cards/page.tsx)

*Examples of what you'll find:*
*   **Shadow Work:** Prompts designed to identify the "lies you tell yourself" and the traits you "secretly judge others for" (Projection).
*   **Career & Vision:** Prompts instructing the AI to perform an insightful SWOT analysis and identify where you are holding yourself back.

---

## 🔬 The Reports (Synthesis Frameworks)

When you want a deep dive, Bowen can run your entire relationship graph through established psychological and systemic frameworks. 

Just like the cards, the exact instructions given to the AI to simulate these therapeutic lenses are fully public.

**Where to find them:**
You can read the system prompts for the analysis frameworks in the `FRAMEWORKS` object located in:
👉 [`src/lib/gemini.ts`](src/lib/gemini.ts)

*Frameworks included:*
*   **Internal Family Systems (IFS):** Instructs the AI to look for "Managers," "Exiles," and "Firefighters."
*   **Bowen Family Systems:** Instructs the AI to map emotional triangles, enmeshment, and differentiation of self.
*   **Attachment Theory:** Instructs the AI to identify Secure, Anxious, Avoidant, or Disorganized patterns.
*   *And more (Big 5, Transactional Analysis, MBTI).*

---

## 🔒 Security & Privacy Note

While this repository is public so you can see *how* the app works, **your data remains entirely private.** 
*   Your relationship map, notes, and chat history are securely stored in an isolated database.
*   Authentication is handled via enterprise-grade security (Clerk).
*   No one else can see your map, and your data is never used to train the base model.
