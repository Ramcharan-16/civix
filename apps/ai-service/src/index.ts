import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load dotenv from the package dir and/or root workspace
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT_AI || 8000;

app.use(cors());
app.use(express.json());

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

// Keyword-based analysis logic for mock provider
function analyzeMock(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = CATEGORIES[0]; // Default
  let severity = "MEDIUM";
  let reasoning = "Determined via mock keyword analysis.";
  let confidence = 0.82;

  if (text.includes("pothole") || text.includes("road bump") || text.includes("tarring")) {
    category = "Pothole on Main Road";
    severity = "HIGH";
    reasoning = "Detected pothole or road maintenance keywords.";
  } else if (text.includes("footpath") || text.includes("pavement") || text.includes("sidewalk") || text.includes("tiles")) {
    category = "Damaged Footpath";
    severity = "MEDIUM";
    reasoning = "Footpath/pavement damage keywords detected.";
  } else if (text.includes("live wire") || text.includes("hanging wire") || text.includes("sparking") || text.includes("exposed cable")) {
    category = "Hanging Live Wire";
    severity = "CRITICAL";
    reasoning = "High risk hanging or sparking wire detected.";
  } else if (text.includes("power outage") || text.includes("power cut") || text.includes("blackout") || text.includes("electricity out")) {
    category = "Frequent Power Outage";
    severity = "LOW";
    reasoning = "Electricity outage keywords detected.";
  } else if (text.includes("water pipe") || text.includes("pipe leak") || text.includes("water leakage") || text.includes("burst pipe")) {
    category = "Water Pipe Leakage";
    severity = "MEDIUM";
    reasoning = "Water supply leakage detected.";
  } else if (text.includes("drainage") || text.includes("sewage") || text.includes("overflow") || text.includes("gutter")) {
    category = "Drainage Overflow";
    severity = "HIGH";
    reasoning = "Sewage overflow poses sanitation issues.";
  } else if (text.includes("garbage") || text.includes("trash") || text.includes("dump") || text.includes("waste pile")) {
    category = "Garbage Pileup";
    severity = "MEDIUM";
    reasoning = "Uncollected garbage keywords detected.";
  } else if (text.includes("toilet") || text.includes("washroom") || text.includes("restroom") || text.includes("urinal")) {
    category = "Public Toilet Maintenance";
    severity = "LOW";
    reasoning = "Public restroom sanitation issue detected.";
  } else if (text.includes("streetlight") || text.includes("street lamp") || text.includes("dark road") || text.includes("no light")) {
    category = "Broken Streetlight";
    severity = "MEDIUM";
    reasoning = "Broken or malfunctioning street lamp reported.";
  } else if (text.includes("traffic signal") || text.includes("traffic light") || text.includes("crossing signal")) {
    category = "Faulty Traffic Signal";
    severity = "HIGH";
    reasoning = "Faulty traffic light causes local congestion and hazards.";
  } else if (text.includes("manhole") || text.includes("uncovered sewer") || text.includes("open sewer")) {
    category = "Open Manhole";
    severity = "CRITICAL";
    reasoning = "Open sewer manhole reported, posing severe hazard for pedestrians.";
  } else if (text.includes("tree") || text.includes("branch") || text.includes("fallen branch")) {
    category = "Fallen Tree Blockage";
    severity = "HIGH";
    reasoning = "Fallen tree blocking roads or public pathways.";
  }

  return { category, severity, confidence, reasoning };
}

// Endpoint: POST /analyze
app.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  const { title, description } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: 'Title and description are required.' });
    return;
  }

  const aiProvider = process.env.AI_PROVIDER || 'gemini';
  const apiKey = process.env.GEMINI_API_KEY;

  if (aiProvider === 'gemini' && apiKey) {
    // Model candidates in priority order (gemini-3.6-flash -> gemini-2.5-flash)
    const candidateModels = ['gemini-3.6-flash', 'gemini-2.5-flash'];
    const ai = new GoogleGenerativeAI(apiKey);

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

        // Robust JSON extraction
        let cleanJson = responseText.trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJson = jsonMatch[0];
        }
        const parsed = JSON.parse(cleanJson);

        if (CATEGORIES.includes(parsed.category) && SEVERITIES.includes(parsed.severity)) {
          res.json({
            category: parsed.category,
            severity: parsed.severity,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
            reasoning: parsed.reasoning || `Classified using ${modelName}.`
          });
          return;
        }
      } catch (e: any) {
        console.warn(`Model ${modelName} attempt failed:`, e.message);
      }
    }
  }

  // Mock fall-through
  const result = analyzeMock(title, description);
  res.json(result);
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', provider: process.env.AI_PROVIDER || 'mock' });
});

app.listen(PORT, () => {
  console.log(`AI Microservice running on port ${PORT}`);
});
