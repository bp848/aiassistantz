// MCPレスポンスをUIプロトコルに変換するアダプター

interface EmailData {
  id: string;
  subject: string;
  from: string;
  preview: string;
  timestamp: string;
  important?: boolean;
}

interface ScheduleData {
  title: string;
  time: string;
  location?: string;
  attendees?: string[];
  date?: string;
}

interface DraftData {
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export class ResponseAdapter {
  // MCPデータをUI表示プロトコルに変換
  static formatResponse(toolName: string, mcpResult: any): string {
    switch (toolName) {
      case 'list_events':
        return this.formatEvents(mcpResult);
      case 'search_threads':
        return this.formatEmails(mcpResult);
      case 'get_message':
        return this.formatEmailDetail(mcpResult);
      case 'create_event':
        return this.formatEventCreated(mcpResult);
      case 'send_message':
        return this.formatEmailSent(mcpResult);
      default:
        return JSON.stringify(mcpResult);
    }
  }

  // カレンダーイベントをUIプロトコルに変換
  private static formatEvents(events: any[]): string {
    if (!Array.isArray(events)) return '';

    return events.map(event => {
      const scheduleData: ScheduleData = {
        title: event.summary || event.title || 'Untitled',
        time: this.formatTime(event.start?.dateTime || event.start?.date),
        location: event.location || '',
        date: event.start?.date || this.extractDate(event.start?.dateTime)
      };

      return `:::schedule ${JSON.stringify(scheduleData)} :::`;
    }).join('\n');
  }

  // メールリストをUIプロトコルに変換
  private static formatEmails(threads: any[]): string {
    if (!Array.isArray(threads)) return '';

    return threads.map(thread => {
      const firstMessage = thread.messages?.[0] || thread;
      const emailData: EmailData = {
        id: thread.id || firstMessage.id,
        subject: firstMessage.subject || '(no subject)',
        from: this.extractEmail(firstMessage.from),
        preview: this.extractPreview(firstMessage.snippet || firstMessage.body),
        timestamp: firstMessage.date || new Date().toISOString(),
        important: thread.labels?.includes('IMPORTANT') || false
      };

      return `:::email ${JSON.stringify(emailData)} :::`;
    }).join('\n');
  }

  // メール詳細をUIプロトコルに変換
  private static formatEmailDetail(message: any): string {
    const emailData: EmailData = {
      id: message.id,
      subject: message.subject || '(no subject)',
      from: this.extractEmail(message.from),
      preview: this.extractPreview(message.body || message.snippet),
      timestamp: message.date || new Date().toISOString(),
      important: message.labels?.includes('IMPORTANT') || false
    };

    return `:::email ${JSON.stringify(emailData)} :::`;
  }

  // イベント作成完了をUIプロトコルに変換
  private static formatEventCreated(result: any): string {
    return `✅ カレンダーイベントを作成しました: ${result.title || 'Untitled'}`;
  }

  // メール送信完了をUIプロトコルに変換
  private static formatEmailSent(result: any): string {
    return `✅ メールを送信しました: ${result.to || 'Unknown recipient'}`;
  }

  // ユーティリティメソッド
  private static formatTime(dateTime: string): string {
    if (!dateTime) return '終日';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  private static extractDate(dateTime: string): string {
    if (!dateTime) return new Date().toISOString().split('T')[0];
    return new Date(dateTime).toISOString().split('T')[0];
  }

  private static extractEmail(from: string): string {
    if (!from) return 'Unknown';
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
  }

  private static extractPreview(body: string): string {
    if (!body) return '';
    // HTMLタグを除去
    const text = body.replace(/<[^>]*>/g, '');
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }
}

export default ResponseAdapter;
