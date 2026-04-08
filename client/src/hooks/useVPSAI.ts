import { useState, useCallback } from 'react';

export interface UseVPSAIOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

/**
 * useVPSAI - Client-side hook for AI chat
 * 
 * IMPORTANT: This hook uses relative API endpoints (/api/*) which are
 * proxied through the Vercel server. The API key and VPS IP address
 * are never exposed to the client browser.
 * 
 * Server-side environment variables (VPS_AI_API_KEY, VPS_AI_BASE_URL, etc.)
 * are used by server/routes/ai.ts to connect to the VPS Ollama instance.
 */
export function useVPSAI(options: UseVPSAIOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<unknown>(null);
  
  // Use relative API endpoint - server handles VPS connection securely
  // No API key or base URL needed client-side - it's handled by the server
  const apiBaseUrl = ''; // Relative URL - goes through Vercel server

  const chat = useCallback(async (message: string, model: string = 'qwen2.5:3b') => {
    setLoading(true);
    setError(null);
    
    try {
      // Call server-side API endpoint - NOT directly to VPS
      const response = await fetch(`${apiBaseUrl}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: message }],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResponse(data);
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const chatStream = useCallback(async (message: string, onChunk: (content: string) => void, model: string = 'qwen2.5:3b') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: message }],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.content) {
              onChunk(data.content);
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const listModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, return the available models - could be enhanced with server endpoint
      return [
        { id: 'qwen2.5:3b', name: 'Qwen 2.5 3B' },
        { id: 'llama3.2:3b', name: 'Llama 3.2 3B' }
      ];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return {
    chat,
    chatStream,
    listModels,
    loading,
    error,
    response,
    clear
  };
}
