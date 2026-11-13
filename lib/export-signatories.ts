export type Signatory = {
  label: string;
  name: string;
  title: string;
};

export type ExportSignatories = {
  preparedBy: Signatory;
  checkedBy: Signatory;
  notedBy: Signatory;
  receivedBy: string;
};

export const DEFAULT_EXPORT_SIGNATORIES: ExportSignatories = {
  preparedBy: {
    label: "Prepared by:",
    name: "SAMMER G. SANCHEZ",
    title: "MBM\nBilling Aide",
  },
  checkedBy: {
    label: "Checked by:",
    name: "RICAFLOR SUAN",
    title: "OIC - MRBD Chief",
  },
  notedBy: {
    label: "Noted by:",
    name: "FRANCES PAULA M. LUMACANG, CPA,",
    title: "FSD Manager",
  },
  receivedBy: "",
};

const STORAGE_KEY = "leyeco.exportSignatories";

export function loadExportSignatories(): ExportSignatories {
  if (typeof window === "undefined") return DEFAULT_EXPORT_SIGNATORIES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXPORT_SIGNATORIES;
    const parsed = JSON.parse(raw) as Partial<ExportSignatories>;
    return {
      preparedBy: {
        ...DEFAULT_EXPORT_SIGNATORIES.preparedBy,
        ...parsed.preparedBy,
      },
      checkedBy: {
        ...DEFAULT_EXPORT_SIGNATORIES.checkedBy,
        ...parsed.checkedBy,
      },
      notedBy: {
        ...DEFAULT_EXPORT_SIGNATORIES.notedBy,
        ...parsed.notedBy,
      },
      receivedBy:
        typeof parsed.receivedBy === "string"
          ? parsed.receivedBy
          : DEFAULT_EXPORT_SIGNATORIES.receivedBy,
    };
  } catch {
    return DEFAULT_EXPORT_SIGNATORIES;
  }
}

export function saveExportSignatories(value: ExportSignatories) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
