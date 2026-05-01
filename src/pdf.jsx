// PDF export: renders a print-ready sheet matching the DOCX template,
// then uses the browser print dialog (or html2pdf) to export.

function PdfSheet({ note, logoSrc }) {
  const v = (x) => (x == null || x === "") ? "\u00A0" : x;
  return (
    <div className="pdf-sheet" style={{ position: "relative" }}>
      {logoSrc && <img className="pdf-logo" src={logoSrc} alt="logo" />}
      <div className="pdf-header">
        <div className="green">Faculty of Medicine<br/>Chiang Mai University</div>
        <div className="black">Department of Surgery</div>
      </div>
      <hr className="pdf-hr" />

      <div className="pdf-inline-grid">
        <span className="pdf-lbl">ชื่อ</span><span className="pdf-val">{v(note.name)}</span>
        <span className="pdf-lbl">อายุ</span><span className="pdf-val">{v(note.age)} ปี</span>
        <span className="pdf-lbl">เพศ</span><span className="pdf-val">{v(note.gender)}</span>
        <span className="pdf-lbl">หอผู้ป่วย</span><span className="pdf-val">{v(note.ward)}</span>
      </div>
      <div className="pdf-row">
        <span className="pdf-lbl">HN</span><span className="pdf-val">{v(note.hn)}</span>
      </div>

      <div className="pdf-row">
        <span className="pdf-lbl">Surgeon:</span><span className="pdf-val">{v(note.surgeon)}</span>
        <span className="pdf-lbl">First assistant:</span><span className="pdf-val">{v(note.firstassistant)}</span>
      </div>
      <div className="pdf-row">
        <span className="pdf-lbl">Second assistant:</span><span className="pdf-val">{v(note.secondassistant)}</span>
        <span className="pdf-lbl">Third assistant:</span><span className="pdf-val">{v(note.thirdassistant)}</span>
      </div>
      <div className="pdf-row">
        <span className="pdf-lbl">Anesthesia:</span><span className="pdf-val">{v(note.anesthesia)}</span>
        <span className="pdf-lbl">Scrub nurse:</span><span className="pdf-val">{v(note.scrub)}</span>
      </div>
      <div className="pdf-row">
        <span className="pdf-lbl">Date:</span><span className="pdf-val">{v(note.date)}</span>
        <span className="pdf-lbl">Operation started:</span><span className="pdf-val">{v(note.opstart)}</span>
        <span className="pdf-lbl">Operation ended:</span><span className="pdf-val">{v(note.opend)}</span>
      </div>
      <div className="pdf-row">
        <span className="pdf-lbl">Total operative time (min):</span><span className="pdf-val">{v(note.totaloptime)}</span>
        <span className="pdf-lbl">Operating room:</span><span className="pdf-val">{v(note.room)}</span>
        <span className="pdf-lbl">Type:</span><span className="pdf-val">Elective</span>
      </div>

      <div className="pdf-section-title">Preoperative diagnosis</div>
      <div className="pdf-block">{v([note.side, note.preopdx].filter(Boolean).join(" "))}</div>

      {(note.mmg_birads || note.neoadj_rt || note.us_thyroid_risk) && (
        <div className="pdf-row" style={{ marginTop: 4, fontSize: "10pt" }}>
          {note.mmg_birads && <><span className="pdf-lbl">MMG BIRADs:</span><span className="pdf-val">{note.mmg_birads}</span></>}
          {note.us_thyroid_risk && <><span className="pdf-lbl">US thyroid risk:</span><span className="pdf-val">{note.us_thyroid_risk}</span></>}
          {note.neoadj_rt && <><span className="pdf-lbl">Neoadj/RT:</span><span className="pdf-val">{note.neoadj_rt}</span></>}
        </div>
      )}

      <div className="pdf-section-title">Operation</div>
      <div className="pdf-block">{v(note.operation)}</div>

      <div className="pdf-section-title">Postoperative diagnosis</div>
      <div className="pdf-block">{v(note.postopdx)}</div>

      <div className="pdf-row">
        <span className="pdf-lbl">Position:</span><span className="pdf-val">{v(note.position)}</span>
        <span className="pdf-lbl">Incision:</span><span className="pdf-val">{v(note.incision)}</span>
      </div>

      <div className="pdf-section-title">Operative finding</div>
      <div className="pdf-block">{v(note.opfinding)}</div>

      <div className="pdf-section-title">Operative procedure</div>
      <div className="pdf-block">{v(note.opprocedure)}</div>

      <div className="pdf-row" style={{ marginTop: 10 }}>
        <span className="pdf-lbl">Estimated blood loss:</span><span className="pdf-val">{v(note.ebl)} ml</span>
        <span className="pdf-lbl">IV fluids:</span><span className="pdf-val">{v(note.fluid)} ml</span>
        <span className="pdf-lbl">Blood products:</span><span className="pdf-val">{v(note.bloodtx)} ml</span>
      </div>
      <div className="pdf-row">
        <span className="pdf-lbl">Drains and tubes placed:</span><span className="pdf-val">{v(note.drain)}</span>
      </div>
      <div className="pdf-row">
        <span className="pdf-lbl">Intraoperative complications:</span><span className="pdf-val">{v(note.complication)}</span>
      </div>
      <div className="pdf-section-title">Patient's condition and disposition</div>
      <div className="pdf-block">{v(note.patientcondition)}</div>

      <div className="pdf-sig-row">
        <div className="pdf-sig">
          <div className="line">Signature: {v(note.signature)}</div>
        </div>
      </div>
    </div>
  );
}

// Open a new window containing the PDF sheet and trigger print
function exportPdf(note, logoSrc) {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Pop-up blocked — กรุณาอนุญาต pop-up เพื่อ export PDF");
    return;
  }

  const styles = document.querySelector('style')?.innerHTML || "";
  const fontsLink = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">`;

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Operative Note - ${(note.name||"").replace(/</g,"")}</title>${fontsLink}<style>${styles} body{background:#fff;padding:0;margin:0;} @media print { .pdf-sheet{box-shadow:none;}}</style></head><body><div id="p"></div></body></html>`);
  win.document.close();

  // Render using the same React + sheet into the new window
  const container = win.document.getElementById("p");

  // Build serializable HTML from the sheet by rendering in current doc first
  const tmp = document.createElement("div");
  document.body.appendChild(tmp);
  const root = ReactDOM.createRoot(tmp);
  root.render(<PdfSheet note={note} logoSrc={logoSrc} />);
  setTimeout(() => {
    container.innerHTML = tmp.innerHTML;
    root.unmount();
    document.body.removeChild(tmp);
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  }, 200);
}

Object.assign(window, { PdfSheet, exportPdf });
