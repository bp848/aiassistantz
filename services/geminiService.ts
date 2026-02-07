
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AgentMode, Message, Sender, StoredDocument } from "../types";
import { mcp } from "./mcpService";

let currentUserName = "橋本 唱市";

export const initializeUserContext = (userName: string) => {
  currentUserName = userName;
};

async function handleToolCall(fnName: string, args: any) {
  try {
    const mapping: Record<string, string> = {
      'manage_calendar_list': 'google_calendar_list_events',
      'manage_calendar_create': 'google_calendar_create_event',
      'manage_gmail_search': 'google_gmail_list_messages',
      'manage_gmail_draft': 'google_gmail_create_draft',
    };
    
    const target = mapping[fnName] || fnName;
    return await mcp.callTool(target, args);
  } catch (error) {
    return { error: `Tool Execution Failed: ${fnName}` };
  }
}

export const streamGeminiResponse = async (
  history: Message[],
  currentMessage: string,
  mode: AgentMode,
  onChunk: (text: string, grounding?: any) => void,
  onFinish: () => void,
  onError: (error: Error) => void,
  _context?: any,
  documents: StoredDocument[] = []
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isAdvisor = mode === AgentMode.ADVISOR;
  const modelName = isAdvisor ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  let tools: any[] = [];
  if (mode === AgentMode.RESEARCHER) {
    tools = [{ googleSearch: {} }];
  } else {
    tools = [{ 
      functionDeclarations: [
        {
          name: 'manage_calendar_list',
          description: 'カレンダーから予定を取得します。',
          parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } } }
        },
        {
          name: 'manage_gmail_search',
          description: 'Gmailからメールを検索します。',
          parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } } }
        },
        {
          name: 'manage_gmail_draft',
          description: 'メールの返信案（下書き）を作成します。',
          parameters: { 
            type: Type.OBJECT, 
            properties: { 
              to: { type: Type.STRING, description: '宛先メールアドレス' }, 
              subject: { type: Type.STRING, description: '件名' }, 
              body: { type: Type.STRING, description: '本文' } 
            },
            required: ['to', 'subject', 'body']
          }
        }
      ] 
    }];
  }

  try {
    let docContext = "";
    if (documents && documents.length > 0) {
      docContext = "\n\n【参照中の経営資料】\n" + documents.map(d => `- ${d.name}`).join("\n");
    }

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `あなたは${currentUserName}社長の超高性能AI秘書「クラウド秘書Z」です。

【コア・ミッション】
1. 秘書: 社長の時間を1秒でも多く創出すること。カレンダーやメールを自律的に管理します。
2. ビジネス辞書: 専門用語（金融、法務、IT、経営）について、辞書以上の深さで解説します。「概要、経営上のメリット、リスク、具体的アクション」の4点で整理して答えてください。
3. 参謀: 意思決定に必要な情報を整理し、Gemini 3 Proの推論能力で最適な助言を行います。

【プロトコル】
- 予定確認: 「おはよう」や「今日の予定は？」という問いには、必ず manage_calendar_list を呼び出して実データを確認してください。
- メールの返信: 必ず :::draft { "to": "...", "subject": "...", "body": "..." } ::: タグを使い、社長の承認を得るUIを出してください。
- リスト表示: 複数の情報を出す際は :::email [ { ... } ] ::: 形式を推奨します。
${docContext}

口調は、社長を支える「凛とした、かつ柔軟な秘書」として、敬語を崩さず、しかし率直な意見を述べてください。`,
        tools,
      }
    });

    const streamResponse = await chat.sendMessageStream({ message: currentMessage });

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
          const nextStream = await chat.sendMessageStream({ message: { parts: responses } as any });
          await processStream(nextStream);
        }
      }
    };

    await processStream(streamResponse);
    onFinish();
  } catch (e: any) { onError(e); }
};

export const getDashboardData = () => {
  return {
    events: [
      { id: '1', time: '10:00', duration: '60', title: '経営戦略会議', description: 'Q3のロードマップ確認', account: 'business' },
      { id: '2', time: '13:30', duration: '30', title: 'ランチMTG', description: '新規事業の壁打ち', account: 'personal' },
      { id: '3', time: '15:00', duration: '45', title: '提携先定例', description: '進捗共有とネクストアクション', account: 'business' },
    ],
    emails: [
      { id: 'e1', from: '投資家 A', subject: '資金調達の件', summary: '次回のピッチ日程について...', date: '10:25', unread: true, body: 'お世話になっております。\n次回のピッチですが、来週火曜日の14時はいかがでしょうか？' },
      { id: 'e2', from: '法務部', subject: '契約書修正', summary: 'NDAの第5条について修正依頼...', date: '09:15', unread: false, body: '修正案をお送りします。ご確認お願いします。' },
      { id: 'e3', from: '秘書B', subject: '出張手配完了', summary: '来月のシンガポール出張のホテル予約...', date: '08:00', unread: true, body: 'ホテルの予約が完了しました。詳細は添付のPDFをご確認ください。' },
    ]
  };
};

export const generateSecretaryImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `A professional and high-quality portrait of a Japanese secretary. Description: ${prompt}. Cinematic office lighting, detailed background.` }
      ]
    },
  });

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return '';
};
