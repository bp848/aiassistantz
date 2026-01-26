import { supabase } from './supabaseClient';

const base64UrlEncode = (input: string) => {
  return btoa(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const base64UrlDecode = (input: string) => {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return atob(normalized);
};

const requireToken = async (): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Cannot access Google APIs.');
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Failed to get session: ${error.message}`);
    }
    
    if (!session) {
      throw new Error('No active session. Please log in with Google.');
    }
    
    if (!session.provider_token) {
      throw new Error('No Google access token found. Please re-authenticate with Google.');
    }
    
    return session.provider_token;
  } catch (e: any) {
    console.error('Token retrieval error:', e);
    throw new Error(`Authentication required: ${e.message}`);
  }
};

export interface CalendarEventInput {
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  duration?: string; // minutes as string
  description?: string;
  account?: 'company' | 'personal';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  description?: string;
  account: 'company' | 'personal';
}

export const listCalendarEvents = async (date?: string): Promise<CalendarEvent[]> => {
  const token = await requireToken();
  const params = new URLSearchParams({
    maxResults: '20',
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: date ? new Date(`${date}T00:00:00`).toISOString() : new Date().toISOString()
  });
  if (date) params.set('timeMax', new Date(`${date}T23:59:59`).toISOString());

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar list failed: ${err}`);
  }
  const data = await res.json();
  return (data.items || []).map((evt: any) => {
    const start = evt.start?.dateTime || evt.start?.date;
    const end = evt.end?.dateTime || evt.end?.date;
    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : startDate;
    const durationMinutes = Math.max(5, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    return {
      id: evt.id,
      title: evt.summary || '(無題)',
      date: startDate.toISOString().split('T')[0],
      time: startDate.toTimeString().slice(0, 5),
      duration: durationMinutes.toString(),
      description: evt.description || '',
      account: 'company' // single calendar for now
    } as CalendarEvent;
  });
};

export const createCalendarEvent = async (input: CalendarEventInput) => {
  const token = await requireToken();
  const startDateTime = new Date(`${input.date}T${input.time || '09:00'}:00`);
  const durationMinutes = Number(input.duration || '60');
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  const body = {
    summary: input.title,
    description: input.description,
    start: { dateTime: startDateTime.toISOString() },
    end: { dateTime: endDateTime.toISOString() }
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar create failed: ${err}`);
  }
  const evt = await res.json();
  return {
    id: evt.id,
    title: evt.summary,
    date: input.date,
    time: input.time || '09:00',
    duration: input.duration || '60',
    description: input.description,
    account: 'company'
  } as CalendarEvent;
};

export interface GmailMessageSummary {
  id: string;
  from: string;
  subject: string;
  snippet?: string;
  date?: string;
  unread?: boolean;
  body?: string;
}

const buildGmailQuery = (args: any) => {
  const parts: string[] = [];
  if (args.query) parts.push(args.query);
  if (args.sender) parts.push(`from:${args.sender}`);
  if (args.subject) parts.push(`subject:${args.subject}`);
  if (args.startDate) parts.push(`after:${args.startDate.replace(/-/g, '/')}`);
  if (args.endDate) parts.push(`before:${args.endDate.replace(/-/g, '/')}`);
  return parts.join(' ');
};

const extractHeader = (payload: any, name: string) =>
  payload.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

const decodeBody = (payload: any): string => {
  if (!payload?.parts) return payload?.body?.data ? base64UrlDecode(payload.body.data) : '';
  const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain') || payload.parts[0];
  return textPart?.body?.data ? base64UrlDecode(textPart.body.data) : '';
};

export const searchEmails = async (args: any): Promise<GmailMessageSummary[]> => {
  const token = await requireToken();
  const query = buildGmailQuery(args);
  const maxResults = args?.maxResults || 10;
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail search failed: ${err}`);
  }
  const data = await res.json();
  if (!data.messages || data.messages.length === 0) return [];

  const detailed = await Promise.all(
    data.messages.map(async (m: any) => {
      const d = await getEmailDetail({ messageId: m.id, token });
      return d;
    })
  );
  return detailed;
};

export const getEmailDetail = async (args: { messageId: string; token?: string }): Promise<GmailMessageSummary> => {
  const token = args.token || (await requireToken());
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${args.messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail get_detail failed: ${err}`);
  }
  const data = await res.json();
  const payload = data.payload || {};
  const from = extractHeader(payload, 'From');
  const subject = extractHeader(payload, 'Subject') || '(件名なし)';
  const date = extractHeader(payload, 'Date');
  const body = decodeBody(payload);

  return {
    id: data.id,
    from,
    subject,
    date,
    unread: !(data.labelIds || []).includes('UNREAD'),
    snippet: data.snippet,
    body
  };
};

export const sendEmail = async (args: { to: string; subject: string; body: string }) => {
  const token = await requireToken();
  
  let from = 'me';
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      from = userInfo.email || 'me';
    }
  } catch (e) {
    console.warn('Failed to fetch user info for email sender:', e);
  }

  const raw = [
    `From: ${from}`,
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    args.body
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: base64UrlEncode(raw) })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed: ${err}`);
  }

  return { status: 'success' };
};
