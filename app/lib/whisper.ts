// NÃO importar whisper.rn no topo — é um módulo nativo que trava no Expo Go.
// O import é feito de forma lazy dentro das funções, só quando necessário.
import * as FileSystem from "expo-file-system";

// Modelo tiny (~75 MB) — bom custo-benefício para frases curtas em português
const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin";

const MODEL_DIR = FileSystem.documentDirectory + "whisper/";
const MODEL_PATH = MODEL_DIR + "ggml-tiny.bin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ctx: any | null = null;

export type WhisperStatus =
  | { tipo: "idle" }
  | { tipo: "baixando"; progresso: number }
  | { tipo: "carregando" }
  | { tipo: "pronto" }
  | { tipo: "transcrevendo" };

/**
 * Garante que o modelo está baixado e o contexto inicializado.
 * Chama onStatus para atualizar a UI com o progresso.
 */
export async function prepararWhisper(
  onStatus: (s: WhisperStatus) => void
): Promise<any> {
  if (_ctx) return _ctx;

  // Import lazy — só executa quando o módulo nativo está disponível (APK/dev build)
  const { initWhisper } = await import("whisper.rn");

  // Garante que o diretório existe
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
  }

  // Baixa o modelo se ainda não existir
  const modelInfo = await FileSystem.getInfoAsync(MODEL_PATH);
  if (!modelInfo.exists) {
    onStatus({ tipo: "baixando", progresso: 0 });
    const download = FileSystem.createDownloadResumable(
      MODEL_URL,
      MODEL_PATH,
      {},
      (progress) => {
        const pct = Math.round(
          (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
        );
        onStatus({ tipo: "baixando", progresso: pct });
      }
    );
    await download.downloadAsync();
  }

  // Carrega o modelo em memória
  onStatus({ tipo: "carregando" });
  _ctx = await initWhisper({ filePath: MODEL_PATH });
  onStatus({ tipo: "pronto" });

  return _ctx;
}

/**
 * Transcreve um arquivo de áudio offline usando Whisper tiny.
 * Baixa e inicializa o modelo na primeira chamada.
 */
export async function transcreverOffline(
  uri: string,
  onStatus: (s: WhisperStatus) => void
): Promise<string> {
  const ctx = await prepararWhisper(onStatus);

  onStatus({ tipo: "transcrevendo" });

  const { promise } = ctx.transcribe(uri, {
    language: "pt",
    maxLen: 1,
    tokenTimestamps: false,
  });

  const { result } = await promise;
  return result.trim();
}

/** Remove o modelo do disco (libera ~75 MB). */
export async function removerModelo(): Promise<void> {
  _ctx = null;
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  if (info.exists) {
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
  }
}

/** Retorna true se o modelo já está baixado no disco. */
export async function modeloBaixado(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  return info.exists;
}
