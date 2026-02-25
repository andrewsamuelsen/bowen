export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  summarized?: boolean;
}

export type AnalysisFramework = 'attachment' | 'ifs' | 'big5' | 'family_systems' | 'transactional' | 'mbti';

export const FRAMEWORKS: Record<AnalysisFramework, { title: string, description: string, systemPrompt: string }> = {
  attachment: {
    title: "Attachment Theory",
    description: "Analyze emotional bonds, identifying Secure, Anxious, Avoidant, or Disorganized patterns.",
    systemPrompt: `You are an expert in Attachment Theory (Bowlby/Ainsworth). 
    Analyze the provided relationship graph.
    - Identify the user's likely primary attachment style based on their descriptions of key figures (Parents/Partners).
    - Point out specific relationships that demonstrate 'Anxious' or 'Avoidant' dynamics.
    - Highlight 'Secure Bases' vs. 'Threats'.
    - Provide actionable advice for moving towards 'Earned Security'.`
  },
  ifs: {
    title: "Internal Family Systems (IFS)",
    description: "Identify 'Managers', 'Exiles', and 'Firefighters' within your internal system.",
    systemPrompt: `You are an expert in Internal Family Systems (IFS) therapy (Richard Schwartz).
    Analyze the relationship graph as an "External System" that reflects the user's "Internal System".
    - Which relationships trigger "Protector" parts (Managers)? (e.g. feeling 'Guarded', 'Responsible').
    - Which relationships trigger "Exiles"? (e.g. feeling 'Ashamed', 'Small', 'Hurt').
    - Which relationships trigger "Firefighters"? (e.g. 'Rebellious', 'Numb').
    - Identify the "Self" energy: Where does the user feel calm, curious, and compassionate?`
  },
  big5: {
    title: "Big 5 / Personality",
    description: "Infer personality traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism).",
    systemPrompt: `You are an expert personality psychologist.
    Analyze the user's graph to infer their likely standing on the Big 5 traits (OCEAN).
    - High/Low Neuroticism: Based on frequency of 'Anxious', 'Volatile', vs 'Stable' tags.
    - High/Low Agreeableness: Based on 'Conflict', 'Resentful' vs 'Supportive', 'Pleaser'.
    - Extraversion: Based on social energy tags ('Draining' vs 'Energizing').
    - Note: This is speculative based on relationship dynamics. Phrase it as "You seem to value..." or "You might lean towards..."`
  },
  family_systems: {
    title: "Bowen Family Systems",
    description: "Map triangles, enmeshment, differentiation of self, and emotional cut-offs.",
    systemPrompt: `You are an expert in Bowen Family Systems Theory.
    Analyze the graph to map the emotional field.
    - Identify "Triangles": Where is the user caught between two others? (Look for Observer/Impact roles like 'Mediator').
    - Identify "Differentiation of Self": Where is the user 'Enmeshed' vs 'Cut-off' vs 'Differentiated'?
    - Identify "Multigenerational Transmission": Are there repeating patterns with parents/siblings?
    - Suggest one move to "De-triangulate".`
  },
  transactional: {
    title: "Transactional Analysis",
    description: "Analyze Parent-Adult-Child communication dynamics.",
    systemPrompt: `You are an expert in Transactional Analysis (Berne).
    Analyze the dynamics in the graph.
    - Where is the user playing the "Parent" (Critical or Nurturing)?
    - Where is the user playing the "Child" (Adapted or Free)?
    - Where are the "Adult-to-Adult" relationships?
    - Identify "Games" being played (e.g. "Kick Me", "I'm Only Trying to Help").`
  },
  mbti: {
    title: "Myers-Briggs (MBTI)",
    description: "Analyze cognitive functions and likely type preferences (e.g. INTJ, ESFP).",
    systemPrompt: `You are an expert in Myers-Briggs Type Indicator (MBTI) and Cognitive Functions (Jung).
    Analyze the provided relationship graph to hypothesize the types of the people involved.
    
    Task:
    - For EACH person in the graph (including the User), deduce their likely 4-letter type (e.g., INTJ, ESFP).
    - Base this on their relationship dynamics, conflict styles, and tags (e.g. "Critical" might suggest high Te, "Emotional" might suggest high Fi/Fe).
    
    CRITICAL INSTRUCTION FOR MISSING DATA:
    - If there is not enough information to form a solid hypothesis, you MUST state "Insufficient Data" or "Limited Data".
    - Do NOT hallucinate a type.
    - You can say "Likely Introverted based on 'Quiet' tag, but other functions unclear."
    
    Format:
    - Person Name: **Likely Type** (Confidence Level: High/Medium/Low/None)
    - Reasoning: [Brief explanation citing specific tags/behaviors]
    `
  }
};

export async function streamChat(
  message: string,
  history: ChatMessage[],
  systemInstruction: string,
  onChunk: (text: string) => void
) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, systemInstruction }),
  });

  if (!response.ok) throw new Error(await response.text());

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      fullText += chunk;
      onChunk(chunk);
    }
  }
  return fullText;
}

export async function generateAnalysis(
  graph: { people: any[], relationships: any[], cardSessions?: any[] },
  framework: AnalysisFramework,
  chatHistory: string = "",
  clinicalSummary: string = ""
): Promise<string> {
  const selectedFramework = FRAMEWORKS[framework];
  const formattedGraph = formatGraphForLLM(graph);
  
  const prompt = `
    ${selectedFramework.systemPrompt}

    Here is the User's Relationship Context:
    ${formattedGraph}

    ${clinicalSummary ? `
    Here is a Clinical Summary of the User's overall chat interactions/history:
    ${clinicalSummary}
    ` : ""}

    ${chatHistory ? `
    Here is the User's recent, unsummarized chat interactions/history:
    ${chatHistory}
    ` : ""}

    Task:
    Provide a concise, insightful report (markdown format).
    - Use bolding for key terms.
    - Be empathetic but analytical.
    - Cite specific tags/notes from the graph to support your insights.
    - Focus on relationships with the most complete data (tags, questions, chat info). Briefly mention this in the analysis, and suggest adding more information in the other relationships for better analaysis.
  `;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message: "Please generate the analysis based on the provided data.", 
      history: [], 
      systemInstruction: prompt,
      model: "claude-sonnet-4-6"
    }),
  });

  if (!response.ok) throw new Error(await response.text());
  
  // Non-streaming for analysis report (just wait for it all)
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value);
    }
  }
  return fullText;
}

export async function generateTherapeuticQuestion(
  relationship: string,
  category: string,
  tags: string[],
  history: ChatMessage[] = [],
  questionIndex: number = 1, // 1-based index
  totalQuestions: number = 5,
  is3rdParty: boolean = false
): Promise<string> {
  const isImpactCategory = is3rdParty && (category === 'Impact/Role' || category === 'impact');

  let systemContext = "";

  if (is3rdParty) {
    if (isImpactCategory) {
      systemContext = `
        You are an empathetic, insightful therapist helping a user explore THEIR OWN ROLE in a relationship they are observing between two other people ("${relationship}").
        Context:
        - Category: "${category}"
        - Selected Tags (Describing the User's role or experience, NOT how the other people act towards the user): ${tags.join(', ')}
        - Progress: Question ${questionIndex} of ${totalQuestions}.
        Strategy:
        1. **Question 1 (The Primary Impact):** Focus on the most intense tag. Ask for a specific recent interaction where the user felt this way or played this role.
        2. **Question 2 (The Role Definition):** How did it feel? Was it a choice or reflex?
        3. **Question 3 (The Broader Cost):** How does this affect your energy outside of interactions?
        4. **Question 4 (System Patterns):** Who pulls you into this role more?
        5. **Question 5 (Boundaries/Future):** If you could change one thing about your reaction next time?
      `;
    } else {
      systemContext = `
        You are an empathetic, insightful therapist helping a user understand a relationship they are OBSERVING between two other people ("${relationship}").
        Context:
        - Category: "${category}"
        - Observed Tags: ${tags.join(', ')}
        - Progress: Question ${questionIndex} of ${totalQuestions}.
        Strategy:
        1. **Question 1 (Observation):** Focus on observed tags. Ask for a specific example.
        2. **Question 2 (The System/History):** How long has this been observed?
        3. **Question 3 (The Counter-Pivot):** Look for the exception in their dynamic.
        4. **Question 4 (Triangulation):** Does this dynamic spill over?
        5. **Question 5 (Acceptance):** What do you accept about this dynamic?
      `;
    }
  } else {
    systemContext = `
      You are an empathetic, insightful therapist helping a user build a comprehensive "Relationship Profile" through a structured 5-question exercise.
      Context:
      - Relationship: "${relationship}"
      - Category: "${category}"
      - Selected Tags: ${tags.join(', ')}
      - Progress: Question ${questionIndex} of ${totalQuestions}.
      Strategy:
      1. **Question 1 (The Present Reality):** Focus on tags. Ask for a recent example.
      2. **Question 2 (The Origin Story / Past):** Was it always this way?
      3. **Question 3 (The Counter-Pivot / The Exception):** Look for an exception to the prevailing sentiment.
      4. **Question 4 (The Mechanics & Patterns):** Communication styles or recurring conflicts.
      5. **Question 5 (The Future / Resolution):** What needs to change or be accepted?
    `;
  }

  const promptSuffix = `
    Guidelines: Short (1-2 sentences), standalone prompt card style, curious and warm. Minimal formatting. No need to write "Question 1."
    Current History (Previous Q&A):
    ${history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}
  `;

  const fullPrompt = systemContext + promptSuffix;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message: "Please generate the next therapeutic question based on the provided strategy.", 
      history: [], 
      systemInstruction: fullPrompt 
    }),
  });

  if (!response.ok) throw new Error(await response.text());
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value);
    }
  }
  return fullText || `You mentioned ${tags.join(', ')}. How does this manifest?`;
}

export async function summarizeChat(
  currentSummary: string, // Kept for backwards compatibility but not used in prompt
  newMessages: ChatMessage[]
): Promise<string> {
  const prompt = `
    You are a clinical supervisor writing a session note for a patient's ongoing psychological profile.
    
    New Interaction Transcript:
    ${newMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}
    
    Task:
    - Write a brief, dense clinical note (1-2 paragraphs) summarizing ONLY the insights from this specific transcript.
    - Focus on new psychological patterns, relationship dynamics, conflicts, and growth.
    - DO NOT rewrite or summarize any previous history. This note will be appended to a running log.
    - Discard conversational filler, polite exchanges, and redundant information.
    - Maintain a professional, objective, and empathetic clinical tone.
    - Keep any absolutely profound text from the user intact word for word.
  `;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message: "Please write a clinical note for this recent interaction.", 
      history: [], 
      systemInstruction: prompt,
      model: "claude-sonnet-4-6" 
    }),
  });

  if (!response.ok) throw new Error(await response.text());
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value);
    }
  }
  return fullText;
}

export function formatGraphForLLM(graph: { people: any[], relationships: any[], cardSessions?: any[] }): string {
  if (!graph) return "No data provided.";

  const peopleMap = new Map<string, string>();
  
  const peopleSection = (graph.people || []).map(p => {
    const label = p.data?.label || p.label || "Unknown";
    peopleMap.set(p.id, label);
    const type = p.data?.type || p.type || "person";
    const responses = p.responses || p.data?.responses || {};
    
    const details = Object.entries(responses)
      .filter(([key, val]) => val && key !== "Name")
      .map(([key, val]) => `${key}: ${val}`)
      .join('; ');

    return `- ${label} (${type})${details ? ` | ${details}` : ''}`;
  }).join('\n');

  const relationshipsSection = (graph.relationships || []).map(r => {
    const is3rdParty = r.source !== 'me' && r.target !== 'me';
    const sourceName = peopleMap.get(r.source) || "Unknown";
    const targetName = peopleMap.get(r.target) || "Unknown";
    const responses = r.responses || r.data?.responses || {};

    const genTags = responses["General Tags"];
    const dynTags = responses["Dynamic Tags"];
    const afterTags = responses["After Tags"];

    const generalStr = genTags ? (is3rdParty ? `General Observation: [${genTags}]` : `General: [${genTags}]`) : "";
    const dynStr = dynTags ? (is3rdParty ? `Dynamic Observation: [${dynTags}]` : `Dynamic: [${dynTags}]`) : "";
    const afterStr = afterTags ? (is3rdParty ? `User's Role/Impact from this relationship: [${afterTags}]` : `Aftermath/Feeling: [${afterTags}]`) : "";

    const tags = [generalStr, dynStr, afterStr].filter(Boolean).join(' | ');

    const qaDetails = [
      responses["General Explanation"] ? `[General]: ${responses["General Explanation"]}` : null,
      responses["Dynamic Explanation"] ? `[Dynamic]: ${responses["Dynamic Explanation"]}` : null,
      responses["Aftermath Explanation"] ? `[${is3rdParty ? "Impact" : "Aftermath"}]: ${responses["Aftermath Explanation"]}` : null
    ].filter(Boolean).map(text => text?.trim()).join('\n    ');

    const notes = responses["Notes"] ? `Notes: "${responses["Notes"].trim()}"` : "";

    if (!tags && !notes && !qaDetails) return null;

    let line = `- ${sourceName} & ${targetName}:`;
    if (tags) line += ` Tags: ${tags}`;
    if (notes) line += ` ${notes}`;
    if (qaDetails) line += `\n    ${qaDetails}`;
    
    return line;
  }).filter(Boolean).join('\n');

  let baseStr = `### PEOPLE\n${peopleSection || 'None'}\n\n### RELATIONSHIPS\n${relationshipsSection || 'None'}`;

  if (graph.cardSessions && graph.cardSessions.length > 0) {
    const cardsSection = graph.cardSessions.map(session => {
      if (!session.messages || session.messages.length === 0) return null;
      
      const messagesStr = session.messages
        .map((m: any) => `${m.role.toUpperCase()}: ${m.text.trim()}`)
        .join('\n    ');

      return `- Topic/Card: ${session.cardId}\n    ${messagesStr}`;
    }).filter(Boolean).join('\n\n');

    if (cardsSection) {
      baseStr += `\n\n### USER REFLECTIONS & INSIGHTS (CARDS)\n${cardsSection}`;
    }
  }

  return baseStr;
}
