const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

type ApiProxyRequest = {
  type: "WA_AI_API_FETCH";
  path: string;
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  };
};

type ApiProxyResponse =
  | {
      ok: true;
      status: number;
      statusText: string;
      body: string;
    }
  | {
      ok: false;
      status: number;
      statusText: string;
      body: string;
    };

chrome.runtime.onMessage.addListener((message: ApiProxyRequest, _sender, sendResponse) => {
  if (!message || message.type !== "WA_AI_API_FETCH") return false;

  void proxyApiRequest(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        status: 0,
        statusText: error instanceof Error ? error.message : "Extension API proxy failed",
        body: ""
      } satisfies ApiProxyResponse);
    });

  return true;
});

async function proxyApiRequest(message: ApiProxyRequest): Promise<ApiProxyResponse> {
  const response = await fetch(`${API_BASE_URL}${message.path}`, {
    method: message.init?.method || "GET",
    headers: message.init?.headers,
    body: message.init?.body ?? undefined,
    credentials: "include"
  });

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: await response.text()
  };
}
