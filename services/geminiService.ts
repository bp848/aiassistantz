
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AgentMode, Message, Sender, StoredDocument } from "../types";
import { mcp } from "./mcpService";

let currentUserName = "橋本 唱市";

export const initializeUserContext = (userName: string) => {
  currentUserName = userName;
};

/**
 * AIの要求をMCPサーバ（Google Workspace実機）へ中継
 * 内部関数名を MCP サーバーの標準的なツール名（google_calendar_... 等）にマッピングします。
 */
async function handleToolCall(fnName: string, args: any) {
  try {
    let targetTool = fnName;
    
    // アプリ内定義の抽象化関数名を、Workspace MCPサーバの具象ツール名にマッピング
    if (fnName === 'manage_calendar') {
      if (args.action === 'list') targetTool = 'google_calendar_list_events';
      else if (args.action === 'create') targetTool = 'google_calendar_create_event';
    } else if (fnName === 'manage_gmail') {
      if (args.action === 'search') targetTool = 'google_gmail_list_messages';
      else if (args.action === 'get_detail') targetTool = 'google_gmail_get_message';
      else if (args.action === 'draft') targetTool = 'google_gmail_create_draft';
    }

    // MCP 実機接続を介して実行
    const mcpResult = await mcp.callTool(targetTool, args);
    return mcpResult;
  } catch (error) {
    console.error(`[Tool Execution Failed] ${fnName}:`, error);
    return { error: `MCP Tool Execution Failed: ${fnName}` };
  }
}

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
  const apiKey = process.env.API_KEY?.trim();
  if (!apiKey) {
    onError(new Error('GEMINI_API_KEY が設定されていません。.env.local に Google AI Studio の API キーを設定し、開発サーバーを再起動してください。'));
    return;
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const modelName = mode === AgentMode.ADVISOR ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const tools = [{ 
      functionDeclarations: [
        {
          name: 'manage_calendar',
          parameters: {
            type: Type.OBJECT,
            description: '社長のカレンダー（Google Calendar）を操作します。',
            properties: {
              action: { type: Type.STRING, enum: ['list', 'create'], description: '操作内容' },
              query: { type: Type.STRING, description: '検索クエリ' },
              title: { type: Type.STRING, description: '予定のタイトル' },
              start: { type: Type.STRING, description: '開始日時(ISO)' }
            },
            required: ['action']
          }
        },
        {
          name: 'manage_gmail',
          parameters: {
            type: Type.OBJECT,
            description: '社長のメール（Gmail）を操作します。',
            properties: {
              action: { type: Type.STRING, enum: ['search', 'get_detail', 'draft'], description: '操作内容' },
              query: { type: Type.STRING, description: '検索クエリ' },
              messageId: { type: Type.STRING, description: 'メッセージID' },
              to: { type: Type.STRING, description: '宛先' },
              subject: { type: Type.STRING, description: '件名' },
              body: { type: Type.STRING, description: '本文' }
            },
            required: ['action']
          }
        }
      ] 
    }];

    if (mode === AgentMode.RESEARCHER) {
      tools.push({ googleSearch: {} } as any);
    }

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `あなたは${currentUserName}社長の専属AI秘書です。
現在、Google Workspace MCPサーバに実機接続されており、カレンダーやメールにリアルタイムでアクセスできます。

【行動指針】
1. 事実性: 不確かな記憶に頼らず、必ず manage_calendar や manage_gmail ツールを叩いて最新の実データを取得してください。
2. 視覚化プロトコル: 
   - メールリスト取得時は :::email {JSON} ::: 形式で報告してください。
   - メールの返信案を作成した際は :::draft {JSON} ::: 形式で社長の承認を求めてください。
   - 予約や手配が完了した際は :::ticket {JSON} ::: 形式で通知してください。
3. 効率性: 社長の時間を守るため、情報の要約と先回りの提案（Suggested Actions）を徹底してください。
4. 口調: 常に丁寧かつ冷静で、経営を支える参謀としての品位を保ってください。`,
        tools,
      }
    });

    const parts: any[] = [{ text: currentMessage }];
    if (attachment) {
      parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    }

    let streamResponse = await chat.sendMessageStream({ message: { parts } });

    const processStream = async (stream: any) => {
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) onChunk(c.text, c.candidates?.[0]?.groundingMetadata);
        
        if (c.functionCalls && c.functionCalls.length > 0) {
          const responses = [];
          for (const fc of c.functionCalls) {
            const res = await handleToolCall(fc.name, fc.args);
            responses.push({ 
              functionResponse: { id: fc.id, name: fc.name, response: { result: res } } 
            });
          }
          const nextStream = await chat.sendMessageStream({ message: { parts: responses } });
          await processStream(nextStream);
        }
      }
    };

    await processStream(streamResponse);
    onFinish();
  } catch (e: any) { 
    onError(e); 
  }
};

export const generateSecretaryImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional cinematic portrait of an executive assistant. ${prompt}` }] },
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : "";
  } catch (e) { return ""; }
};

export const getDashboardData = () => {
  // 実機接続時は App.tsx 側のステートで管理するため、ダミーデータを返さず、空の構造を維持
  return { events: [], emails: [] };
};
