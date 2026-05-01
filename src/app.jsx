// Main app shell with login gate + Drive OAuth

const { loadAllNotes, upsertNote, deleteNote, duplicateNote, emptyNote } = window.OP_STORE;
const { DRIVE_FOLDER_URL, DRIVE_FOLDER_ID } = window.OP_CONST;
const LOGO_SRC = "assets/logo.jpg";

// ---- Auth ----
const AUTH_USER = "hnbcmu@gmail.com";
const AUTH_PASS = "hnbcmu1234";
const AUTH_KEY = "op_notes_auth_v1";

function isLoggedIn() {
  try { return localStorage.getItem(AUTH_KEY) === "1"; } catch { return false; }
}
function setLoggedIn(v) {
  try { v ? localStorage.setItem(AUTH_KEY, "1") : localStorage.removeItem(AUTH_KEY); } catch {}
}

function LoginScreen({ onLogin }) {
  const [u, setU] = React.useState("");
  const [p, setP] = React.useState("");
  const [err, setErr] = React.useState("");
  const submit = (e) => {
    e.preventDefault();
    if (u.trim().toLowerCase() === AUTH_USER && p === AUTH_PASS) {
      setLoggedIn(true);
      onLogin();
    } else {
      setErr("Username หรือ password ไม่ถูกต้อง");
    }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "linear-gradient(135deg, #faf7f6 0%, #fbf3f5 100%)" }}>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 20px 50px rgba(40,20,25,0.1), 0 0 0 1px rgba(40,20,25,0.04)", padding: "40px 36px", width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={LOGO_SRC} alt="logo" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", marginBottom: 16, border: "1px solid var(--line-2)" }} />
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, letterSpacing: "-0.01em", color: "var(--ink)" }}>Operative Note</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--rose)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
            Breast & Endocrine Surgery · CMU
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Username</label>
            <input type="text" value={u} onChange={e => setU(e.target.value)} placeholder="hnbcmu@gmail.com" autoComplete="username" autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Password</label>
            <input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          {err && <div style={{ color: "var(--err)", fontSize: 12.5, marginBottom: 12, padding: "8px 12px", background: "#fbeceb", borderRadius: 6 }}>{err}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "11px 16px", justifyContent: "center" }}>เข้าสู่ระบบ</button>
        </form>
        <div style={{ fontSize: 11, color: "var(--ink-4)", textAlign: "center", marginTop: 20, fontFamily: "var(--font-mono)" }}>
          Department of Surgery · MEDCMU
        </div>
      </div>
    </div>
  );
}

// ---- Google Drive OAuth (browser-configurable) ----
const GOOGLE_CLIENT_ID_KEY = "op_notes_gcid_v1";
const GOOGLE_TOKEN_KEY = "op_notes_gtoken_v1";

const DEFAULT_CLIENT_ID = "929532184474-1jresva7l73jnj96sfll47jum48sggt8.apps.googleusercontent.com";
function getClientId() {
  try { return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || DEFAULT_CLIENT_ID; } catch { return DEFAULT_CLIENT_ID; }
}
function setClientId(v) {
  try { localStorage.setItem(GOOGLE_CLIENT_ID_KEY, v); } catch {}
}
function getStoredToken() {
  try {
    const raw = localStorage.getItem(GOOGLE_TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (t.expiresAt && Date.now() > t.expiresAt) return null;
    return t;
  } catch { return null; }
}
function setStoredToken(t) {
  try { localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify(t)); } catch {}
}
function clearStoredToken() {
  try { localStorage.removeItem(GOOGLE_TOKEN_KEY); } catch {}
}

let _gisLoaded = false;
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) { _gisLoaded = true; resolve(); return; }
    if (_gisLoaded) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => { _gisLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function requestAccessToken() {
  const clientId = getClientId();
  if (!clientId) throw new Error("NO_CLIENT_ID");
  await loadGIS();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        const token = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in * 1000) - 30000,
        };
        setStoredToken(token);
        resolve(token);
      }
    });
    client.requestAccessToken({ prompt: "" });
  });
}

// ---- SheetJS loader ----
let _xlsxLoaded = false;
function loadXlsx() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(); return; }
    if (_xlsxLoaded) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    s.onload = () => { _xlsxLoaded = true; resolve(); };
    s.onerror = () => {
      // fallback CDN
      const s2 = document.createElement("script");
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s2.onload = () => { _xlsxLoaded = true; resolve(); };
      s2.onerror = reject;
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  });
}

// localStorage key for tracking the Excel file ID on Drive
const DRIVE_EXCEL_FILE_ID_KEY = "op_notes_excel_fid_v1";
function getExcelFileId() { try { return localStorage.getItem(DRIVE_EXCEL_FILE_ID_KEY) || null; } catch { return null; } }
function setExcelFileId(id) { try { localStorage.setItem(DRIVE_EXCEL_FILE_ID_KEY, id); } catch {} }

// Excel column headers — order matters, matches note fields
const EXCEL_COLUMNS = [
  { key: "date",           header: "Date" },
  { key: "hn",             header: "HN" },
  { key: "name",           header: "Patient Name" },
  { key: "age",            header: "Age" },
  { key: "gender",         header: "Gender" },
  { key: "ward",           header: "Ward" },
  { key: "surgeon",        header: "Surgeon" },
  { key: "firstassistant", header: "1st Assistant" },
  { key: "secondassistant",header: "2nd Assistant" },
  { key: "thirdassistant", header: "3rd Assistant" },
  { key: "anesthesia",     header: "Anesthesia" },
  { key: "scrub",          header: "Scrub Nurse" },
  { key: "room",           header: "OR Room" },
  { key: "opstart",        header: "Op Start" },
  { key: "opend",          header: "Op End" },
  { key: "totaloptime",    header: "Total Op Time (min)" },
  { key: "side",           header: "Side" },
  { key: "preopdx",        header: "Pre-Op Dx" },
  { key: "mmg_birads",     header: "MMG BIRADS" },
  { key: "neoadj_rt",      header: "Neoadj RT" },
  { key: "us_thyroid_risk",header: "US Thyroid Risk" },
  { key: "operation",      header: "Operation" },
  { key: "postopdx",       header: "Post-Op Dx" },
  { key: "position",       header: "Position" },
  { key: "incision",       header: "Incision" },
  { key: "opfinding",      header: "Op Finding" },
  { key: "opprocedure",    header: "Op Procedure" },
  { key: "specimen",       header: "Specimen" },
  { key: "ebl",            header: "EBL (ml)" },
  { key: "fluid",          header: "IV Fluid (ml)" },
  { key: "bloodtx",        header: "Blood Tx (unit)" },
  { key: "drain",          header: "Drain" },
  { key: "complication",   header: "Complication" },
  { key: "patientcondition",header: "Patient Condition" },
  { key: "signature",      header: "Signature" },
  { key: "complete",       header: "Complete" },
  { key: "createdAt",      header: "Created At" },
  { key: "updatedAt",      header: "Updated At" },
  { key: "driveUploadedAt",header: "Drive Uploaded At" },
];

function noteToRow(note) {
  return EXCEL_COLUMNS.map(c => {
    const v = note[c.key];
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  });
}

// Upload any binary blob to Drive (multipart), returns {id, webViewLink}
async function driveUploadBlob(blob, mimeType, fileName, folderId, existingFileId, accessToken) {
  // PATCH (update) must NOT include parents; POST (create) needs parents
  const metadata = { name: fileName, mimeType };
  if (!existingFileId && folderId) metadata.parents = [folderId];
  // Strip undefined keys
  Object.keys(metadata).forEach(k => metadata[k] === undefined && delete metadata[k]);

  const boundary = "xlsxbnd_" + Math.random().toString(36).slice(2);
  const buf = await blob.arrayBuffer();
  const enc = new TextEncoder();
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const post = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(pre.byteLength + buf.byteLength + post.byteLength);
  body.set(pre, 0);
  body.set(new Uint8Array(buf), pre.byteLength);
  body.set(post, pre.byteLength + buf.byteLength);

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`;
  const method = existingFileId ? "PATCH" : "POST";

  const resp = await fetch(url, {
    method,
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!resp.ok) {
    const err = await resp.text();
    if (resp.status === 401) { clearStoredToken(); throw new Error("AUTH_EXPIRED: " + err); }
    throw new Error("Upload failed: " + err);
  }
  return await resp.json();
}

// Download file bytes from Drive
async function driveDownloadFile(fileId, accessToken) {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: "Bearer " + accessToken },
  });
  if (!resp.ok) {
    if (resp.status === 404 || resp.status === 403) return null; // file deleted/moved
    throw new Error("Download failed: " + await resp.text());
  }
  return await resp.arrayBuffer();
}

const EXCEL_FILENAME = "OperativeNotes_CMU.xlsx";
const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SHEET_NAME = "Operative Notes";

// Search Drive for existing Excel file by name in the folder
async function driveFindExcelFile(folderId, accessToken) {
  const q = encodeURIComponent(`name='${EXCEL_FILENAME}' and '${folderId}' in parents and mimeType='${EXCEL_MIME}' and trashed=false`);
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`,
    { headers: { Authorization: "Bearer " + accessToken } }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

// Main function: upsert note row in the shared Excel file on Drive
async function driveUpsertExcel(note, folderId) {
  await loadXlsx();
  let token = getStoredToken();
  if (!token) token = await requestAccessToken();
  const at = token.accessToken;

  const headers = EXCEL_COLUMNS.map(c => c.header);
  const newRow = noteToRow(note);
  let wb;

  // Step 1: resolve file ID — localStorage first, then search Drive by name
  let existingFileId = getExcelFileId();
  if (!existingFileId) {
    existingFileId = await driveFindExcelFile(folderId, at);
    if (existingFileId) setExcelFileId(existingFileId);
  }

  // Step 2: try to download existing workbook
  const readWorkbook = (buf) => XLSX.read(new Uint8Array(buf), { type: "array" });
  if (existingFileId) {
    const buf = await driveDownloadFile(existingFileId, at);
    if (buf && buf.byteLength > 0) {
      try { wb = readWorkbook(buf); } catch(e) { console.warn("XLSX parse error:", e); wb = null; }
    }
    if (!wb) {
      // File gone or corrupt — search again before giving up
      existingFileId = await driveFindExcelFile(folderId, at);
      if (existingFileId) {
        setExcelFileId(existingFileId);
        const buf2 = await driveDownloadFile(existingFileId, at);
        if (buf2 && buf2.byteLength > 0) {
          try { wb = readWorkbook(buf2); } catch(e) { console.warn("XLSX parse error (retry):", e); }
        }
      }
      if (!wb) { existingFileId = null; setExcelFileId(null); }
    }
  }

  if (!wb) {
    // Create brand-new workbook
    wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    headers.forEach((_, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: ci })];
      if (cell) cell.s = { font: { bold: true } };
    });
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  }

  const ws = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];

  // Check if this note's row already exists (match by HN + date + name)
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const hnColIdx = headers.indexOf("HN");
  const dateColIdx = headers.indexOf("Date");
  const nameColIdx = headers.indexOf("Patient Name");
  let existingRowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      String(row[hnColIdx] || "") === String(note.hn || "") &&
      String(row[dateColIdx] || "") === String(note.date || "") &&
      String(row[nameColIdx] || "") === String(note.name || "")
    ) {
      existingRowIdx = i;
      break;
    }
  }

  if (existingRowIdx >= 0) {
    // Update existing row
    EXCEL_COLUMNS.forEach((col, ci) => {
      const cellAddr = XLSX.utils.encode_cell({ r: existingRowIdx, c: ci });
      ws[cellAddr] = { t: "s", v: newRow[ci] };
    });
    // Update sheet range if needed
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    range.e.c = Math.max(range.e.c, EXCEL_COLUMNS.length - 1);
    ws["!ref"] = XLSX.utils.encode_range(range);
  } else {
    // Append new row
    XLSX.utils.sheet_add_aoa(ws, [newRow], { origin: -1 });
  }

  // Set column widths
  ws["!cols"] = EXCEL_COLUMNS.map((c, i) => {
    const widths = { "Patient Name": 24, "Op Finding": 40, "Op Procedure": 40, "Pre-Op Dx": 28, "Post-Op Dx": 28, "Patient Condition": 40 };
    return { wch: widths[c.header] || Math.max(c.header.length + 2, 12) };
  });

  // Write to blob
  const wbArr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const xlsxBlob = new Blob([wbArr], { type: EXCEL_MIME });

  const result = await driveUploadBlob(xlsxBlob, EXCEL_MIME, EXCEL_FILENAME, folderId, existingFileId || null, at);

  // Save file ID for next time
  if (result.id) setExcelFileId(result.id);

  return result;
}

// Build a PDF blob from the note using html2pdf
async function buildPdfBlob(note) {
  // load html2pdf if not present
  if (!window.html2pdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed"; wrapper.style.left = "-10000px"; wrapper.style.top = "0";
  document.body.appendChild(wrapper);
  const root = ReactDOM.createRoot(wrapper);
  await new Promise(r => {
    root.render(<PdfSheet note={note} logoSrc={LOGO_SRC} />);
    setTimeout(r, 300);
  });
  const el = wrapper.querySelector(".pdf-sheet");
  const opt = {
    margin: 0,
    filename: "note.pdf",
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
  const blob = await window.html2pdf().set(opt).from(el).output("blob");
  root.unmount();
  document.body.removeChild(wrapper);
  return blob;
}

function useToast() {
  const [items, setItems] = React.useState([]);
  const push = (msg, variant = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems(x => [...x, { id, msg, variant }]);
    setTimeout(() => setItems(x => x.filter(i => i.id !== id)), 3500);
  };
  const host = (
    <div className="toast-host">
      {items.map(i => <div key={i.id} className={"toast " + i.variant}>{i.msg}</div>)}
    </div>
  );
  return { push, host };
}

function DriveSetupModal({ onClose, onSaved }) {
  const [val, setVal] = React.useState(getClientId());
  const [step, setStep] = React.useState(0);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>ตั้งค่า Google Drive API</h3>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>ทำครั้งเดียว · เก็บไว้ใน browser</div>
        </div>
        <div className="modal-body">
          <div style={{ background: "#fdfafa", border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>ขั้นตอนตั้งค่า (ทำใน Google Cloud Console)</div>
            <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
              <li>เปิด <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</a> แล้ว login ด้วย hnbcmu@gmail.com</li>
              <li>สร้าง Project ใหม่ (เช่น "HNB Operative Note")</li>
              <li>เมนู <b>APIs & Services → Library</b> → เปิด <b>Google Drive API</b></li>
              <li>เมนู <b>APIs & Services → OAuth consent screen</b> → เลือก External → ใส่ชื่อ app และ email → เพิ่ม scope <code>drive.file</code> → เพิ่ม test user <code>hnbcmu@gmail.com</code></li>
              <li>เมนู <b>Credentials → Create credentials → OAuth client ID</b> → ประเภท <b>Web application</b></li>
              <li>ใน <b>Authorized JavaScript origins</b> ใส่ URL ที่เปิดเว็บ (เช่น <code>{window.location.origin}</code>)</li>
              <li>คัดลอก <b>Client ID</b> มาวางด้านล่าง</li>
            </ol>
          </div>
          <div className="field">
            <label>Google OAuth Client ID</label>
            <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder="xxxxxxxxxxxx.apps.googleusercontent.com" />
            <div className="hint">รูปแบบ: ลงท้ายด้วย .apps.googleusercontent.com</div>
          </div>
          <div style={{ background: "#fff7ed", border: "1px solid #f5c78a", borderRadius: 8, padding: "12px 14px", marginTop: 10, fontSize: 12.5, lineHeight: 1.65 }}>
            <b style={{ color: "#a85a1c" }}>⚠ พบ "Access blocked: has not completed the Google verification"?</b>
            <br/>เนื่องจาก app อยู่ใน Testing mode (ยังไม่ผ่าน Google Verification) — ต้องเพิ่ม email ของผู้ใช้เป็น <b>Test user</b> ใน Google Cloud Console:<br/>
            <ol style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--ink-2)" }}>
              <li>ไปที่ <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener">GCP → OAuth consent screen</a></li>
              <li>เลื่อนลงหา <b>Test users</b> → กด <b>+ ADD USERS</b></li>
              <li>ใส่ email ที่ต้องการใช้งาน (เช่น <code>nansurg7@gmail.com</code>)</li>
              <li>กด Save แล้วลองใหม่</li>
            </ol>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10 }}>
            <b>หมายเหตุ:</b> เมื่ออัปโหลดครั้งแรก ระบบจะเปิด popup ให้ login ด้วย Google account และอนุญาตสิทธิ์ · Token จะเก็บใน browser นี้เท่านั้น · Scope ใช้ <code>drive.file</code> ซึ่งเข้าถึงได้เฉพาะไฟล์ที่ app นี้สร้าง (ปลอดภัย)
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>ปิด</button>
          <button className="btn btn-primary" onClick={() => { setClientId(val.trim()); clearStoredToken(); onSaved && onSaved(); onClose(); }}>บันทึก Client ID</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3></div>
        <div className="modal-body"><p style={{ margin: 0 }}>{message}</p></div>
        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>ยกเลิก</button>
          <button className={"btn " + (danger ? "btn-danger" : "btn-primary")} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Convert Excel row (array) back to note object
function rowToNote(row, headers) {
  const note = {};
  headers.forEach((h, i) => {
    const col = EXCEL_COLUMNS.find(c => c.header === h);
    if (!col) return;
    const v = row[i] !== undefined ? String(row[i]) : "";
    if (col.key === "complete") note[col.key] = v === "Yes";
    else note[col.key] = v === "" ? undefined : v;
  });
  // Ensure id exists (use HN+date as fallback)
  if (!note.id) note.id = `drive_${note.hn || "x"}_${note.date || "nodate"}_${Math.random().toString(36).slice(2,6)}`;
  return note;
}

// Load all notes from Drive Excel file
async function driveLoadNotes(folderId) {
  await loadXlsx();
  let token = getStoredToken();
  if (!token) token = await requestAccessToken();
  const at = token.accessToken;

  // Find file
  let fileId = getExcelFileId();
  if (!fileId) {
    fileId = await driveFindExcelFile(folderId, at);
    if (fileId) setExcelFileId(fileId);
  }
  if (!fileId) return [];

  const buf = await driveDownloadFile(fileId, at);
  if (!buf || buf.byteLength === 0) return [];

  let wb;
  try { wb = XLSX.read(new Uint8Array(buf), { type: "array" }); } catch(e) { console.error("driveLoadNotes XLSX parse:", e); return []; }
  const ws = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (data.length < 2) return [];

  const headers = data[0].map(String);
  return data.slice(1).filter(row => row.some(v => v !== undefined && v !== "")).map(row => rowToNote(row, headers));
}

function App() {
  const [authed, setAuthed] = React.useState(isLoggedIn());
  const [notes, setNotes] = React.useState(() => loadAllNotes());
  const [driveNotes, setDriveNotes] = React.useState([]); // notes loaded from Drive Excel
  const [driveLoading, setDriveLoading] = React.useState(false);
  const [uploadingAll, setUploadingAll] = React.useState(false); // bulk upload progress
  const [uploadAllProgress, setUploadAllProgress] = React.useState(null); // {done, total}
  const [view, setView] = React.useState("dashboard"); // dashboard | form
  const [editing, setEditing] = React.useState(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [driveSetup, setDriveSetup] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const toast = useToast();

  const refresh = () => setNotes(loadAllNotes());

  // Merge local + drive notes, drive notes take priority (dedup by HN+date+name)
  const allNotes = React.useMemo(() => {
    if (driveNotes.length === 0) return notes;
    const localOnly = notes.filter(ln =>
      !driveNotes.some(dn =>
        String(dn.hn||"") === String(ln.hn||"") &&
        String(dn.date||"") === String(ln.date||"") &&
        String(dn.name||"") === String(ln.name||"")
      )
    );
    return [...driveNotes, ...localOnly].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [notes, driveNotes]);

  const handleSyncDrive = async () => {
    setDriveLoading(true);
    try {
      const loaded = await driveLoadNotes(DRIVE_FOLDER_ID);
      setDriveNotes(loaded);
      toast.push(`โหลดจาก Drive สำเร็จ — ${loaded.length} รายการ ☁`, "ok");
    } catch (e) {
      const msg = String(e.message);
      if (msg.includes("access_denied") || msg.includes("popup") || msg.includes("AUTH_EXPIRED")) {
        clearStoredToken();
        toast.push("กรุณา login Google แล้วลองใหม่", "err");
      } else {
        toast.push("โหลดจาก Drive ไม่สำเร็จ: " + msg, "err");
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const openNew = () => { setEditing(emptyNote()); setView("form"); };
  const LOCK_MS = 24 * 60 * 60 * 1000;
  const isNoteLocked = (n) => n && n.createdAt && (Date.now() - new Date(n.createdAt).getTime()) > LOCK_MS;

  const openNote = (id) => {
    const n = allNotes.find(x => x.id === id);
    if (n && !isNoteLocked(n)) { setEditing(n); setView("form"); }
  };

  const handleSave = (note) => {
    const saved = upsertNote(note);
    refresh();
    toast.push("บันทึกข้อมูลเรียบร้อย ✓ — กด Upload to Drive เพื่อสำรองข้อมูล", "ok");
    // อยู่หน้า form ต่อ แต่ update note ให้มี createdAt/updatedAt (unlock Upload)
    setEditing({ ...note, createdAt: saved.createdAt || note.createdAt || new Date().toISOString(), updatedAt: saved.updatedAt });
  };

  const handleDuplicate = (id) => {
    const copy = duplicateNote(id);
    if (copy) { refresh(); toast.push("สร้างสำเนาเรียบร้อย"); setEditing(copy); setView("form"); }
  };

  const handleDelete = (id) => setDeleteConfirm(id);
  const confirmDelete = () => {
    deleteNote(deleteConfirm);
    setDeleteConfirm(null);
    refresh();
    toast.push("ลบบันทึกเรียบร้อย", "ok");
  };

  const handleExportPdf = (note) => {
    const locked = isNoteLocked(note);
    if (locked) {
      toast.push("บันทึกนี้ครบ 24 ชั่วโมงแล้ว ไม่สามารถ Export PDF ได้", "err");
      return;
    }
    if (!note.driveUploadedAt) {
      toast.push("ต้อง Upload to Drive สำเร็จก่อน จึงจะ Export PDF ได้", "err");
      return;
    }
    exportPdf(note, LOGO_SRC);
  };

  const handleUploadDrive = async (note) => {
    const cid = getClientId();
    if (!cid) {
      toast.push("กรุณาตั้งค่า Google Client ID ก่อน", "err");
      setDriveSetup(true);
      return;
    }
    try {
      toast.push("กำลังเตรียมข้อมูล Excel…");
      const result = await driveUpsertExcel(note, DRIVE_FOLDER_ID);
      if (!result || !result.id) throw new Error("Drive ไม่ return file ID — ลองใหม่อีกครั้ง");
      const driveFields = { driveUploadedAt: new Date().toISOString(), driveFileId: result.id, driveFileLink: result.webViewLink };
      const updated = { ...note, ...driveFields };
      upsertNote(updated);
      refresh();
      // Use functional update to avoid stale closure — always patch editing if same note
      setEditing(prev => prev && prev.id === note.id ? { ...prev, ...driveFields } : prev);
      toast.push("อัปโหลด Excel สำเร็จ! บันทึกลง OperativeNotes_CMU.xlsx บน Drive แล้ว ☁", "ok");
    } catch (e) {
      console.error("Upload error:", e);
      const msg = String(e.message || e);
      if (msg.includes("NO_CLIENT_ID")) {
        toast.push("กรุณาตั้งค่า Client ID", "err");
        setDriveSetup(true);
      } else if (msg.includes("AUTH_EXPIRED")) {
        clearStoredToken();
        toast.push("Session หมดอายุ · กรุณากด Upload อีกครั้ง (จะ login ใหม่อัตโนมัติ)", "err");
      } else if (msg.includes("access_denied") || msg.includes("not completed the Google verification")) {
        setDriveSetup(true);
        toast.push("Access denied — กรุณาเพิ่ม email ของคุณเป็น Test user ใน Google Cloud Console", "err");
      } else if (msg.includes("Upload failed")) {
        // Show the raw Drive error so we can debug
        toast.push("Drive error: " + msg.replace("Upload failed: ", "").slice(0, 120), "err");
      } else {
        toast.push("อัปโหลดไม่สำเร็จ: " + msg.slice(0, 100), "err");
      }
    }
  };

  // Bulk upload: push all local notes that haven't been uploaded to Drive yet
  const handleUploadAllDrive = async () => {
    const cid = getClientId();
    if (!cid) { toast.push("กรุณาตั้งค่า Google Client ID ก่อน", "err"); setDriveSetup(true); return; }

    // Only upload local notes that have no driveUploadedAt
    const pending = notes.filter(n => !n.driveUploadedAt);
    if (pending.length === 0) {
      toast.push("ทุกบันทึกในเครื่องนี้อัปโหลด Drive แล้ว ✓", "ok");
      return;
    }

    setUploadingAll(true);
    setUploadAllProgress({ done: 0, total: pending.length });
    let success = 0;
    let fail = 0;

    for (let i = 0; i < pending.length; i++) {
      const note = pending[i];
      try {
        const result = await driveUpsertExcel(note, DRIVE_FOLDER_ID);
        if (!result || !result.id) throw new Error("ไม่ได้รับ file ID จาก Drive");
        const driveFields = { driveUploadedAt: new Date().toISOString(), driveFileId: result.id, driveFileLink: result.webViewLink };
        upsertNote({ ...note, ...driveFields });
        success++;
      } catch (e) {
        console.warn("Upload all — failed for note:", note.id, e);
        fail++;
      }
      setUploadAllProgress({ done: i + 1, total: pending.length });
    }

    refresh();
    setUploadingAll(false);
    setUploadAllProgress(null);

    if (fail === 0) {
      toast.push(`อัปโหลดสำเร็จทั้งหมด ${success} รายการ ☁`, "ok");
    } else {
      toast.push(`อัปโหลดสำเร็จ ${success} รายการ · ล้มเหลว ${fail} รายการ`, fail > 0 ? "err" : "ok");
    }
  };

  const logout = () => {
    setLoggedIn(false);
    clearStoredToken();
    setAuthed(false);
  };

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  const closeSidebar = () => setSidebarOpen(false);
  const navTo = (v) => { setView(v); if (v === "form") setEditing(emptyNote()); closeSidebar(); };

  return (
    <div className="app">
      {/* Overlay for mobile sidebar */}
      <div className={"sidebar-overlay" + (sidebarOpen ? " open" : "")} onClick={closeSidebar} />

      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <div className="sb-head">
          <img src={LOGO_SRC} alt="logo" />
          <div>
            <div className="t1">Breast & Endocrine<br/>Surgery · CMU</div>
            <div className="t2">Operative Note</div>
          </div>
        </div>
        <nav className="sb-nav">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => { setView("dashboard"); setEditing(null); closeSidebar(); }}>
            <span className="dot"></span> Dashboard
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>{allNotes.length}</span>
          </button>
          <button className={view === "form" ? "active" : ""} onClick={() => { openNew(); closeSidebar(); }}>
            <span className="dot"></span> New note
          </button>
          <div style={{ borderTop: "1px solid var(--line)", margin: "12px 0 8px" }} />
          <button onClick={() => { handleSyncDrive(); closeSidebar(); }} disabled={driveLoading}>
            <span className="dot"></span> {driveLoading ? "กำลังโหลด…" : "☁ Sync จาก Drive"}
          </button>
          <button onClick={logout}>
            <span className="dot"></span> Logout
          </button>
        </nav>
        <div className="sb-foot">
          Department of Surgery · MEDCMU
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(v => !v)} aria-label="เปิดเมนู">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="4.5" x2="16" y2="4.5"/>
              <line x1="2" y1="9" x2="16" y2="9"/>
              <line x1="2" y1="13.5" x2="16" y2="13.5"/>
            </svg>
          </button>
          <span className="crumb">
            {view === "dashboard" && "HOME / DASHBOARD"}
            {view === "form" && (editing && editing.createdAt ? "HOME / NOTES / EDIT" : "HOME / NOTES / NEW")}
          </span>
          <div className="spacer" />
          <div className="tb-actions">
            <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
              {AUTH_USER} · {new Date().toLocaleDateString("en-GB")}
            </span>
          </div>
        </header>

        <div className="content">
          {view === "dashboard" && (
            <Dashboard
              notes={allNotes}
              localNotes={notes}
              onNew={openNew}
              onOpen={openNote}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onExportPdf={handleExportPdf}
              onUploadDrive={handleUploadDrive}
              onSyncDrive={handleSyncDrive}
              onUploadAllDrive={handleUploadAllDrive}
              driveLoading={driveLoading}
              uploadingAll={uploadingAll}
              uploadAllProgress={uploadAllProgress}
              hasDriveNotes={driveNotes.length > 0}
            />
          )}
          {view === "form" && editing && (
            <OperativeForm
              note={editing}
              onChange={setEditing}
              onSave={handleSave}
              onCancel={() => { setView("dashboard"); setEditing(null); }}
              onExportPdf={handleExportPdf}
              onUploadDrive={handleUploadDrive}
              logoSrc={LOGO_SRC}
              toast={toast}
            />
          )}
        </div>
      </main>

      {driveSetup && <DriveSetupModal onClose={() => setDriveSetup(false)} />}
      {deleteConfirm && (
        <ConfirmModal
          title="ยืนยันการลบ"
          message="ต้องการลบบันทึกนี้จากเครื่องใช่หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้"
          confirmLabel="ลบ"
          danger
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast.host}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
