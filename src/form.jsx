// Main operative note form

const { WARDS, ROOMS, SIDES, GENDERS, ANESTHESIA_TYPES, POSITIONS, INCISIONS,
  OP_TYPES, BIRADS, THYROID_RISK, DRAINS_OPTS, COMPLICATION_OPTS, PATIENT_CONDITIONS,
  SURGEONS, DRIVE_FOLDER_URL } = window.OP_CONST;

function calcOpTime(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "";
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return String(mins);
}

function OperativeForm({ note, onChange, onSave, onCancel, onExportPdf, onUploadDrive, logoSrc, toast }) {
  const [n, setN] = React.useState(note);
  // isSaved = true หลังจากกด "บันทึก" ครั้งแรก (หรือ note ที่โหลดจาก storage ซึ่งมี createdAt แล้ว)
  const [isSaved, setIsSaved] = React.useState(!!(note.createdAt));
  // hasUnsaved = มีการแก้ไขหลังจาก save ล่าสุด
  const [hasUnsaved, setHasUnsaved] = React.useState(false);

  React.useEffect(() => {
    setN(note);
    setIsSaved(!!(note.createdAt));
    setHasUnsaved(false);
  }, [note.id]);

  const update = (patch) => {
    const next = { ...n, ...patch };
    if (("opstart" in patch) || ("opend" in patch)) {
      next.totaloptime = calcOpTime(next.opstart, next.opend);
    }
    setN(next);
    setHasUnsaved(true);
    onChange && onChange(next);
  };

  const save = () => {
    onSave(n);
    setIsSaved(true);
    setHasUnsaved(false);
  };

  // Lock states
  const canUpload = isSaved && !hasUnsaved;
  const canExport = !!(n.driveUploadedAt);

  // Step indicator
  const step = !isSaved ? 1 : (hasUnsaved ? 1 : (!n.driveUploadedAt ? 2 : 3));
  const stepLabels = ["1 กรอกข้อมูล & บันทึก", "2 Upload to Drive", "3 Export PDF"];

  return (
    <>
      {/* Step progress bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          return (
            <div key={i} style={{
              flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
              background: done ? "var(--ok)" : active ? "var(--rose)" : "#fdfafa",
              color: (done || active) ? "#fff" : "var(--ink-3)",
              borderRight: i < 2 ? "1px solid var(--line)" : "none",
              transition: "all 0.2s",
              fontSize: 12.5, fontWeight: active ? 600 : 400,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: (done || active) ? "rgba(255,255,255,0.25)" : "var(--line)",
                color: (done || active) ? "#fff" : "var(--ink-3)",
                fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>{done ? "✓" : stepNum}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label.slice(2)}</span>
            </div>
          );
        })}
      </div>

      <div className="form-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="fh-tag">Operative Note · Breast & Endocrine Surgery</div>
          <h2 className="fh-title">{n.name || "บันทึกการผ่าตัดใหม่"}</h2>
          <div className="fh-sub">
            {n.hn ? `HN ${n.hn}` : "ยังไม่ระบุ HN"} · {n.operation || "ยังไม่ระบุการผ่าตัด"}
            {n.date ? ` · ${n.date}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
          <button className="btn" onClick={onCancel}>← กลับ</button>

          {/* Step 1: บันทึก */}
          <button
            className={"btn btn-primary" + (hasUnsaved || !isSaved ? "" : " btn-ghost")}
            onClick={save}
            title={hasUnsaved ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : "บันทึกข้อมูล"}
          >
            {hasUnsaved && <span>●</span>} บันทึก {isSaved && !hasUnsaved && "✓"}
          </button>

          {/* Step 2: Upload to Drive */}
          <button
            className={"btn" + (canUpload ? " btn-primary" : " btn-locked")}
            style={canUpload ? { background: "var(--rose)", color: "#fff", borderColor: "var(--rose)" } : {}}
            title={!isSaved ? "กรุณา บันทึก ก่อน" : hasUnsaved ? "มีการแก้ไข กรุณา บันทึก ก่อน" : "Upload to Drive"}
            onClick={() => { if (canUpload) onUploadDrive(n); }}
          >
            <span>☁</span> Upload to Drive {n.driveUploadedAt && "✓"}
          </button>

          {/* Step 3: Export PDF */}
          <button
            className={"btn" + (canExport ? "" : " btn-locked")}
            title={!canExport ? "กรุณา Upload to Drive ก่อน" : "Export PDF"}
            onClick={() => { if (canExport) onExportPdf(n); }}
          >
            <span>{canExport ? "📄" : "🔒"}</span> Export PDF
          </button>
        </div>
      </div>

      <div className="form-grid">
        {/* Patient info */}
        <div className="group full">
          <div className="group-head">
            <span className="gh-title">ข้อมูลผู้ป่วย</span>
            <span className="gh-num">01 · Patient</span>
          </div>
          <div className="group-body">
            <Field label="ชื่อ-นามสกุล">
              <TextInput value={n.name} onChange={v => update({ name: v })} placeholder="ชื่อผู้ป่วย" />
            </Field>
            <div className="row row-4">
              <Field label="อายุ (ปี)">
                <TextInput type="number" value={n.age} onChange={v => update({ age: v })} />
              </Field>
              <Field label="เพศ">
                <Select value={n.gender} onChange={v => update({ gender: v })} options={GENDERS} />
              </Field>
              <Field label="หอผู้ป่วย">
                <ComboBox value={n.ward} onChange={v => update({ ward: v })} options={WARDS} />
              </Field>
              <Field label="HN">
                <TextInput value={n.hn} onChange={v => update({ hn: v })} />
              </Field>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="group">
          <div className="group-head">
            <span className="gh-title">ทีมผ่าตัด</span>
            <span className="gh-num">02 · Team</span>
          </div>
          <div className="group-body">
            <Field label="Surgeon">
              <ComboBox value={n.surgeon} onChange={v => update({ surgeon: v })} options={SURGEONS} placeholder="เลือกหรือพิมพ์ชื่อ surgeon" />
            </Field>
            <Field label="First assistant">
              <TextInput value={n.firstassistant} onChange={v => update({ firstassistant: v })} />
            </Field>
            <Field label="Second assistant">
              <TextInput value={n.secondassistant} onChange={v => update({ secondassistant: v })} />
            </Field>
            <Field label="Third assistant">
              <TextInput value={n.thirdassistant} onChange={v => update({ thirdassistant: v })} />
            </Field>
            <div className="row row-2">
              <Field label="Anesthesia">
                <ComboBox value={n.anesthesia} onChange={v => update({ anesthesia: v })} options={ANESTHESIA_TYPES} />
              </Field>
              <Field label="Scrub nurse">
                <TextInput value={n.scrub} onChange={v => update({ scrub: v })} />
              </Field>
            </div>
          </div>
        </div>

        {/* Timing */}
        <div className="group">
          <div className="group-head">
            <span className="gh-title">เวลา & ห้อง</span>
            <span className="gh-num">03 · Timing</span>
          </div>
          <div className="group-body">
            <Field label="วันที่ผ่าตัด">
              <TextInput type="date" value={n.date} onChange={v => update({ date: v })} />
            </Field>
            <div className="row row-2">
              <Field label="Operation started">
                <TextInput type="time" value={n.opstart} onChange={v => update({ opstart: v })} />
              </Field>
              <Field label="Operation ended">
                <TextInput type="time" value={n.opend} onChange={v => update({ opend: v })} />
              </Field>
            </div>
            <div className="row row-2">
              <Field label="Total op time (min)" hint="คำนวณอัตโนมัติจากเวลา start/end">
                <TextInput value={n.totaloptime} onChange={v => update({ totaloptime: v })} />
              </Field>
              <Field label="Operating room">
                <ComboBox value={n.room} onChange={v => update({ room: v })} options={ROOMS} />
              </Field>
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="group full">
          <div className="group-head">
            <span className="gh-title">Preoperative diagnosis & Imaging</span>
            <span className="gh-num">04 · Dx</span>
          </div>
          <div className="group-body">
            <Field label="Side">
              <Chips value={n.side} onChange={v => update({ side: v })} options={SIDES} />
            </Field>
            <Field label="Preoperative diagnosis">
              <TextArea value={n.preopdx} onChange={v => update({ preopdx: v })} placeholder="เช่น Non-palpable breast mass, DCIS, Thyroid nodule..." />
            </Field>
            <div className="row row-3">
              <Field label="MMG BI-RADs" hint="กรณีเกี่ยวกับเต้านม">
                <ComboBox value={n.mmg_birads} onChange={v => update({ mmg_birads: v })} options={BIRADS} />
              </Field>
              <Field label="US thyroid risk" hint="กรณีเกี่ยวกับ thyroid">
                <ComboBox value={n.us_thyroid_risk} onChange={v => update({ us_thyroid_risk: v })} options={THYROID_RISK} />
              </Field>
              <Field label="CA Breast neoadj / RT status" hint="ถ้าได้ neoadjuvant ก่อนผ่าตัด / คิว RT">
                <TextInput value={n.neoadj_rt} onChange={v => update({ neoadj_rt: v })} placeholder="e.g. มีคิว RT / ยังไม่ได้" />
              </Field>
            </div>
          </div>
        </div>

        {/* Operation */}
        <div className="group full">
          <div className="group-head">
            <span className="gh-title">Operation & Approach</span>
            <span className="gh-num">05 · Op</span>
          </div>
          <div className="group-body">
            <div className="row row-2">
              <Field label="Operation">
                <ComboBox value={n.operation} onChange={v => update({ operation: v })} options={OP_TYPES} />
              </Field>
              <Field label="Postoperative diagnosis">
                <TextInput value={n.postopdx} onChange={v => update({ postopdx: v })} placeholder="e.g. Lt breast lesion" />
              </Field>
            </div>
            <div className="row row-2">
              <Field label="Position">
                <ComboBox value={n.position} onChange={v => update({ position: v })} options={POSITIONS} />
              </Field>
              <Field label="Incision">
                <ComboBox value={n.incision} onChange={v => update({ incision: v })} options={INCISIONS} />
              </Field>
            </div>
            <Field label="Operative finding">
              <TextArea large value={n.opfinding} onChange={v => update({ opfinding: v })} placeholder="รายละเอียดที่พบระหว่างผ่าตัด..." />
            </Field>
            <Field label="Operative procedure">
              <TextArea large value={n.opprocedure} onChange={v => update({ opprocedure: v })} placeholder="ขั้นตอนการผ่าตัดโดยละเอียด..." rows={10} />
            </Field>
          </div>
        </div>

        {/* Specimen */}
        <div className="group full">
          <div className="group-head">
            <span className="gh-title">Specimen & Imaging</span>
            <span className="gh-num">06 · Specimen</span>
          </div>
          <div className="group-body">
            <Field label="Specimen characteristics">
              <TextArea value={n.specimen} onChange={v => update({ specimen: v })} placeholder="เช่น Lt breast tissue, Lateral margin" />
            </Field>
            <Field label="Specimen / specimen radiogram image">
              <div className="spec-uploads">
                <ImageUpload value={n.specimen_image_1} onChange={v => update({ specimen_image_1: v })} label="รูปที่ 1" />
                <ImageUpload value={n.specimen_image_2} onChange={v => update({ specimen_image_2: v })} label="รูปที่ 2 (radiogram)" />
              </div>
            </Field>
          </div>
        </div>

        {/* Post-op */}
        <div className="group full">
          <div className="group-head">
            <span className="gh-title">Intraoperative & Post-op</span>
            <span className="gh-num">07 · Closing</span>
          </div>
          <div className="group-body">
            <div className="row row-3">
              <Field label="Estimated blood loss (ml)">
                <TextInput type="number" value={n.ebl} onChange={v => update({ ebl: v })} />
              </Field>
              <Field label="IV fluids (ml)">
                <TextInput type="number" value={n.fluid} onChange={v => update({ fluid: v })} />
              </Field>
              <Field label="Blood products (ml)">
                <TextInput type="number" value={n.bloodtx} onChange={v => update({ bloodtx: v })} />
              </Field>
            </div>
            <div className="row row-2">
              <Field label="Drains / tubes placed">
                <ComboBox value={n.drain} onChange={v => update({ drain: v })} options={DRAINS_OPTS} />
              </Field>
              <Field label="Intraoperative complications">
                <ComboBox value={n.complication} onChange={v => update({ complication: v })} options={COMPLICATION_OPTS} />
              </Field>
            </div>
            <Field label="Patient's condition and disposition">
              <ComboBox value={n.patientcondition} onChange={v => update({ patientcondition: v })} options={PATIENT_CONDITIONS} />
            </Field>
            <div className="row row-2">
              <Field label="Signature (ผู้บันทึก)">
                <TextInput value={n.signature} onChange={v => update({ signature: v })} placeholder="e.g. R3 ปัณณวัฒน์" />
              </Field>
              <Field label="Status">
                <label className="check" style={{ marginTop: 28 }}>
                  <input type="checkbox" checked={!!n.complete} onChange={e => update({ complete: e.target.checked })} />
                  บันทึกครบถ้วน (Complete)
                </label>
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingBottom: 60 }}>
        <button className="btn" onClick={onCancel}>ยกเลิก</button>
        <button className="btn" onClick={() => onExportPdf(n)}>Export PDF</button>
        <button className="btn" onClick={() => onUploadDrive(n)}>Upload to Drive</button>
        <button className="btn btn-primary" onClick={save}>บันทึกข้อมูล</button>
      </div>
    </>
  );
}

window.OperativeForm = OperativeForm;
