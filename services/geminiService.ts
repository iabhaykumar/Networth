
import { GoogleGenAI, Type } from "@google/genai";
import { Asset } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIInsights = async (assets: Asset[]) => {
  const prompt = `Analyze this financial portfolio and provide 3-4 concise insights.
  The portfolio includes Crypto, Indian Stocks, US Stocks, and Bank Balances.
  Assets: ${JSON.stringify(assets)}
  
  Provide insights on:
  1. Risk concentration
  2. Potential rebalancing
  3. Market sentiment for major holdings
  4. Growth opportunities.
  
  Keep the language professional but easy to understand. Respond in JSON format only.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { 
                type: Type.STRING,
                description: "one of: positive, warning, neutral"
              }
            },
            required: ["title", "content", "type"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return [];
  }
};

export const searchAssets = async (query: string, type: string) => {
  if (!query || query.length < 2) return [];

  const prompt = `Find top 5 financial assets matching "${query}" for category "${type}".
  Include correct Symbol/Ticker and Name. 
  For Indian stocks, ensure symbols are NSE/BSE compatible (e.g. RELIANCE).
  For Crypto, use standard tickers (e.g. BTC).
  Respond in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              symbol: { type: Type.STRING },
              exchange: { type: Type.STRING }
            },
            required: ["name", "symbol"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};

export const getCurrentPrice = async (symbol: string, name: string, currency: string) => {
  const prompt = `What is the current live market price of ${name} (${symbol}) in ${currency}? Return ONLY the numeric value. If multiple sources exist, provide a single average current price.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const match = text.match(/\d+(\.\d+)?/);
    const price = match ? parseFloat(match[0]) : 0;

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Market Source",
      uri: chunk.web?.uri
    })) || [];

    return { price, sources };
  } catch (error) {
    console.error("Price Fetch Error:", error);
    return { price: 0, sources: [] };
  }
};

export const getBatchPrices = async (assets: Asset[]) => {
  // Only update Crypto and Stocks
  const trackableAssets = assets.filter(a => a.type !== 'BANK_ACCOUNT');
  if (trackableAssets.length === 0) return {};

  const assetListStr = trackableAssets.map(a => `${a.name} (${a.symbol}) in ${a.currency}`).join(', ');
  const prompt = `Get the latest current market prices for the following assets: ${assetListStr}. 
  Return a JSON object where keys are the asset symbols and values are the numeric current prices. 
  Example: {"BTC": 64000.50, "RELIANCE": 2950.00}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "A map of symbols to their current market prices",
          properties: {}, // Allow dynamic keys
        }
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Batch Price Update Error:", error);
    return {};
  }
};
