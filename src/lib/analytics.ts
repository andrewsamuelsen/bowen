export const GA_TRACKING_ID = 'G-BR42JG7C40';

// https://developers.google.com/analytics/devguides/collection/ga4/event-parameters
export const trackEvent = (action: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, params);
  }
};

export const ANALYTICS_EVENTS = {
  ADD_PERSON: 'add_person',
  ADD_RELATIONSHIP: 'add_relationship',
  COMPLETE_CARD: 'complete_card',
  RUN_REPORT: 'run_report',
  SEND_CHAT: 'send_chat_message',
  SIGN_UP: 'sign_up'
};
