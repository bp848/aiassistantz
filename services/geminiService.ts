
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
  } catch (error: any) {
    console.error(`[Tool Execution Failed] ${fnName}:`, error);
    const msg = error?.message ?? String(error);
    const is401 = msg.includes('401') || msg.includes('Unauthorized') || msg.includes('同期サーバへの接続に失敗');
    return {
      error: is401
        ? 'Google Workspace の認証が切れています。アプリの設定から「Google Workspace 連携」を再度実行してください。'
        : `MCP Tool Execution Failed: ${fnName}`,
    };
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
    const isProd = typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location?.host ?? '');
    onError(new Error(
      isProd
        ? 'GEMINI_API_KEY が設定されていません。Vercel → Settings → Environment Variables に追加し、Redeploy してください。'
        : 'GEMINI_API_KEY が設定されていません。.env.local に Google AI Studio の API キーを設定し、開発サーバーを再起動してください。'
    ));
    onFinish();
    return;
  }
  const ai = new GoogleGenAI({ apiKey });

  const TIMEOUT_MS = 90000;
  let finished = false;
  const safeOnFinish = () => { if (!finished) { finished = true; onFinish(); } };
  const safeOnChunk = (t: string) => { if (!finished) onChunk(t); };
  const safeOnError = (e: Error) => { if (!finished) { finished = true; onError(e); onFinish(); } };
  const timeoutId = setTimeout(() => {
    if (finished) return;
    finished = true;
    onChunk('接続がタイムアウトしました。しばらく経ってからもう一度お試しください。');
    onFinish();
  }, TIMEOUT_MS);

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

    // 初回はストリームを使わず sendMessage で一括応答 → function call の「直後」に関数応答を送る（400 回避）
    const firstResponse = await chat.sendMessage({ message: { parts } });

    const sendMessageLoop = async (response: any): Promise<void> => {
      if (!response.functionCalls?.length) return;
      const responseParts = [];
      let hadToolError = false;
      for (const fc of response.functionCalls) {
        const res = await handleToolCall(fc.name, fc.args ?? {});
        if (res && typeof res === 'object' && res.error) hadToolError = true;
        responseParts.push({
          functionResponse: { name: fc.name, response: { result: res } }
        });
      }
      const nextResponse = await chat.sendMessage({
        message: { role: 'function', parts: responseParts }
      });
      if (nextResponse.text) {
        safeOnChunk(nextResponse.text);
      } else if (hadToolError) {
        safeOnChunk('申し訳ありません。カレンダーやメールに接続できませんでした。**設定から「Google Workspace 連携」を再度実行**していただくか、しばらく経ってからお試しください。');
      }
      if (nextResponse.functionCalls && nextResponse.functionCalls.length > 0) {
        await sendMessageLoop(nextResponse);
      }
    };

    try {
      if (firstResponse.functionCalls && firstResponse.functionCalls.length > 0) {
        await sendMessageLoop(firstResponse);
      } else if (firstResponse.text) {
        safeOnChunk(firstResponse.text);
      }
    } finally {
      clearTimeout(timeoutId);
      safeOnFinish();
    }
  } catch (e: any) {
    clearTimeout(timeoutId);
    const msg = e?.message ?? e?.error?.message ?? String(e);
    const is401 =
      msg.includes('401') ||
      msg.includes('UNAUTHENTICATED') ||
      msg.includes('API keys are not supported') ||
      msg.includes('OAuth2 access token') ||
      msg.includes('CREDENTIALS_MISSING');
    if (is401) {
      safeOnError(new Error(
        'Gemini API の認証に失敗しました（401）。必ず Google AI Studio で発行した API キーを使ってください。' +
        ' Google Cloud Console のキーは OAuth 前提のため使えません。' +
        ' https://aistudio.google.com/apikey で「Create API key」→ 新しいプロジェクトでキーを発行し、' +
        ' ローカルは .env.local の GEMINI_API_KEY、本番は Vercel の環境変数 GEMINI_API_KEY に設定して Redeploy してください。'
      ));
    } else {
      safeOnError(e);
    }
  }
};

export const generateSecretaryImage = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY?.trim();
  if (!apiKey) return "";
  const ai = new GoogleGenAI({ apiKey });
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
