import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';

import { backend } from '@/lib/backend';
import { useData } from '@/state/data';
import { useSignedIn } from '@/state/session';

/**
 * Lo que llega desde "Compartir" en otra app: un enlace abre la pantalla de
 * enlace ya completa, un texto la de escribir, y una imagen se procesa directo.
 */
export function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const signedIn = useSignedIn();
  const capture = useData((s) => s.capture);

  useEffect(() => {
    if (!hasShareIntent || !signedIn) return;
    const image = shareIntent.files?.find((f) => f.mimeType?.startsWith('image/'));
    (async () => {
      if (image) {
        const small = await manipulateAsync(image.path, [{ resize: { width: 1280 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
        const data = small.base64 ?? '';
        const photoPath = await backend.uploadPhoto(data, 'image/jpeg');
        await capture({ kind: 'image', data, mimeType: 'image/jpeg', photoPath });
      } else if (shareIntent.webUrl) {
        const comment = shareIntent.text?.replace(shareIntent.webUrl, '').trim();
        router.push({ pathname: '/escribir', params: { modo: 'enlace', url: shareIntent.webUrl, texto: comment || shareIntent.meta?.title || '' } });
      } else if (shareIntent.text) {
        router.push({ pathname: '/escribir', params: { texto: shareIntent.text } });
      }
      resetShareIntent();
    })();
  }, [hasShareIntent, signedIn, shareIntent, resetShareIntent, capture]);

  return null;
}
