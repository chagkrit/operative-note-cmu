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

function saveAllNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function upsertNote(note) {
  const all = loadAllNotes();
  const idx = all.findIndex(n => n.id === note.id);
  const updated = { ...note, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.unshift({ ...updated, createdAt: new Date().toISOString() });
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
    driveUploadedAt: null
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
