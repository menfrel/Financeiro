// Google Calendar API integration

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

interface GoogleCalendarConfig {
  accessToken: string;
  calendarId?: string;
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig | null = null;
  private readonly baseUrl = "https://www.googleapis.com/calendar/v3";

  setConfig(config: GoogleCalendarConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return this.config !== null && !!this.config.accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.config) {
      throw new Error("Google Calendar não configurado");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Google Calendar API Error: ${error.error?.message || response.statusText}`,
      );
    }

    return response.json();
  }

  async createEvent(event: GoogleCalendarEvent): Promise<string> {
    const calendarId = this.config?.calendarId || "primary";
    const result = await this.makeRequest(`/calendars/${calendarId}/events`, {
      method: "POST",
      body: JSON.stringify(event),
    });
    return result.id;
  }

  async updateEvent(
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<void> {
    const calendarId = this.config?.calendarId || "primary";
    await this.makeRequest(`/calendars/${calendarId}/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(event),
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    const calendarId = this.config?.calendarId || "primary";
    await this.makeRequest(`/calendars/${calendarId}/events/${eventId}`, {
      method: "DELETE",
    });
  }

  async getEvent(eventId: string): Promise<GoogleCalendarEvent> {
    const calendarId = this.config?.calendarId || "primary";
    return await this.makeRequest(`/calendars/${calendarId}/events/${eventId}`);
  }

  async listCalendars() {
    return await this.makeRequest("/users/me/calendarList");
  }

  // Utility method to convert session data to Google Calendar event
  sessionToCalendarEvent(session: {
    patient_name: string;
    session_date: string;
    duration_minutes: number;
    session_type: string;
    notes?: string;
    patient_email?: string;
  }): GoogleCalendarEvent {
    const startDate = new Date(session.session_date);
    const endDate = new Date(
      startDate.getTime() + session.duration_minutes * 60000,
    );

    const event: GoogleCalendarEvent = {
      summary: `Sessão - ${session.patient_name}`,
      description: `Tipo: ${session.session_type}\nDuração: ${session.duration_minutes} minutos${session.notes ? `\n\nObservações: ${session.notes}` : ""}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    if (session.patient_email) {
      event.attendees = [
        {
          email: session.patient_email,
          displayName: session.patient_name,
        },
      ];
    }

    return event;
  }
}

export const googleCalendarService = new GoogleCalendarService();

// OAuth2 configuration for Google Calendar
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

export const GOOGLE_OAUTH_CONFIG = {
  clientId: "", // Will be set from environment variables
  redirectUri: `${window.location.origin}/auth/google/callback`,
  scope: GOOGLE_CALENDAR_SCOPES.join(" "),
  responseType: "code",
  accessType: "offline",
  prompt: "consent",
};

// Helper function to initiate Google OAuth flow
export function initiateGoogleAuth() {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    scope: GOOGLE_OAUTH_CONFIG.scope,
    response_type: GOOGLE_OAUTH_CONFIG.responseType,
    access_type: GOOGLE_OAUTH_CONFIG.accessType,
    prompt: GOOGLE_OAUTH_CONFIG.prompt,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  window.location.href = authUrl;
}

// Helper function to exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  // This should be done on the server side for security
  // For now, we'll return a placeholder
  throw new Error("Token exchange must be implemented on the server side");
}
