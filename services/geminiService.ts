
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { AgentMode, Message, Sender, StoredDocument } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const COMPANY_PROFILE = `
社名: 文唱堂印刷株式会社
代表者: 代表取締役 橋本 唱市
※注意: 現在はデモ環境のため、実際のシステムとは連動していません。
`;

let currentUserName = "橋本 唱市";

export const initializeUserContext = (userName: string) => {
  currentUserName = userName;
};

// 【失態の告白】これらはすべて固定のダミーデータです
let liveCalendar = [
  { id: 'mock-1', title: 'ダミー予定: 工場視察', date: new Date().toISOString().split('T')[0], time: '10:00', duration: '60', description: 'API未連携のため固定データ', account: 'company' },
];

let liveEmails = [
  { id: 'mock-e1', from: 'デモ送信者 <demo@example.com>', subject: '【デモ】これはモックです', body: '実際のGmailとは通信していません。', unread: true, date: '2024-05-15', timestamp: '2024-05-15T10:15:00Z', summary: 'デモ用メール。' },
];

const calendarTool: FunctionDeclaration = {
  name: 'manage_calendar',
  parameters: {
    type: Type.OBJECT,
    description: 'カレンダーのダミー操作。実際には保存されません。',
    properties: {
      action: { type: Type.STRING, description: 'list, create' },
      date: { type: Type.STRING },
      title: { type: Type.STRING }
    },
    required: ['action']
  }
};

const gmailTool: FunctionDeclaration = {
  name: 'manage_gmail',
  parameters: {
    type: Type.OBJECT,
    description: 'メールのダミー操作。実際には送信されません。',
    properties: {
      action: { type: Type.STRING, description: 'search, get_detail, send' },
      messageId: { type: Type.STRING }
    },
    required: ['action']
  }
};

async function handleToolCall(fnName: string, args: any) {
  console.warn(`[Mock Tool Call] ${fnName} called with:`, args);
  if (fnName === 'manage_calendar') {
    if (args.action === 'list') return liveCalendar;
    return { status: 'mock_success', message: 'ダミー予定を作成しました（保存されません）' };
  }
  if (fnName === 'manage_gmail') {
    if (args.action === 'search') return liveEmails;
    if (args.action === 'get_detail') return liveEmails[0];
    return { status: 'mock_success', message: 'ダミー送信完了（実際には送信されていません）' };
  }
  return { error: 'ツール未実装' };
}

export const getDashboardData = () => ({
  events: liveCalendar,
  emails: liveEmails
});

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
    let modelName = 'gemini-3-flash-preview';
    let tools: any[] = [{ functionDeclarations: [calendarTool, gmailTool] }];
    
    if (mode === AgentMode.ADVISOR) modelName = 'gemini-3-pro-preview';
    else if (mode === AgentMode.RESEARCHER) tools.push({ googleSearch: {} });

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `あなたは${currentUserName}社長のAI秘書ですが、現在は【開発用モックアップ】として動作しています。
以下の制約を厳守し、社長に嘘をつかないでください。
1. Google/LINE/Gmail連携はすべて「シミュレーション」であり、実際には機能していません。
2. 返答に「〜を送信しました」「〜を予約しました」と断言せず、「シミュレーション上で〜を処理しました」と伝えてください。
3. 外部APIへの実接続がないことを隠さないでください。`,
        tools,
      }
    });

    const parts: any[] = [{ text: currentMessage }];
    if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });

    let stream = await chat.sendMessageStream({ message: { parts } });

    const processStream = async (s: any) => {
      for await (const chunk of s) {
        const c = chunk as GenerateContentResponse;
        if (c.text) onChunk(c.text, c.candidates?.[0]?.groundingMetadata);
        const fcs = c.functionCalls;
        if (fcs && fcs.length > 0) {
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
  } catch (e: any) { onError(e); }
};

export const generateSecretaryImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional portrait. ${prompt}` }] },
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : "";
  } catch (e) { return ""; }
};
