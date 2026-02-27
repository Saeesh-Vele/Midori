// Gemini AI Service for EcoFy Waste Analysis
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/**
 * List of Gemini models to attempt, in order of preference.
 * Includes latest Flash models for speed and Pro models for complex reasoning.
 */
const GEMINI_MODELS = [
    "gemini-2.5-flash",       // Latest flash model
    "gemini-2.0-flash",       // Stable flash model
    "gemini-flash-latest",    // Latest flash fallback
    "gemini-2.5-pro"          // Pro model with vision
];

/**
 * Generates the API URL for a specific model version
 * @param model The model identifier string
 */
const getApiUrl = (model: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Interface defining the structured response from the waste analysis.
 * Used for strict typing of the AI's JSON output.
 */
export interface WasteAnalysis {
    /** Name of the identified item */
    itemName: string;
    /** Primary material composition */
    material: string;
    /** Recommended waste stream category */
    category: "reuse" | "upcycle" | "recycle" | "dispose";
    /** AI confidence score (0-1) */
    confidence: number;
    /** Creative reuse suggestions */
    reuse: {
        ideas: string[];
        difficulty: "Easy" | "Medium" | "Hard";
        timeNeeded: string;
        environmentalBenefit: string;
    };
    /** Proper recycling guidelines */
    recycle: {
        instructions: string[];
        safetyTips: string[];
        doNot: string[];
        canRecycle: boolean;
    };
    /** Estimated carbon footprint reduction */
    carbonSaved: string;
    /** Educational fun fact */
    funFact: string;
}

/**
 * System prompt for the Vision API to ensure consistent JSON output
 */
const SYSTEM_PROMPT = `You are EcoFy Buddy, a friendly and knowledgeable waste management AI assistant. 
Analyze the image of the waste item and provide a structured JSON response.

Your response must be a valid JSON object with this exact structure:
{
  "itemName": "Name of the item",
  "material": "Primary material (e.g., Plastic, Glass, Metal, Paper, Organic, Electronic, Textile)",
  "category": "One of: reuse, upcycle, recycle, dispose",
  "confidence": 0.95,
  "reuse": {
    "ideas": ["Idea 1", "Idea 2", "Idea 3"],
    "difficulty": "Easy or Medium or Hard",
    "timeNeeded": "e.g., 10-15 minutes",
    "environmentalBenefit": "Brief impact statement"
  },
  "recycle": {
    "instructions": ["Step 1", "Step 2"],
    "safetyTips": ["Tip 1", "Tip 2"],
    "doNot": ["Don't do this", "Avoid that"],
    "canRecycle": true
  },
  "carbonSaved": "e.g., 0.5 kg CO₂",
  "funFact": "An interesting eco fact about this item"
}

Be encouraging, helpful, and educational. Make suggestions practical and actionable.
IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`;

// Helper function to try API call with retries and multiple models
async function callGeminiAPI(body: object, maxRetries: number = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (const model of GEMINI_MODELS) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await fetch(`${getApiUrl(model)}?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body)
                });

                // If we get a 429 (rate limit), wait and retry
                if (response.status === 429) {
                    const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
                    console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }

                // If we get a 404, try the next model
                if (response.status === 404) {
                    console.log(`Model ${model} not found, trying next...`);
                    break;
                }

                // Success or other error - return the response
                return response;
            } catch (error) {
                lastError = error as Error;
                console.error(`API call error (model: ${model}, attempt: ${attempt}):`, error);
            }
        }
    }

    throw lastError || new Error('All API attempts failed');
}

export async function analyzeWasteImage(imageBase64: string): Promise<WasteAnalysis> {
    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await callGeminiAPI({
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 2048,
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', response.status, errorData);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            throw new Error('No response from AI');
        }

        // Parse JSON from response (handle potential markdown code blocks)
        let jsonStr = textContent;
        if (textContent.includes('```json')) {
            jsonStr = textContent.split('```json')[1].split('```')[0];
        } else if (textContent.includes('```')) {
            jsonStr = textContent.split('```')[1].split('```')[0];
        }

        const analysis: WasteAnalysis = JSON.parse(jsonStr.trim());
        return analysis;

    } catch (error) {
        console.error('Gemini API Error:', error);
        // Return fallback analysis
        return {
            itemName: "Unknown Item",
            material: "Mixed Materials",
            category: "recycle",
            confidence: 0.5,
            reuse: {
                ideas: ["Consider donating if still usable", "Use as storage container", "Repurpose for crafts"],
                difficulty: "Easy",
                timeNeeded: "5-10 minutes",
                environmentalBenefit: "Extends item lifespan, reduces landfill waste"
            },
            recycle: {
                instructions: ["Check local recycling guidelines", "Clean the item before recycling", "Remove any non-recyclable parts"],
                safetyTips: ["Handle broken items carefully", "Wear gloves if needed"],
                doNot: ["Don't mix with food waste", "Don't put in regular trash if recyclable"],
                canRecycle: true
            },
            carbonSaved: "0.3 kg CO₂",
            funFact: "Recycling one item can save enough energy to power a light bulb for hours!"
        };
    }
}

export interface ChatMessage {
    role: "user" | "model";
    content: string;
}

export async function chatWithEcofy(message: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
        // Build conversation contents for Gemini
        const systemInstruction = `You are EcoFy Buddy, a friendly eco-companion helping people with waste management and recycling.
Be warm, encouraging, and helpful. Keep responses concise but informative.
You have full context of the conversation - when users ask follow-up questions, refer back to your previous responses to give contextual answers.
Format your responses nicely with markdown - use **bold** for emphasis, numbered lists for steps, and bullet points where appropriate.`;

        // Build the conversation history for Gemini's multi-turn format
        const contents = [];

        // Add conversation history
        for (const msg of conversationHistory) {
            contents.push({
                role: msg.role,
                parts: [{ text: msg.content }]
            });
        }

        // Add current user message
        contents.push({
            role: "user",
            parts: [{ text: message }]
        });

        const response = await callGeminiAPI({
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help! Try uploading an image of an item you want to know about.";
    } catch (error) {
        console.error('Chat API Error:', error);
        return "I'm having trouble connecting right now. The AI service may be temporarily unavailable. Please try again in a moment!";
    }
}
