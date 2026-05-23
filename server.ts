import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// --------------------------------------------------------------------------
// API Route: Mood Analysis and Visual Prompt Expansion
// --------------------------------------------------------------------------
app.post("/api/gemini/mood-explain", async (req, res) => {
  try {
    const { trackName, rawMood, userDescription } = req.body;

    if (!ai) {
      // Return high-quality, pre-compiled fallback recommendations in extreme detail
      return res.json({
        detectedMood: rawMood || "Cinematic Liquid",
        expandedPrompt: `High-resolution visual of music frequencies becoming physical matter, ${rawMood || "cinematic dark electronics"} aesthetic, liquid neon metal chrome ripples, geometric lines forming a reactive core, deep space ambient lighting, 8k resolution, Unreal Engine render.`,
        visualStructure: "orbital-drift",
        colorSchema: { primary: "#8b5cf6", secondary: "#06b6d4", darkAccents: "#0b0c10" },
        beatRateMultiplier: 1.2,
        sceneSlices: [
          { timePercent: 0, backdrop: "Sub-bass pulse waves breaking across standard crystal panels." },
          { timePercent: 50, backdrop: "A giant speaker silhouette appearing in holographic space." }
        ]
      });
    }

    const systemPrompt = `You are Free Bass AI Studio, a specialist creative advisor for cinematic and future music artists. 
    Analyze the user's audio metadata/tags and generate structured aesthetic profiles for an audio-reactive visual video.
    Focus on creating visual concepts where sound frequencies literally manifest as physical matter.
    Return your response strictly as JSON that matches the requested schema.`;

    const userPrompt = `Generate a cinematic soundscape profile for:
    Track Name: "${trackName || "Untitled Track"}"
    Aesthetic Direction: "${rawMood || "Cinematic Electronic"}"
    Description: "${userDescription || "Ambient frequency flow with heavy bass kicks"}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedMood: { type: Type.STRING },
            expandedPrompt: { 
              type: Type.STRING, 
              description: "A highly cinematic visual prompt emphasizing slow liquid particle motion, heavy orbital cameras, cyber-structures, or analog tape textures." 
            },
            visualStructure: { 
              type: Type.STRING, 
              description: "Must be one of: orbital-drift, center-sphere, waveform-cave, fractal-grid, fluid-mesh" 
            },
            colorSchema: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING, description: "hex code for glow effects e.g. #8b5cf6" },
                secondary: { type: Type.STRING, description: "hex code for high frequency rings e.g. #06b6d4" },
                darkAccents: { type: Type.STRING, description: "hex code for backgrounds e.g. #020204" }
              },
              required: ["primary", "secondary", "darkAccents"]
            },
            beatRateMultiplier: { type: Type.NUMBER, description: "intensity scale between 0.5 to 2.0" }
          },
          required: ["detectedMood", "expandedPrompt", "visualStructure", "colorSchema", "beatRateMultiplier"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");
    res.json(parsedJson);
  } catch (error: any) {
    console.error("Mood analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze audio mood" });
  }
});

// --------------------------------------------------------------------------
// API Route: Background Image Generation using gemini-2.5-flash-image
// --------------------------------------------------------------------------
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    
    if (!ai) {
      // No key, return a placeholder with high-contrast cyber aesthetic
      return res.status(400).json({
        error: "GEMINI_API_KEY is not configured",
        message: "Using offline procedural generator instead. High-end procedural noise will run."
      });
    }

    const configRatio = aspectRatio || "9:16";

    // Call generateContent with gemini-2.5-flash-image
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: `${prompt || "Futuristic music frequencies becoming physical matter, deep space, glowing liquid neon chrome"}. highly detailed cybernetic, professional music studio render, high contrast dark theme background.`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: configRatio as any,
        }
      }
    });

    let base64Image = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      return res.status(500).json({ error: "No image inlineData found in the response." });
    }

    res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI visual background" });
  }
});

// --------------------------------------------------------------------------
// Vite or Static Assets Server Bundle
// --------------------------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // For Express 4 and compatibility
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Free Bass Server] running on http://localhost:${PORT}`);
  });
}

setupVite();
