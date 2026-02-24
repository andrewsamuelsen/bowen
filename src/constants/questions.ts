// Node Fields
export const PERSON_FIELDS = {
  NAME: "Name",
  RELATIONSHIP: "Relationship Label (e.g. Mom, Boss)",
  CAREER: "Career / Goals",
  FAMILY_ORIGIN: "Family of Origin Notes",
  HOBBIES: "Hobbies / Interests",
  THERAPY_FOCUS: "Therapy Focus / Current Issues"
};

// Edge Fields (The "Profile" of the relationship)
export const RELATIONSHIP_FIELDS = {
  OVERVIEW: "Relationship Overview",
  CONFLICTS: "Recurring Conflicts",
  CHILDHOOD: "Their Childhood History",
  AFTERMATH: "How do you feel after seeing them?"
};

// Keeping these for backward compatibility if needed, but we will likely replace them
export const PERSON_QUESTIONS = Object.values(PERSON_FIELDS);
export const CONNECTION_QUESTIONS = Object.values(RELATIONSHIP_FIELDS);