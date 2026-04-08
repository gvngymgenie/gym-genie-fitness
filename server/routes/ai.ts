import { Express } from "express";

// VPS AI Configuration (Contabo VPS) - Using native Ollama API
const OLLAMA_BASE_URL = process.env.VPS_AI_BASE_URL 
  ? process.env.VPS_AI_BASE_URL.replace('/v1', '')  // Remove /v1 suffix if present
  : "http://86.48.3.64:11434";
const DEFAULT_MODEL = process.env.VPS_AI_DEFAULT_MODEL || "qwen2.5:3b";
const API_KEY = process.env.VPS_AI_API_KEY || process.env.OPENAI_API_KEY || "";

// Helper function to make requests to Ollama
async function fetchOllama(endpoint: string, body: any, isStreaming: boolean = false) {
  const url = `${OLLAMA_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "Authorization": `Bearer ${API_KEY}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  if (isStreaming) {
    return response;
  }
  
  return await response.json();
}

export function registerAIRoutes(app: Express) {
  // AI Chat endpoint - using native Ollama API
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { messages, model = DEFAULT_MODEL } = req.body;
      
      console.log("=== AI CHAT REQUEST ===");
      console.log("Model:", model);
      console.log("Ollama URL:", OLLAMA_BASE_URL);
      console.log("Messages:", JSON.stringify(messages, null, 2));

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      // Set headers for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Use native Ollama streaming API
      const response = await fetchOllama("/api/chat", {
        model: model,
        messages: messages,
        stream: true
      }, true);

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              res.write(`data: ${JSON.stringify({ type: "content", content: data.message.content })}\n\n`);
            }
            if (data.done) {
              res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }

      res.end();
    } catch (error: any) {
      console.error("AI Chat error:", error.message);
      res.status(500).json({ error: error.message || "Failed to process AI request" });
    }
  });

  // AI JSON Validate endpoint - using native Ollama API
  app.post("/api/ai-json-validate", async (req, res) => {
    try {
      const { jsonString, schema } = req.body;
      
      console.log("=== AI JSON VALIDATE REQUEST ===");
      console.log("JSON String:", jsonString);
      console.log("Schema:", schema);

      if (!jsonString || typeof jsonString !== "string") {
        return res.status(400).json({ error: "jsonString is required and must be a string" });
      }

      // First, try to parse the input directly
      try {
        const directParsed = JSON.parse(jsonString);
        console.log("Input is already valid JSON, returning directly");
        return res.json({ valid: true, json: JSON.stringify(directParsed) });
      } catch {
        console.log("Input is not valid JSON, sending to AI for fixing...");
      }

      // Build the validation prompt
      let systemPrompt = `You are a JSON validator and fixer. Your task is to:
1. Parse the provided JSON string
2. If it's invalid JSON, fix it to make it valid
3. If the JSON has missing or malformed fields, fix them
4. Return ONLY the valid JSON string, nothing else

IMPORTANT: 
- If the input is a JSON array, return a valid JSON array
- If the input is a JSON object, return a valid JSON object
- Do NOT change the structure (array vs object)
- Return ONLY the JSON, no explanations, no markdown formatting.`;

      if (schema) {
        systemPrompt += `\n\nExpected schema: ${JSON.stringify(schema)}`;
      }

      const userPrompt = `Validate and fix this JSON:\n${jsonString}`;

      // Use native Ollama API (non-streaming)
      const response = await fetchOllama("/api/chat", {
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false
      });

      const responseText = response.message?.content;
      
      console.log("=== AI JSON VALIDATE RESPONSE ===");
      console.log("Response:", responseText);

      if (!responseText) {
        return res.status(500).json({ error: "No response from AI" });
      }

      // Try to extract JSON from the response
      let validatedJson = responseText.trim();
      
      // Remove markdown code blocks if present
      if (validatedJson.startsWith("```json")) {
        validatedJson = validatedJson.slice(7);
      } else if (validatedJson.startsWith("```")) {
        validatedJson = validatedJson.slice(3);
      }
      if (validatedJson.endsWith("```")) {
        validatedJson = validatedJson.slice(0, -3);
      }
      validatedJson = validatedJson.trim();

      // Try to parse and validate the JSON
      try {
        const parsed = JSON.parse(validatedJson);
        res.json({ valid: true, json: JSON.stringify(parsed) });
      } catch (parseError: any) {
        console.log("First parse attempt failed, trying to extract JSON...");
        
        const jsonArrayMatch = validatedJson.match(/\[[\s\S]*\]/);
        const jsonObjectMatch = validatedJson.match(/\{[\s\S]*\}/);
        
        if (jsonArrayMatch) {
          try {
            const parsed = JSON.parse(jsonArrayMatch[0]);
            res.json({ valid: true, json: JSON.stringify(parsed) });
          } catch {
            if (jsonObjectMatch) {
              try {
                const parsed = JSON.parse(jsonObjectMatch[0]);
                res.json({ valid: true, json: JSON.stringify(parsed) });
              } catch {
                res.json({ valid: false, error: "Could not parse as valid JSON", raw: validatedJson });
              }
            } else {
              res.json({ valid: false, error: "Could not parse as valid JSON", raw: validatedJson });
            }
          }
        } else if (jsonObjectMatch) {
          try {
            const parsed = JSON.parse(jsonObjectMatch[0]);
            res.json({ valid: true, json: JSON.stringify(parsed) });
          } catch {
            res.json({ valid: false, error: "Could not parse as valid JSON", raw: validatedJson });
          }
        } else {
          res.json({ valid: false, error: "Could not parse as valid JSON", raw: validatedJson });
        }
      }
    } catch (error: any) {
      console.error("AI JSON Validate error:", error.message);
      res.status(500).json({ error: error.message || "Failed to validate JSON" });
    }
  });
}
