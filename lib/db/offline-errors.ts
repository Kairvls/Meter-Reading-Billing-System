export class OfflineCopyWriteError<T> extends Error {
  record: T;
  offline = true as const;

  constructor(record: T, message = "Saved to offline copy only. Sync when Firebase is available.") {
    super(message);
    this.name = "OfflineCopyWriteError";
    this.record = record;
  }
}

export function isOfflineCopyWriteError(
  error: unknown
): error is OfflineCopyWriteError<unknown> {
  return error instanceof OfflineCopyWriteError;
}
