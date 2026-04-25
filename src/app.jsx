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

async function driveUploadPdf(pdfBlob, fileName, folderId) {
  let token = getStoredToken();
  if (!token) token = await requestAccessToken();

  const metadata = {
    name: fileName,
    mimeType: "application/pdf",
    parents: folderId ? [folderId] : undefined,
  };

  const boundary = "boundary_" + Math.random().toString(36).slice(2);
  const encoder = new TextEncoder();

  const pdfBuf = await pdfBlob.arrayBuffer();
  const pre = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
  );
  const post = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(pre.byteLength + pdfBuf.byteLength + post.byteLength);
  body.set(pre, 0);
  body.set(new Uint8Array(pdfBuf), pre.byteLength);
  body.set(post, pre.byteLength + pdfBuf.byteLength);

  const resp = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token.accessToken,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!resp.ok) {
    const err = await resp.text();
    if (resp.status === 401) { clearStoredToken(); throw new Error("AUTH_EXPIRED: " + err); }
    throw new Error("Upload failed: " + err);
  }
  return await resp.json();
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
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10 }}>
            <b>หมายเหตุสำคัญ:</b> เมื่ออัปโหลดครั้งแรก ระบบจะเปิด popup ให้ login ด้วย Google account (hnbcmu@gmail.com) และอนุญาตสิทธิ์ · Token จะเก็บใน browser นี้เท่านั้น · Scope ใช้ <code>drive.file</code> ซึ่งเข้าถึงได้เฉพาะไฟล์ที่ app นี้สร้าง (ปลอดภัย)
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

function App() {
  const [authed, setAuthed] = React.useState(isLoggedIn());
  const [notes, setNotes] = React.useState(() => loadAllNotes());
  const [view, setView] = React.useState("dashboard"); // dashboard | form
  const [editing, setEditing] = React.useState(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [driveSetup, setDriveSetup] = React.useState(false);
  const toast = useToast();

  const refresh = () => setNotes(loadAllNotes());

  const openNew = () => { setEditing(emptyNote()); setView("form"); };
  const LOCK_MS = 24 * 60 * 60 * 1000;
  const isNoteLocked = (n) => n && n.createdAt && (Date.now() - new Date(n.createdAt).getTime()) > LOCK_MS;

  const openNote = (id) => {
    const n = notes.find(x => x.id === id);
    if (n && !isNoteLocked(n)) { setEditing(n); setView("form"); }
  };

  const handleSave = (note) => {
    upsertNote(note);
    refresh();
    toast.push("บันทึกข้อมูลเรียบร้อย", "ok");
    setView("dashboard");
    setEditing(null);
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

  const handleExportPdf = (note) => exportPdf(note, LOGO_SRC);

  const handleUploadDrive = async (note) => {
    const cid = getClientId();
    if (!cid) {
      toast.push("กรุณาตั้งค่า Google Client ID ก่อน", "err");
      setDriveSetup(true);
      return;
    }
    try {
      toast.push("กำลังสร้าง PDF…");
      const blob = await buildPdfBlob(note);
      const safeName = (note.name || "note").replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_-]/g, "_");
      const fname = `${note.date || "nodate"}_HN${note.hn || "x"}_${safeName}.pdf`;
      toast.push("กำลังอัปโหลดไปยัง Drive…");
      const result = await driveUploadPdf(blob, fname, DRIVE_FOLDER_ID);
      const updated = { ...note, driveUploadedAt: new Date().toISOString(), driveFileId: result.id, driveFileLink: result.webViewLink };
      upsertNote(updated);
      refresh();
      if (editing && editing.id === note.id) setEditing(updated);
      toast.push("อัปโหลดสำเร็จ! ไฟล์อยู่บน Drive แล้ว", "ok");
    } catch (e) {
      console.error(e);
      if (String(e.message).includes("NO_CLIENT_ID")) {
        toast.push("กรุณาตั้งค่า Client ID", "err");
        setDriveSetup(true);
      } else if (String(e.message).includes("AUTH_EXPIRED")) {
        clearStoredToken();
        toast.push("Session หมดอายุ · กรุณาลองใหม่", "err");
      } else {
        toast.push("อัปโหลดไม่สำเร็จ: " + e.message, "err");
      }
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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-head">
          <img src={LOGO_SRC} alt="logo" />
          <div>
            <div className="t1">Breast & Endocrine<br/>Surgery · CMU</div>
            <div className="t2">Operative Note</div>
          </div>
        </div>
        <nav className="sb-nav">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => { setView("dashboard"); setEditing(null); }}>
            <span className="dot"></span> Dashboard
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>{notes.length}</span>
          </button>
          <button className={view === "form" ? "active" : ""} onClick={openNew}>
            <span className="dot"></span> New note
          </button>
          <div style={{ borderTop: "1px solid var(--line)", margin: "12px 0 8px" }} />
          <button onClick={() => setDriveSetup(true)}>
            <span className="dot"></span> Drive API settings
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
              notes={notes}
              onNew={openNew}
              onOpen={openNote}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onExportPdf={handleExportPdf}
              onUploadDrive={handleUploadDrive}
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
