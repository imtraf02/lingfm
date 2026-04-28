import { invoke } from "@tauri-apps/api/core";

/**
 * Type-safe wrapper for Tauri's invoke function.
 */
export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`Tauri Invoke Error [${command}]:`, error);
    throw error;
  }
}
