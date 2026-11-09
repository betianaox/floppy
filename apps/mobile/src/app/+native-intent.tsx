// Cuando otra app comparte algo con Floppy, Android abre la app con un enlace
// interno de expo-share-intent. Se manda al inicio, donde ShareIntentHandler lo procesa.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes('dataUrl=')) return '/';
  return path;
}
