import { useEffect } from 'react';
import type { PluginMessage } from '../../shared/types';

type MessageHandler = (message: PluginMessage) => void;

export function usePluginMessage(handler: MessageHandler) {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (msg) {
        handler(msg);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handler]);
}

export function postToPlugin(message: PluginMessage) {
  parent.postMessage({ pluginMessage: message }, '*');
}
