import { useEffect, useMemo, useRef, useState } from 'react';
import type { IAiReview, IAiReviewRequest, IAiSettings } from '../types/ai';
import { reviewForm } from '../utils/ai/review-form';

interface IReviewState {
  identity: object;
  isLoading: boolean;
  result?: IAiReview;
  error?: string;
}

interface IAiReviewState {
  isLoading: boolean;
  result?: IAiReview;
  error?: string;
  generate: () => Promise<void>;
  cancel: () => void;
}

export const useAiReview = (request: IAiReviewRequest, settings: IAiSettings): IAiReviewState => {
  const identity = useMemo(
    () => ({
      request,
      hasKey: Boolean(settings.apiKey),
      endpoint: settings.endpoint,
      model: settings.model,
      provider: settings.provider,
    }),
    [request, settings.apiKey, settings.endpoint, settings.model, settings.provider],
  );
  const activeController = useRef<AbortController | undefined>(undefined);
  const [state, setState] = useState<IReviewState>();

  // Replacing either export or provider settings invalidates an in-flight review.
  useEffect(() => {
    return (): void => {
      activeController.current?.abort();
    };
  }, [identity]);

  const generate = async (): Promise<void> => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setState({ identity, isLoading: true });

    try {
      const result = await reviewForm(request, settings, controller.signal);
      if (!controller.signal.aborted) {
        setState({ identity, result, isLoading: false });
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        const message = reason instanceof Error ? reason.message : 'The provider request failed.';
        const error = settings.apiKey ? message.replaceAll(settings.apiKey, '[REDACTED]') : message;
        setState({ identity, error, isLoading: false });
      }
    }
  };

  const cancel = (): void => {
    activeController.current?.abort();
    setState({ identity, isLoading: false });
  };

  // Hide old results immediately, even before the cleanup effect has run.
  const current = state?.identity === identity ? state : undefined;
  return {
    isLoading: current?.isLoading ?? false,
    result: current?.result,
    error: current?.error,
    generate,
    cancel,
  };
};
