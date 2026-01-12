
import { Domain, Question, QuestionType } from './types';

export const QUESTION_BANK: Question[] = [
  // Software Engineering
  {
    id: "se-1",
    domain: Domain.SOFTWARE_ENGINEERING,
    text: "Explain the differences between Monolithic and Microservices architectures. When would you choose one over the other?",
    type: QuestionType.OPEN,
    difficulty: 3,
    expectedKeywords: ["scalability", "decoupling", "deployment", "overhead"],
  },
  {
    id: "se-2",
    domain: Domain.SOFTWARE_ENGINEERING,
    text: "What is CI/CD, and why is it critical in a modern software development lifecycle?",
    type: QuestionType.OPEN,
    difficulty: 2,
    expectedKeywords: ["automation", "integration", "delivery", "pipeline"],
  },
  // Frontend
  {
    id: "fe-1",
    domain: Domain.FRONTEND,
    text: "How does the Virtual DOM work in React, and how does it improve performance?",
    type: QuestionType.OPEN,
    difficulty: 3,
    expectedKeywords: ["diffing", "reconciliation", "rendering", "updates"],
  },
  {
    id: "fe-2",
    domain: Domain.FRONTEND,
    text: "Explain CSS Box Model and how 'box-sizing: border-box' changes it.",
    type: QuestionType.OPEN,
    difficulty: 2,
    expectedKeywords: ["padding", "margin", "border", "content-box"],
  },
  // Backend
  {
    id: "be-1",
    domain: Domain.BACKEND,
    text: "What are the primary differences between SQL and NoSQL databases? When is NoSQL a better fit?",
    type: QuestionType.OPEN,
    difficulty: 3,
    expectedKeywords: ["schema", "normalization", "scaling", "ACID", "BASE"],
  },
  {
    id: "be-2",
    domain: Domain.BACKEND,
    text: "How would you handle authentication and authorization in a REST API?",
    type: QuestionType.OPEN,
    difficulty: 3,
    expectedKeywords: ["JWT", "OAuth", "sessions", "middleware", "tokens"],
  },
  // CS Fundamentals
  {
    id: "cs-1",
    domain: Domain.CS_FUNDAMENTALS,
    text: "Explain the time complexity of QuickSort in best, average, and worst-case scenarios.",
    type: QuestionType.OPEN,
    difficulty: 4,
    expectedKeywords: ["Big O", "O(n log n)", "O(n^2)", "pivot", "recursion"],
  },
];

export const SYSTEM_PROMPT = `
You are a World-Class AI Technical Interviewer. 
Your goal is to assess the candidate's skills accurately but fairly.
- Be professional but encouraging.
- Provide follow-up questions if the answer is incomplete.
- If a candidate is struggling, offer a small hint.
- If they are doing well, increase the technical depth.
- Focus on the provided Domain.
- Keep responses concise as they will be spoken via TTS.
`;
