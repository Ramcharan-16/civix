import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface AIAnalysisResult {
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  reasoning: string;
}

const CATEGORIES = [
  "Pothole on Main Road",
  "Damaged Footpath",
  "Hanging Live Wire",
  "Frequent Power Outage",
  "Water Pipe Leakage",
  "Drainage Overflow",
  "Garbage Pileup",
  "Public Toilet Maintenance",
  "Broken Streetlight",
  "Faulty Traffic Signal",
  "Open Manhole",
  "Fallen Tree Blockage"
];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Direct Gemini AI classification helper
async function directGeminiAnalysis(title: string, description: string): Promise<AIAnalysisResult | null> {
  if (!GEMINI_API_KEY) return null;

  const candidateModels = ['gemini-3.6-flash', 'gemini-2.5-flash'];
  const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

  for (const modelName of candidateModels) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        },
        systemInstruction: `You are an expert AI civic triage and complaint classification system for Civix.
Analyze the citizen's complaint title and description. You MUST accurately categorize it into one of our predefined categories:
${JSON.stringify(CATEGORIES, null, 2)}

Assess severity:
- CRITICAL: Immediate threat to human life or severe public safety hazard (e.g. exposed/sparking live wires, open/uncovered deep manholes, collapsed structures).
- HIGH: Serious disruption, significant safety risk, or severe public health issue (e.g. major deep potholes causing accidents, overflowing sewage/drainage onto walkways, broken traffic signals on major junctions).
- MEDIUM: Significant public inconvenience or infrastructure damage (e.g. water pipe leakage, garbage pileup, damaged footpaths, broken streetlights).
- LOW: Minor maintenance or cosmetic inconvenience without safety risk (e.g. scheduled public toilet cleaning, isolated power outages).

Respond strictly with JSON containing:
{
  "category": string (must match exactly one of the allowed categories),
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number between 0.0 and 1.0,
  "reasoning": string (clear, concise explanation of the rationale)
}`
      });

      const prompt = `Title: "${title}"\nDescription: "${description}"`;
      const response = await model.generateContent(prompt);
      const responseText = response.response.text() || '';

      let cleanJson = responseText.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }
      const parsed = JSON.parse(cleanJson);

      if (CATEGORIES.includes(parsed.category) && SEVERITIES.includes(parsed.severity)) {
        return {
          category: parsed.category,
          severity: parsed.severity,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
          reasoning: parsed.reasoning || `Classified using ${modelName}.`
        };
      }
    } catch (err: any) {
      console.warn(`Direct Gemini attempt with ${modelName} failed:`, err.message);
    }
  }

  return null;
}

// Local keyword fallback analysis if AI is unavailable or offline
function localFallbackAnalysis(title: string, description: string): AIAnalysisResult {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = CATEGORIES[0];
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  let reasoning = 'Analyzed via local backup keyword matcher.';
  let confidence = 0.75;

  if (text.includes("pothole") || text.includes("road bump") || text.includes("tarring")) {
    category = "Pothole on Main Road";
    severity = "HIGH";
  } else if (text.includes("footpath") || text.includes("pavement") || text.includes("sidewalk") || text.includes("tiles")) {
    category = "Damaged Footpath";
    severity = "MEDIUM";
  } else if (text.includes("live wire") || text.includes("hanging wire") || text.includes("sparking") || text.includes("exposed cable")) {
    category = "Hanging Live Wire";
    severity = "CRITICAL";
  } else if (text.includes("power outage") || text.includes("power cut") || text.includes("blackout") || text.includes("electricity out")) {
    category = "Frequent Power Outage";
    severity = "LOW";
  } else if (text.includes("water pipe") || text.includes("pipe leak") || text.includes("water leakage") || text.includes("burst pipe")) {
    category = "Water Pipe Leakage";
    severity = "MEDIUM";
  } else if (text.includes("drainage") || text.includes("sewage") || text.includes("overflow") || text.includes("gutter")) {
    category = "Drainage Overflow";
    severity = "HIGH";
  } else if (text.includes("garbage") || text.includes("trash") || text.includes("dump") || text.includes("waste pile")) {
    category = "Garbage Pileup";
    severity = "MEDIUM";
  } else if (text.includes("toilet") || text.includes("washroom") || text.includes("restroom") || text.includes("urinal")) {
    category = "Public Toilet Maintenance";
    severity = "LOW";
  } else if (text.includes("streetlight") || text.includes("street lamp") || text.includes("dark road") || text.includes("no light")) {
    category = "Broken Streetlight";
    severity = "MEDIUM";
  } else if (text.includes("traffic signal") || text.includes("traffic light") || text.includes("crossing signal")) {
    category = "Faulty Traffic Signal";
    severity = "HIGH";
  } else if (text.includes("manhole") || text.includes("uncovered sewer") || text.includes("open sewer")) {
    category = "Open Manhole";
    severity = "CRITICAL";
  } else if (text.includes("tree") || text.includes("branch") || text.includes("fallen branch")) {
    category = "Fallen Tree Blockage";
    severity = "HIGH";
  }

  return { category, severity, confidence, reasoning };
}

export async function analyzeComplaint(title: string, description: string): Promise<AIAnalysisResult> {
  // 1. Try calling the AI microservice if running
  try {
    const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const data = await response.json() as any;
      if (data && data.category && data.severity) {
        return {
          category: data.category,
          severity: data.severity,
          confidence: data.confidence ?? 0.95,
          reasoning: data.reasoning ?? 'Classified by AI Microservice.'
        };
      }
    }
  } catch (error) {
    // Microservice unreachable or timed out
  }

  // 2. Direct Gemini AI analysis as highly accurate first-class engine
  const directAiResult = await directGeminiAnalysis(title, description);
  if (directAiResult) {
    return directAiResult;
  }

  // 3. Fall back to local rule engine if offline
  return localFallbackAnalysis(title, description);
}
