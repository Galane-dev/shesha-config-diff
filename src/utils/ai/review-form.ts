import type { IAiReview, IAiReviewRequest, IAiSettings } from '../../types/ai';
import { parseReview } from './parse-review';
import { createReviewPrompt, REVIEW_INSTRUCTIONS } from './review-prompt';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readErrorMessage = async (response: Response): Promise<string> => {
  let body: unknown;

  try {
    body = (await response.json()) as unknown;
  } catch {
    return `${response.status} ${response.statusText}`;
  }

  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') {
    return body.error.message;
  }

  return `${response.status} ${response.statusText}`;
};

const fetchJson = async (url: string, init: RequestInit): Promise<unknown> => {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    if (init.signal?.aborted) {
      throw new DOMException('Review cancelled.', 'AbortError');
    }
    throw new Error(
      'The provider could not be reached. Check its browser CORS policy and endpoint.',
    );
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<unknown>;
};

const extractOpenAiResponseText = (body: unknown): string => {
  if (!isRecord(body) || !Array.isArray(body.output)) {
    throw new Error('The OpenAI response did not contain output.');
  }

  if (body.status === 'incomplete') {
    throw new Error(
      'The provider stopped before completing the review. Try again or select another model.',
    );
  }

  const texts = body.output.flatMap((output) => {
    if (!isRecord(output) || !Array.isArray(output.content)) {
      return [];
    }

    return output.content.flatMap((content) =>
      isRecord(content) && content.type === 'output_text' && typeof content.text === 'string'
        ? [content.text]
        : [],
    );
  });

  if (texts.length === 0) {
    throw new Error('The OpenAI response contained no text.');
  }

  return texts.join('\n');
};

const extractAnthropicText = (body: unknown): string => {
  if (!isRecord(body) || !Array.isArray(body.content)) {
    throw new Error('The Anthropic response did not contain content.');
  }

  if (body.stop_reason === 'max_tokens') {
    throw new Error(
      'The provider stopped before completing the review. Try again or select another model.',
    );
  }

  const texts = body.content.flatMap((content) =>
    isRecord(content) && content.type === 'text' && typeof content.text === 'string'
      ? [content.text]
      : [],
  );

  if (texts.length === 0) {
    throw new Error('The Anthropic response contained no text.');
  }

  return texts.join('\n');
};

const extractGeminiText = (body: unknown): string => {
  if (!isRecord(body) || !Array.isArray(body.candidates)) {
    throw new Error('The Gemini response did not contain candidates.');
  }

  const texts = body.candidates.flatMap((candidate) => {
    if (
      !isRecord(candidate) ||
      !isRecord(candidate.content) ||
      !Array.isArray(candidate.content.parts)
    ) {
      return [];
    }

    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new Error(
        'The provider stopped before completing the review. Try again or select another model.',
      );
    }

    return candidate.content.parts.flatMap((part) =>
      isRecord(part) && typeof part.text === 'string' ? [part.text] : [],
    );
  });

  if (texts.length === 0) {
    throw new Error('The Gemini response contained no text.');
  }

  return texts.join('\n');
};

const extractCompatibleText = (body: unknown): string => {
  if (!isRecord(body) || !Array.isArray(body.choices)) {
    throw new Error('The provider response did not contain choices.');
  }

  const firstChoice: unknown = body.choices[0];

  if (
    !isRecord(firstChoice) ||
    !isRecord(firstChoice.message) ||
    typeof firstChoice.message.content !== 'string'
  ) {
    throw new Error('The provider response contained no message text.');
  }

  if (firstChoice.finish_reason === 'length') {
    throw new Error(
      'The provider stopped before completing the review. Try again or select another model.',
    );
  }

  return firstChoice.message.content;
};

const requestOpenAi = async (
  settings: IAiSettings,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> => {
  const body = await fetchJson(settings.endpoint, {
    body: JSON.stringify({
      input: prompt,
      instructions: REVIEW_INSTRUCTIONS,
      model: settings.model,
      store: false,
    }),
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  });

  return extractOpenAiResponseText(body);
};

const requestAnthropic = async (
  settings: IAiSettings,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> => {
  const body = await fetchJson(settings.endpoint, {
    body: JSON.stringify({
      max_tokens: 2_000,
      messages: [{ content: prompt, role: 'user' }],
      model: settings.model,
      system: REVIEW_INSTRUCTIONS,
    }),
    headers: {
      'anthropic-dangerous-direct-browser-access': 'true',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
    },
    method: 'POST',
    signal,
  });

  return extractAnthropicText(body);
};

const requestGemini = async (
  settings: IAiSettings,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> => {
  const endpoint = `${settings.endpoint.replace(/\/$/, '')}/${encodeURIComponent(settings.model)}:generateContent`;
  const body = await fetchJson(endpoint, {
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }], role: 'user' }],
      systemInstruction: { parts: [{ text: REVIEW_INSTRUCTIONS }] },
    }),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': settings.apiKey,
    },
    method: 'POST',
    signal,
  });

  return extractGeminiText(body);
};

const requestCompatibleProvider = async (
  settings: IAiSettings,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> => {
  const body = await fetchJson(settings.endpoint, {
    body: JSON.stringify({
      messages: [
        { content: REVIEW_INSTRUCTIONS, role: 'system' },
        { content: prompt, role: 'user' },
      ],
      model: settings.model,
    }),
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  });

  return extractCompatibleText(body);
};

export const reviewForm = async (
  request: IAiReviewRequest,
  settings: IAiSettings,
  signal?: AbortSignal,
): Promise<IAiReview> => {
  const prompt = createReviewPrompt(request.payload);
  let content: string;

  switch (settings.provider) {
    case 'openai':
      content = await requestOpenAi(settings, prompt, signal);
      break;
    case 'anthropic':
      content = await requestAnthropic(settings, prompt, signal);
      break;
    case 'gemini':
      content = await requestGemini(settings, prompt, signal);
      break;
    case 'openai-compatible':
      content = await requestCompatibleProvider(settings, prompt, signal);
      break;
  }

  return parseReview(content, request.targets);
};
