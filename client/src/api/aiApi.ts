import { request } from './client';

export interface ReviewIssue {
  type: 'SECURITY' | 'BUG' | 'PERFORMANCE' | 'STYLE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  lineRange: [number, number];
  message: string;
  suggestedFix: string;
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
}

export interface DebugResult {
  explanation: string;
  rootCause: string;
  fixedCode: string;
  steps: string[];
}

export interface ExplainResult {
  overview: string;
  components: Array<{ name: string; description: string }>;
  complexity: { time: string; space: string };
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const aiApi = {
  reviewCode: (payload: {
    projectId: string;
    filePath: string;
    code: string;
    language?: string;
  }) => {
    return request<ReviewResult>('/ai/review', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  debugCode: (payload: {
    code: string;
    errorMessage?: string;
    language?: string;
  }) => {
    return request<DebugResult>('/ai/debug', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  explainCode: (payload: {
    code: string;
    language?: string;
    detailLevel?: 'brief' | 'detailed';
  }) => {
    return request<ExplainResult>('/ai/explain', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  streamChat: (
    payload: {
      projectId?: string;
      messages: ChatMessage[];
      activeFile?: { path: string; content: string; language: string };
    },
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: Error) => void
  ): (() => void) => {
    const controller = new AbortController();
    const token = localStorage.getItem('codesync_access_token');
    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';

    fetch(`${apiBase}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Chat request failed with status ${res.status}`);
        }
        if (!res.body) {
          throw new Error('Response body is empty');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                onDone();
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  onChunk(parsed.text);
                } else if (parsed.error) {
                  onError(new Error(parsed.error));
                  return;
                }
              } catch {
                // Ignore parse errors on partial lines
              }
            }
          }
        }
        onDone();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err);
        }
      });

    return () => controller.abort();
  },

  getChatHistory: (projectId: string) => {
    return request<{ messages: ChatMessage[] }>(`/ai/conversations/${projectId}`, {
      method: 'GET'
    });
  },

  clearChatHistory: (projectId: string) => {
    return request<{ message: string }>(`/ai/conversations/${projectId}`, {
      method: 'DELETE'
    });
  }
};
