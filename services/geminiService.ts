import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from '@google/genai';
import { AgentMode, Message, Sender, StoredDocument } from '../types';
import { listCalendarEvents, createCalendarEvent, searchEmails, getEmailDetail, sendEmail } from './googleApi';
import { supabase } from './supabaseClient';

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const getGeminiApiKey = (): string => {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '';
  return apiKey.trim();
};

let ai: GoogleGenAI | undefined;
const getAi = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add a valid Gemini API key to your environment.');
  }
  if (!ai) ai = new GoogleGenAI({ apiKey });
  return ai;
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
  if (IS_DEMO_MODE && !getGeminiApiKey()) return '';
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional portrait of an executive secretary. Appearance: ${prompt}` }]
      },
      config: { imageConfig: { aspectRatio: '1:1' } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
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
    if (fnName === 'manage_calendar') {
      if (args.action === 'list') {
        const events = await listCalendarEvents(args.date);
        return events;
      }
      if (args.action === 'create') {
        return await createCalendarEvent({
          title: args.title || 'Untitled event',
          date: args.date || new Date().toISOString().split('T')[0],
          time: args.time || '09:00',
          duration: args.duration || '60',
          description: args.description || '',
          account: args.account || 'company'
        });
      }
      return { error: 'Unknown calendar action' };
    }

    if (fnName === 'manage_gmail') {
      if (args.action === 'search') {
        return await searchEmails(args);
      }
      if (args.action === 'get_detail') {
        if (!args.messageId) throw new Error('messageId is required');
        return await getEmailDetail(args);
      }
      if (args.action === 'send') {
        if (!args.to || !args.body) throw new Error('to and body are required to send email');
        return await sendEmail({ to: args.to, subject: args.subject || '(no subject)', body: args.body });
      }
      return { error: 'Unknown gmail action' };
    }
  } catch (error: any) {
    return { error: error?.message || 'Tool call failed' };
  }
  return { error: 'Unknown tool' };
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
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      if (IS_DEMO_MODE) {
        onChunk('Demo mode: LLM is not configured. Set VITE_GEMINI_API_KEY to enable responses.');
        onFinish();
        return;
      }
      throw new Error('Missing VITE_GEMINI_API_KEY. Add a valid Gemini API key to your environment.');
    }

    let modelName = 'gemini-3-flash-preview';
    let tools: any[] = [{ functionDeclarations: [calendarTool, gmailTool] }];
    let thinkingConfig = undefined;

    const kbContext =
      knowledgeBase.length > 0
        ? `\n以下は社内資料です。\n${knowledgeBase.map(doc => `- ${doc.name}`).join('\n')}\n`
        : '';

    if (mode === AgentMode.ADVISOR) {
      modelName = 'gemini-3-pro-preview';
      thinkingConfig = { thinkingBudget: 32768 };
    } else if (mode === AgentMode.RESEARCHER) {
      tools = [{ googleSearch: {} }];
    } else if (mode === AgentMode.CONCIERGE) {
      modelName = 'gemini-2.5-flash';
      tools = [{ googleMaps: {} }];
    }

    const ai = getAi();
    let chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `${IS_DEMO_MODE ? '【デモモード】実データへの接続は許可されていません。' : ''}あなたは${currentUserName}社長の専属AI秘書です。
ツール呼び出しは実際のGoogle Calendar/Gmail APIを叩きます。アクセス権が無い場合は正直に不足を伝えてください。
${kbContext}
社長名: ${currentUserName}
会社プロフィール: ${COMPANY_PROFILE}`,
        tools,
        thinkingConfig
      }
    });

    const parts: any[] = [{ text: currentMessage }];
    if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });

    const toolCallingUnsupported = (msg: string) => msg.includes('Tool use with function calling is unsupported');

    let allowFunctionCalling = tools.some(t => t?.functionDeclarations);
    let stream: any;
    try {
      stream = await chat.sendMessageStream({ message: { parts } });
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (!toolCallingUnsupported(msg)) throw e;

      // Fallback: retry without tools/function calling.
      allowFunctionCalling = false;
      onChunk('Note: Tool/function calling is unsupported for this model/request. Retrying without tools.');
      chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: `Tool/function calling is disabled for this request.`,
          tools: [],
          thinkingConfig
        }
      });
      stream = await chat.sendMessageStream({ message: { parts } });
    }

    const processStream = async (s: any) => {
      for await (const chunk of s) {
        const c = chunk as GenerateContentResponse;
        if (c.text) onChunk(c.text, c.candidates?.[0]?.groundingMetadata);
        const fcs = allowFunctionCalling ? c.functionCalls : undefined;
        if (allowFunctionCalling && fcs && fcs.length > 0) {
          const responses: any[] = [];
          for (const fc of fcs) {
            const res = await handleToolCall(fc.name, fc.args);
            responses.push({ functionResponse: { id: fc.id, name: fc.name, response: { result: res } } });
          }
          const nextStream = await chat.sendMessageStream({ message: { parts: responses } });
          await processStream(nextStream);
        }
      }
    };

    await processStream(stream);
    onFinish();
  } catch (e: any) {
    const message = String(e?.message || e || '');
    if (message.includes('API key expired') || message.includes('API_KEY_INVALID')) {
      onError(
        new Error(
          'Gemini API key is invalid/expired. Replace VITE_GEMINI_API_KEY with an active key (Google AI Studio), then restart the dev server.'
        )
      );
      return;
    }
    onError(e instanceof Error ? e : new Error(message || 'Gemini request failed'));
  }
};
