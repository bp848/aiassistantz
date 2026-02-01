import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from '@google/genai';
import { AgentMode, Message, Sender, StoredDocument } from '../types';
import { listCalendarEvents, createCalendarEvent, searchEmails, getEmailDetail, sendEmail } from './googleApi';
import { supabase } from './supabaseClient';
import mcpService from './mcpService';
import ResponseAdapter from './responseAdapter';

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// If you want to override where the app sends Gemini requests (e.g. staging),
// set VITE_GEMINI_PROXY_URL to an absolute URL.

const getGeminiProxyUrl = () => {
  const explicit = (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined)?.trim();
  if (explicit) return explicit;

  // In production (Vercel), use same-origin serverless function.
  if (import.meta.env.PROD) return '/api/gemini-proxy';

  // In local dev, fall back to Supabase Edge Function if configured.
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (baseUrl) return `${baseUrl}/functions/v1/gemini-proxy`;

  throw new Error('Missing VITE_GEMINI_PROXY_URL (or VITE_SUPABASE_URL) for Gemini proxy call.');
};

const callGemini = async (payload: any) => {
  // In local dev, if a client API key is configured, call Gemini directly (no proxy required).
  // This keeps local development simple; production should use the serverless proxy.
  const devApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  if (import.meta.env.DEV && devApiKey) {
    const ai = new GoogleGenAI({ apiKey: devApiKey });
    return await ai.models.generateContent(payload);
  }

  const url = getGeminiProxyUrl();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Gemini proxy failed (${res.status})`);
  }
  try {
    return JSON.parse(text || '{}');
  } catch (parseError) {
    console.error('[geminiService] Failed to parse Gemini response:', text?.slice(0, 200));
    throw new Error(`Invalid JSON response from Gemini proxy: ${String(parseError)}`);
  }
};

export const COMPANY_PROFILE = `
事業内容: 商業印刷、出版印刷、デジタルソリューション
URL: https://www.b-p.co.jp/
`;

let currentUserName = '社長';

export const initializeUserContext = (userName: string) => {
  currentUserName = userName;
};

export const generateSecretaryImage = async (prompt: string): Promise<string> => {
  if (IS_DEMO_MODE) return '';
  try {
    const response = await callGemini({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: `Professional portrait of an executive secretary. Appearance: ${prompt}` }] }],
      config: { imageConfig: { aspectRatio: '1:1' } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  } catch (error) {
    console.error('Image generation failed:', error);
  }
  return '';
};

const calendarTool: FunctionDeclaration = {
  name: 'manage_calendar',
  parameters: {
    type: Type.OBJECT,
    description: 'List or create calendar events in Google Calendar',
    properties: {
      action: { type: Type.STRING, description: 'list | create' },
      date: { type: Type.STRING, description: 'YYYY-MM-DD' },
      title: { type: Type.STRING },
      time: { type: Type.STRING, description: 'HH:MM (24h)' },
      duration: { type: Type.STRING, description: 'minutes' },
      description: { type: Type.STRING },
      account: { type: Type.STRING, description: 'company | personal' }
    },
    required: ['action']
  }
};

const gmailTool: FunctionDeclaration = {
  name: 'manage_gmail',
  parameters: {
    type: Type.OBJECT,
    description: 'Search, read detail, or send Gmail messages',
    properties: {
      action: { type: Type.STRING, description: 'search | get_detail | send' },
      query: { type: Type.STRING, description: 'full text search term' },
      sender: { type: Type.STRING, description: 'filter by from:' },
      subject: { type: Type.STRING, description: 'filter by subject:' },
      startDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
      endDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
      messageId: { type: Type.STRING, description: 'id for get_detail' },
      to: { type: Type.STRING, description: 'recipient for send' },
      body: { type: Type.STRING, description: 'email body' }
    },
    required: ['action']
  }
};

async function handleToolCall(fnName: string, args: any) {
  try {
    let mcpResponse;
    let toolName;

    if (fnName === 'manage_calendar') {
      if (args.action === 'list') {
        toolName = 'list_events';
        mcpResponse = await mcpService.callTool(toolName, {
          date: args.date || new Date().toISOString().split('T')[0],
          maxResults: 10
        });
      }
      else if (args.action === 'create') {
        toolName = 'create_event';
        mcpResponse = await mcpService.callTool(toolName, {
          title: args.title || 'Untitled event',
          date: args.date || new Date().toISOString().split('T')[0],
          time: args.time || '09:00',
          duration: parseInt(args.duration) || 60,
          description: args.description || ''
        });
      }
      else {
        return { error: 'Unknown calendar action' };
      }
    }
    else if (fnName === 'manage_gmail') {
      if (args.action === 'search') {
        toolName = 'search_threads';
        mcpResponse = await mcpService.callTool(toolName, {
          query: args.query || '',
          maxResults: 10
        });
      }
      else if (args.action === 'get_detail') {
        if (!args.messageId) throw new Error('messageId is required');
        toolName = 'get_message';
        mcpResponse = await mcpService.callTool(toolName, {
          messageId: args.messageId
        });
      }
      else if (args.action === 'send') {
        if (!args.to || !args.body) throw new Error('to and body are required to send email');
        toolName = 'send_message';
        mcpResponse = await mcpService.callTool(toolName, {
          to: args.to,
          subject: args.subject || '(no subject)',
          body: args.body
        });
      }
      else {
        return { error: 'Unknown gmail action' };
      }
    }
    else {
      return { error: 'Unknown tool' };
    }

    // MCPレスポンスをUIプロトコルに変換
    if (mcpResponse && mcpResponse.result) {
      const formattedResponse = ResponseAdapter.formatResponse(toolName, mcpResponse.result);
      return {
        result: mcpResponse.result,
        formatted: formattedResponse
      };
    }

    return mcpResponse;
  } catch (error: any) {
    console.error('[handleToolCall] Error:', error);
    return { error: error?.message || 'Tool call failed' };
  }
}

export const getDashboardData = async () => {
  try {
    if (IS_DEMO_MODE) return { events: [], emails: [], needsGoogleAuth: false };

    // If the user hasn't connected Google (or tokens aren't available), don't spam API calls.
    if (supabase) {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.provider_token) return { events: [], emails: [], needsGoogleAuth: true };
    }

    const [events, emails] = await Promise.all([
      listCalendarEvents(new Date().toISOString().split('T')[0]).catch(() => []),
      searchEmails({ query: '', maxResults: 5 }).catch(() => [])
    ]);
    return { events, emails, needsGoogleAuth: false };
  } catch (e) {
    console.warn('Dashboard fetch failed', e);
    return { events: [], emails: [], needsGoogleAuth: false };
  }
};

export const streamGeminiResponse = async (
  history: Message[],
  currentMessage: string,
  mode: AgentMode,
  onChunk: (text: string, grounding?: any) => void,
  onFinish: () => void,
  onError: (error: Error) => void,
  attachment?: { mimeType: string; data: string },
  knowledgeBase: StoredDocument[] = []
) => {
  try {
    if (IS_DEMO_MODE) {
      onChunk('Demo mode: LLM is not configured.');
      onFinish();
      return;
    }

    let modelName = 'gemini-2.0-flash';
    let tools: any[] = [{ functionDeclarations: [calendarTool, gmailTool] }];
    let thinkingConfig = undefined;

    const kbContext =
      knowledgeBase.length > 0
        ? `\n以下は社内資料です。\n${knowledgeBase.map(doc => `- ${doc.name}`).join('\n')}\n`
        : '';

    if (mode === AgentMode.ADVISOR) {
      modelName = 'gemini-2.5-pro-preview-05-06';
      thinkingConfig = { thinkingBudget: 32768 };
    } else if (mode === AgentMode.RESEARCHER) {
      tools = [{ googleSearch: {} }];
    } else if (mode === AgentMode.CONCIERGE) {
      modelName = 'gemini-2.5-flash';
      tools = [{ googleMaps: {} }];
    }

    const systemInstruction = `${IS_DEMO_MODE ? '【デモモード】実データへの接続は許可されていません。' : ''}あなたは${currentUserName}社長の専属AI秘書です。
ツール呼び出しは実際のGoogle Calendar/Gmail APIを叩きます。アクセス権が無い場合は正直に不足を伝えてください。
${kbContext}
社長名: ${currentUserName}
会社プロフィール: ${COMPANY_PROFILE}`;

    const parts: any[] = [{ text: currentMessage }];
    if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });

    const contents: any[] = [{ role: 'user', parts }];
    const allowFunctionCalling = tools.some(t => t?.functionDeclarations);

    const extractParts = (response: any) => response?.candidates?.[0]?.content?.parts || [];
    const extractText = (response: any) =>
      extractParts(response)
        .filter((p: any) => p?.text)
        .map((p: any) => p.text)
        .join('');
    const extractFunctionCalls = (response: any) =>
      extractParts(response)
        .filter((p: any) => p?.functionCall)
        .map((p: any) => p.functionCall);

    let response: GenerateContentResponse | null = null;
    let guard = 0;
    while (guard < 3) {
      response = await callGemini({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          tools: allowFunctionCalling ? tools : [],
          thinkingConfig
        }
      });

      const functionCalls = allowFunctionCalling ? extractFunctionCalls(response) : [];
      if (!functionCalls || functionCalls.length === 0) break;

      const responses: any[] = [];
      for (const fc of functionCalls) {
        const res = await handleToolCall(fc.name, fc.args);
        responses.push({ functionResponse: { id: fc.id, name: fc.name, response: { result: res } } });
      }
      contents.push({ role: 'tool', parts: responses });
      guard += 1;
    }

    if (response) {
      const text = extractText(response);
      if (text) onChunk(text, response.candidates?.[0]?.groundingMetadata);
    }
    onFinish();
  } catch (e: any) {
    const message = String(e?.message || e || '');
    if (message.includes('API key expired') || message.includes('API_KEY_INVALID')) {
      onError(
        new Error(
          'Gemini API key is invalid/expired. Update GEMINI_API_KEY in Supabase Edge Function env, then redeploy.'
        )
      );
      return;
    }
    onError(e instanceof Error ? e : new Error(message || 'Gemini request failed'));
  }
};
