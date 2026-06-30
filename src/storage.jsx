// localStorage persistence

const STORAGE_KEY = "op_notes_cmu_v1";
const PATIENT_CONDITIONS_DEFAULT = "Stable: Successful surgery and are stable, with normal vital signs";

function loadAllNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("load failed", e);
    return [];
  }
}

function isQuotaError(e) {
  return !!(e && (String(e.name).includes("Quota") || e.code === 22));
}

// Strip image binary data from a note, keeping Drive links intact
function stripNoteImages(n) {
  return {
    ...n,
    specimen_image_1: n.specimen_image_1 ? { name: n.specimen_image_1.name } : null,
    specimen_image_2: n.specimen_image_2 ? { name: n.specimen_image_2.name } : null,
  };
}

function saveAllNotes(notes) {
  // Try full save first
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return;
  } catch (e) {
    if (!isQuotaError(e)) throw e;
  }
  // Fallback: strip image dataUrls from notes already backed up to Drive
  // (they're safe on Drive — we just drop the cached binary to free space)
  const compacted = notes.map(n => n.driveUploadedAt ? stripNoteImages(n) : n);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
    return;
  } catch (e) {
    if (!isQuotaError(e)) throw e;
  }
  // If still no room, throw a clear storage error
  const err = new Error("QuotaExceededError: พื้นที่จัดเก็บในเครื่องเต็ม กรุณา Upload to Drive แล้วลองอีกครั้ง");
  err.name = "QuotaExceededError";
  throw err;
}

function upsertNote(note) {
  const all = loadAllNotes();
  const idx = all.findIndex(n => n.id === note.id);
  const now = new Date().toISOString();
  const existing = idx >= 0 ? all[idx] : null;
  const updated = {
    ...(existing || {}),
    ...note,
    createdAt: note.createdAt || (existing && existing.createdAt) || now,
    updatedAt: now,
  };
  if (idx >= 0) all[idx] = updated;
  else all.unshift(updated);
  saveAllNotes(all);
  return updated;
}

function deleteNote(id) {
  const all = loadAllNotes().filter(n => n.id !== id);
  saveAllNotes(all);
}


function duplicateNote(id) {
  const all = loadAllNotes();
  const src = all.find(n => n.id === id);
  if (!src) return null;
  const copy = {
    ...src,
    id: "note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name: src.name + " (copy)",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    driveUploadedAt: null,
    driveFileId: null,
    driveFileLink: null,
    patientFolderId: null,
    patientFolderLink: null,
    specimen_image_1_fileId: null,
    specimen_image_1_link: null,
    specimen_image_2_fileId: null,
    specimen_image_2_link: null
  };
  all.unshift(copy);
  saveAllNotes(all);
  return copy;
}

function newNoteId() {
  return "note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}

function emptyNote() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newNoteId(),
    name: "",
    age: "",
    gender: "หญิง",
    ward: "",
    hn: "",
    surgeon: "",
    firstassistant: "",
    secondassistant: "",
    thirdassistant: "",
    anesthesia: "General Anesthesia",
    scrub: "",
    date: today,
    opstart: "",
    opend: "",
    totaloptime: "",
    room: "",
    side: "",
    preopdx: "",
    mmg_birads: "",
    neoadj_rt: "",
    us_thyroid_risk: "",
    operation: "",
    postopdx: "",
    position: "supine",
    incision: "",
    opfinding: "",
    opprocedure: "",
    specimen: "",
    specimen_image_1: null, // {dataUrl, name}
    specimen_image_2: null,
    patientFolderId: null,
    patientFolderLink: null,
    specimen_image_1_fileId: null,
    specimen_image_1_link: null,
    specimen_image_2_fileId: null,
    specimen_image_2_link: null,
    ebl: "",
    fluid: "",
    bloodtx: "0",
    drain: "None",
    complication: "None",
    patientcondition: PATIENT_CONDITIONS_DEFAULT,
    signature: "",
    complete: false,
    driveUploadedAt: null,
    createdAt: null,
    updatedAt: null
  };
}

window.OP_STORE = {
  loadAllNotes, saveAllNotes, upsertNote, deleteNote, duplicateNote, newNoteId, emptyNote,
};
