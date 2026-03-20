/**
 * removeBackground.ts
 *
 * Wrapper sobre @imgly/background-removal v1.7+.
 * Corre 100% en el navegador via WASM — sin servidor.
 *
 * Comportamiento de los modelos ONNX:
 *   - Se descargan desde el CDN de imgly (staticimgly.com) en el PRIMER uso.
 *   - Se cachean automáticamente en el WebView (Cache API del browser).
 *   - Usos posteriores son completamente offline — no requieren red.
 *   - El modelo "small" pesa ~27MB (descarga única).
 *
 * Uso:
 *   const bytes = await removeLogoBackground(file);
 *   // bytes = Uint8Array de un PNG con canal alpha (fondo transparente)
 */

import { removeBackground, type Config } from '@imgly/background-removal';

/** Configuración por defecto — isnet_quint8 es el más liviano (~27MB) */
const DEFAULT_CONFIG: Config = {
  // publicPath omitido → usa el CDN de imgly por defecto:
  // https://staticimgly.com/@imgly/background-removal-data/{version}/dist/
  // Los modelos se cachean en el WebView tras la primera descarga.
  model: 'isnet_quint8',   // Más liviano (~27MB); alternativas: 'isnet_fp16', 'isnet'
  output: {
    format: 'image/png',   // Siempre PNG para preservar el canal alpha
    quality: 0.9,
  },
};

/**
 * Recibe un File de imagen y retorna un Uint8Array con el PNG resultante
 * (fondo removido, canal alpha preservado).
 *
 * @param file        Archivo de imagen de entrada (PNG, JPG, WEBP, SVG)
 * @param onProgress  Callback opcional con progreso 0–1
 * @throws Si el procesamiento falla (sin conexión en primer uso, imagen inválida, etc.)
 */
export async function removeLogoBackground(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<Uint8Array> {
  const config: Config = {
    ...DEFAULT_CONFIG,
    progress: onProgress
      ? (_key: string, current: number, total: number) => {
          onProgress(total > 0 ? current / total : 0);
        }
      : undefined,
  };

  const resultBlob = await removeBackground(file, config);
  const arrayBuffer = await resultBlob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Igual que removeLogoBackground pero retorna un data URL listo para
 * previsualizar en un <img src=...>.
 */
export async function removeLogoBackgroundAsDataUrl(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const bytes = await removeLogoBackground(file, onProgress);
  const blob = new Blob([bytes], { type: 'image/png' });
  return URL.createObjectURL(blob);
}
