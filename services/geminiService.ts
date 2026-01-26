
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { AgentMode, Message, Sender, StoredDocument } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const COMPANY_PROFILE = `
社名: 文唱堂印刷株式会社 (Bunshodo Printing Co., Ltd.)
本社: 〒101-0025 東京都千代田区神田佐久間町3-37 (TEL: 03-3851-0111)
工場: 町屋工場 (〒116-0001 東京都荒川区町屋8-22-10 TEL: 03-3819-2500)
創業: 1927年6月25日
資本金: 8,000万円
売上高: 23億円
社員数: 135名
代表者: 代表取締役 橋本 唱市
事業内容: 商業印刷、出版印刷、デジタルソリューション
URL: https://www.b-p.co.jp/
`;

let currentUserName = "橋本 唱市";

export const initializeUserContext = (userName: string) => {
  currentUserName = userName;
};

export const generateSecretaryImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional portrait of an executive secretary for a presidential office suite. High-quality photography, cinematic lighting, realistic style. Appearance: ${prompt}` }],
      },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) { console.error("Image generation failed:", error); }
  return "";
};

// Simulated data state
let liveCalendar = [
  { id: '1', title: '町屋工場 視察', date: new Date().toISOString().split('T')[0], time: '10:00', duration: '60', description: '新台稼働状況の確認', account: 'company' },
  { id: '2', title: '全印工連 理事会', date: new Date().toISOString().split('T')[0], time: '15:00', duration: '120', description: '日本印刷会館', account: 'company' },
  { id: '3', title: '【個人】ジム', date: new Date().toISOString().split('T')[0], time: '20:30', duration: '90', description: '六本木', account: 'personal' },
];

let liveEmails = [
  { id: 'e1', from: '工場長 <factory@b-p.co.jp>', subject: '稼働テスト完了の報告', body: '明日の視察、準備完了しております。新設備の調整も万全です。社長のご到着をお待ちしております。', unread: true, date: '2024-05-15', timestamp: '2024-05-15T10:15:00Z', summary: '明日の視察準備完了の報告。' },
  { id: 'e2', from: '経理部 <keiri@b-p.co.jp>', subject: '経費精算の件', body: '先月分の領収書が一部不足しております。ご確認いただけますでしょうか。特に出張費の明細が足りておりません。', unread: true, date: '2024-05-14', timestamp: '2024-05-14T09:30:00Z', summary: '領収書不足の確認依頼。' },
  { id: 'e3', from: '全印工連 事務局', subject: '次回理事会の資料送付', body: '次回の議題についての資料を添付いたします。ご確認の上、当日お越しください。', unread: false, date: '2024-05-13', timestamp: '2024-05-13T14:00:00Z', summary: '理事会資料の送付。' },
];

const calendarTool: FunctionDeclaration = {
  name: 'manage_calendar',
  parameters: {
    type: Type.OBJECT,
    description: '社長のスケジュール管理を行います。予定の確認(list)、新規追加(create)、削除(delete)が可能です。',
    properties: {
      action: { type: Type.STRING, description: 'list, create, delete' },
      date: { type: Type.STRING, description: 'YYYY-MM-DD' },
      title: { type: Type.STRING },
      time: { type: Type.STRING, description: 'HH:MM' },
      duration: { type: Type.STRING, description: '分単位の所要時間' },
      description: { type: Type.STRING },
      account: { type: Type.STRING, description: 'company または personal' }
    },
    required: ['action']
  }
};

const gmailTool: FunctionDeclaration = {
  name: 'manage_gmail',
  parameters: {
    type: Type.OBJECT,
    description: 'Gmailの操作を行います。検索(search)、詳細取得(get_detail)、送信(send)が可能です。',
    properties: {
      action: { type: Type.STRING, description: 'search, get_detail, send' },
      query: { type: Type.STRING, description: '全文検索キーワード' },
      sender: { type: Type.STRING, description: '送信者名またはメールアドレスでのフィルタ' },
      subject: { type: Type.STRING, description: '件名に含まれるキーワードでのフィルタ' },
      startDate: { type: Type.STRING, description: '検索開始日 (YYYY-MM-DD)' },
      endDate: { type: Type.STRING, description: '検索終了日 (YYYY-MM-DD)' },
      messageId: { type: Type.STRING, description: '操作対象のメッセージID' },
      to: { type: Type.STRING, description: '宛先メールアドレス' },
      body: { type: Type.STRING, description: '送信するメール本文' }
    },
    required: ['action']
  }
};

async function handleToolCall(fnName: string, args: any) {
  if (fnName === 'manage_calendar') {
    if (args.action === 'list') return liveCalendar.filter(e => !args.date || e.date === args.date);
    if (args.action === 'create') {
      const newEvent = { 
        id: Math.random().toString(36).substr(2, 9), 
        title: args.title || '無題', 
        date: args.date || new Date().toISOString().split('T')[0], 
        time: args.time || '12:00', 
        duration: args.duration || '60',
        description: args.description || '', 
        account: args.account || 'company' 
      };
      liveCalendar.push(newEvent);
      return { status: 'success', event: newEvent };
    }
  }
  if (fnName === 'manage_gmail') {
    if (args.action === 'search') {
      let results = [...liveEmails];
      if (args.query) {
        const q = args.query.toLowerCase();
        results = results.filter(m => m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q) || m.from.toLowerCase().includes(q));
      }
      if (args.sender) {
        const s = args.sender.toLowerCase();
        results = results.filter(m => m.from.toLowerCase().includes(s));
      }
      if (args.subject) {
        const sub = args.subject.toLowerCase();
        results = results.filter(m => m.subject.toLowerCase().includes(sub));
      }
      if (args.startDate) {
        results = results.filter(m => m.date >= args.startDate);
      }
      if (args.endDate) {
        results = results.filter(m => m.date <= args.endDate);
      }
      return results.map(({body, ...rest}) => rest);
    }
    if (args.action === 'get_detail') return liveEmails.find(m => m.id === args.messageId) || { error: 'Not found' };
    if (args.action === 'send') {
        console.log("SENDING EMAIL:", args);
        return { status: 'success', message: `${args.to} 宛にメールを送信しました。` };
    }
  }
  return { error: 'Unknown tool' };
}

export const getDashboardData = () => ({
  events: [...liveCalendar].sort((a,b) => a.time.localeCompare(b.time)),
  emails: [...liveEmails]
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
    let thinkingConfig = undefined;

    const kbContext = knowledgeBase.length > 0 
      ? `\n【資料室の学習データ】以下の文書を参考に、社長らしい品格のある文章を作成してください：\n` + 
        knowledgeBase.map(doc => `- ${doc.name}`).join('\n')
      : "";

    if (mode === AgentMode.ADVISOR) {
      modelName = 'gemini-3-pro-preview';
      thinkingConfig = { thinkingBudget: 32768 };
    } else if (mode === AgentMode.RESEARCHER) {
      tools.push({ googleSearch: {} });
    } else if (mode === AgentMode.CONCIERGE) {
      modelName = 'gemini-2.5-flash';
      tools.push({ googleMaps: {} });
    }

    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `あなたは${currentUserName}社長の専属AI秘書です。

【カレンダーAIの挙動】
- 予定を追加する際、既存の予定と重なっていないか 'manage_calendar' (action: list) で必ず確認してください。
- 重複がある場合は、社長に調整案を提示してください。

【メール検索と代理返信】
- 社長から「XXさんからのメールを探して」「先週の経理のメールは？」などの指示があった場合、'manage_gmail' (action: search) を使用してください。
- sender (送信者), subject (件名), startDate (開始日), endDate (終了日) などのパラメータを適切に組み合わせて精度高く検索してください。
- 検索結果を表示する際は :::email {"id": "ID", "from": "送信者", "subject": "件名", "summary": "要約"} ::: の形式を必ず使用してください。
- 返信案を提示する際は :::draft {"to": "宛先", "subject": "件名", "body": "本文"} ::: 形式を使用してください。

${kbContext}
現在の社長: ${currentUserName}
文唱堂印刷プロフィール: ${COMPANY_PROFILE}`,
        tools,
        thinkingConfig,
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
