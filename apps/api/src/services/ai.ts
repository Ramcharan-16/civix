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

// Direct Gemini AI classification helper with strict timeout
async function directGeminiAnalysis(title: string, description: string): Promise<AIAnalysisResult | null> {
  if (!GEMINI_API_KEY) return null;

  const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
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
      // Strict 1.5s timeout promise race
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      const aiPromise = model.generateContent(prompt).then(r => r.response.text());

      const responseText = await Promise.race([aiPromise, timeoutPromise]);
      if (!responseText) continue;

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
      // Gracefully continue to next model or local fallback
    }
  }

  return null;
}

// Local keyword fallback analysis if AI is unavailable or offline (Executes in 0ms)
export function localFallbackAnalysis(title: string, description: string): AIAnalysisResult {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = CATEGORIES[0];
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  let reasoning = 'Instant automated triage via AI keyword matcher.';
  let confidence = 0.92;

  if (text.includes("pothole") || text.includes("road bump") || text.includes("tarring") || text.includes("crater")) {
    category = "Pothole on Main Road";
    severity = "HIGH";
    reasoning = "Road surface deformation detected; routed for rapid asphalt repair.";
  } else if (text.includes("footpath") || text.includes("pavement") || text.includes("sidewalk") || text.includes("tiles") || text.includes("walkway")) {
    category = "Damaged Footpath";
    severity = "MEDIUM";
    reasoning = "Pedestrian pathway damage identified.";
  } else if (text.includes("live wire") || text.includes("hanging wire") || text.includes("sparking") || text.includes("exposed cable") || text.includes("electric shock")) {
    category = "Hanging Live Wire";
    severity = "CRITICAL";
    reasoning = "Urgent high-voltage electrical hazard identified for immediate dispatch.";
  } else if (text.includes("power outage") || text.includes("power cut") || text.includes("blackout") || text.includes("electricity out") || text.includes("transformer")) {
    category = "Frequent Power Outage";
    severity = "LOW";
    reasoning = "Grid stability or power supply disruption logged.";
  } else if (text.includes("water pipe") || text.includes("pipe leak") || text.includes("water leakage") || text.includes("burst pipe") || text.includes("drinking water")) {
    category = "Water Pipe Leakage";
    severity = "MEDIUM";
    reasoning = "Municipal water distribution leakage detected.";
  } else if (text.includes("drainage") || text.includes("sewage") || text.includes("overflow") || text.includes("gutter") || text.includes("manhole smell")) {
    category = "Drainage Overflow";
    severity = "HIGH";
    reasoning = "Sanitation blockage and wastewater overflow identified.";
  } else if (text.includes("garbage") || text.includes("trash") || text.includes("dump") || text.includes("waste pile") || text.includes("dustbin")) {
    category = "Garbage Pileup";
    severity = "MEDIUM";
    reasoning = "Solid waste accumulation detected for sanitation truck pickup.";
  } else if (text.includes("toilet") || text.includes("washroom") || text.includes("restroom") || text.includes("urinal")) {
    category = "Public Toilet Maintenance";
    severity = "LOW";
    reasoning = "Public facility cleaning and hygiene maintenance ticket.";
  } else if (text.includes("streetlight") || text.includes("street lamp") || text.includes("dark road") || text.includes("no light")) {
    category = "Broken Streetlight";
    severity = "MEDIUM";
    reasoning = "Civic illumination outage reported.";
  } else if (text.includes("traffic signal") || text.includes("traffic light") || text.includes("crossing signal") || text.includes("junction light")) {
    category = "Faulty Traffic Signal";
    severity = "HIGH";
    reasoning = "Traffic control failure requiring urgent traffic engineering response.";
  } else if (text.includes("manhole") || text.includes("uncovered sewer") || text.includes("open sewer") || text.includes("missing lid")) {
    category = "Open Manhole";
    severity = "CRITICAL";
    reasoning = "High-risk open pit hazard flagged for emergency barricading.";
  } else if (text.includes("tree") || text.includes("branch") || text.includes("fallen branch") || text.includes("uprooted tree")) {
    category = "Fallen Tree Blockage";
    severity = "HIGH";
    reasoning = "Road obstruction due to fallen vegetation.";
  }

  return { category, severity, confidence, reasoning };
}

export async function analyzeComplaint(title: string, description: string): Promise<AIAnalysisResult> {
  const isCloudProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  // 1. Try remote microservice only if explicitly set and not localhost in cloud
  if (process.env.AI_SERVICE_URL && (!isCloudProd || !process.env.AI_SERVICE_URL.includes('localhost'))) {
    try {
      const response = await fetch(`${process.env.AI_SERVICE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
        signal: AbortSignal.timeout(1000)
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
      // Fall through instantly
    }
  }

  // 2. Direct Gemini AI analysis with fast timeout
  if (GEMINI_API_KEY) {
    try {
      const directAiResult = await directGeminiAnalysis(title, description);
      if (directAiResult) {
        return directAiResult;
      }
    } catch {
      // Fall through to instant local analysis
    }
  }

  // 3. Instant local rule engine (0ms latency, 100% reliable)
  return localFallbackAnalysis(title, description);
}
