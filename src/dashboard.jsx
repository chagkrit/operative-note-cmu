// Dashboard view — combined with full list (All notes section removed)

function Dashboard({ notes, onNew, onOpen, onDuplicate, onDelete, onExportPdf, onUploadDrive }) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [lockedMsg, setLockedMsg] = React.useState(null);

  // Lock helpers: note becomes read-only 24h after createdAt
  const LOCK_MS = 24 * 60 * 60 * 1000;
  const isLocked = (n) => {
    if (!n.createdAt) return false;
    return (Date.now() - new Date(n.createdAt).getTime()) > LOCK_MS;
  };
  const hoursLeft = (n) => {
    if (!n.createdAt) return null;
    const left = LOCK_MS - (Date.now() - new Date(n.createdAt).getTime());
    return left > 0 ? Math.max(1, Math.round(left / (60 * 60 * 1000))) : 0;
  };
  const tryOpen = (n) => {
    if (isLocked(n)) {
      setLockedMsg(`บันทึกนี้ถูกล็อกแล้ว (ครบ 24 ชั่วโมงหลังบันทึก) · ไม่สามารถเปิดดูหรือแก้ไขได้`);
      return;
    }
    onOpen(n.id);
  };

  const stats = React.useMemo(() => {
    const total = notes.length;
    const complete = notes.filter(n => n.complete).length;
    const thisMonth = notes.filter(n => {
      if (!n.date) return false;
      const d = new Date(n.date);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const onDrive = notes.filter(n => n.driveUploadedAt).length;
    return { total, complete, thisMonth, onDrive };
  }, [notes]);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return notes.filter(n => {
      if (filter === "complete" && !n.complete) return false;
      if (filter === "incomplete" && n.complete) return false;
      if (filter === "drive" && !n.driveUploadedAt) return false;
      if (!qq) return true;
      return [n.name, n.hn, n.surgeon, n.operation, n.preopdx, n.postopdx]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(qq));
    });
  }, [notes, q, filter]);

  const opCounts = React.useMemo(() => {
    const c = {};
    notes.forEach(n => { if (n.operation) c[n.operation] = (c[n.operation] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [notes]);

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Dashboard</h2>
          <p>Breast & Endocrine Surgery CMU · บันทึกการผ่าตัดทั้งหมด</p>
        </div>
        <div className="sec-head-right">
          <button className="btn btn-primary" onClick={onNew}>+ New operative note</button>
        </div>
      </div>

      <div className="dash-stats">
        <div className="stat">
          <div className="s-label">Total notes</div>
          <div className="s-num">{stats.total}</div>
          <div className="s-sub">รายการทั้งหมดในระบบ</div>
        </div>
        <div className="stat">
          <div className="s-label">Complete</div>
          <div className="s-num">{stats.complete}</div>
          <div className="s-sub">บันทึกครบถ้วนแล้ว</div>
        </div>
        <div className="stat">
          <div className="s-label">This month</div>
          <div className="s-num">{stats.thisMonth}</div>
          <div className="s-sub">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="stat">
          <div className="s-label">On Drive</div>
          <div className="s-num">{stats.onDrive}</div>
          <div className="s-sub">อัปโหลด backup แล้ว</div>
        </div>
      </div>

      {opCounts.length > 0 && (
        <div className="group" style={{ marginBottom: 24 }}>
          <div className="group-head">
            <span className="gh-title">Top procedures</span>
            <span className="gh-num">Summary</span>
          </div>
          <div className="group-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              {opCounts.map(([op, count]) => {
                const max = opCounts[0][1];
                const pct = (count / max) * 100;
                return (
                  <div key={op}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: "var(--ink-2)" }}>{op}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-3)" }}>{count}</span>
                    </div>
                    <div style={{ background: "#f3ecee", height: 6, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ background: "var(--rose)", height: "100%", width: `${pct}%`, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="sec-head" style={{ marginTop: 10 }}>
        <div>
          <h2 style={{ fontSize: 24 }}>บันทึกการผ่าตัด</h2>
          <p>{notes.length} รายการ · คลิกเพื่อเปิด / แก้ไข</p>
        </div>
      </div>

      <div className="list-toolbar">
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาด้วย HN, ชื่อ, surgeon, operation…" />
        </div>
        <div className="chips">
          {[["all", "ทั้งหมด"], ["complete", "Complete"], ["incomplete", "Draft"], ["drive", "บน Drive"]].map(([k, lbl]) => (
            <button key={k} className={"chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>{lbl}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{notes.length === 0 ? "ยังไม่มีบันทึก" : "ไม่พบรายการ"}</h3>
          <p>{notes.length === 0 ? "เริ่มต้นด้วยการสร้างบันทึกการผ่าตัดใหม่" : "ลองเปลี่ยนคำค้นหา"}</p>
          {notes.length === 0 && <button className="btn btn-primary" onClick={onNew} style={{ marginTop: 12 }}>+ New operative note</button>}
        </div>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th style={{ width: 110 }} className="col-hide-mobile">วันที่</th>
                <th>ผู้ป่วย / HN</th>
                <th className="col-hide-mobile">Operation</th>
                <th className="col-hide-mobile">Surgeon</th>
                <th style={{ width: 80 }} className="col-hide-mobile">Side</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 160, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => {
                const locked = isLocked(n);
                const hrs = hoursLeft(n);
                return (
                <tr key={n.id} style={locked ? { opacity: 0.75 } : undefined}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)" }} className="col-hide-mobile">{n.date || "—"}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{n.name || <span style={{ color: "var(--ink-4)" }}>(ไม่ระบุชื่อ)</span>}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                      HN {n.hn || "—"} · {n.date || "?"} · {n.age || "?"}ปี
                    </div>
                  </td>
                  <td className="col-hide-mobile">
                    <div>{n.operation || <span style={{ color: "var(--ink-4)" }}>—</span>}</div>
                    {n.preopdx && <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{n.preopdx.slice(0, 60)}{n.preopdx.length > 60 ? "…" : ""}</div>}
                  </td>
                  <td style={{ color: "var(--ink-2)" }} className="col-hide-mobile">{n.surgeon || "—"}</td>
                  <td className="col-hide-mobile">{n.side && <span className="pill pill-pink">{n.side}</span>}</td>
                  <td>
                    {locked
                      ? <span className="pill pill-gray" title="Locked after 24h">🔒 Locked</span>
                      : (n.complete
                        ? <span className="pill pill-pink">Complete</span>
                        : <span className="pill pill-gray">Draft</span>)}
                    {!locked && n.createdAt && hrs !== null && hrs > 0 && (
                      <div style={{ fontSize: 10, color: "var(--warn)", marginTop: 3, fontFamily: "var(--font-mono)" }}>
                        ⏱ {hrs}h left
                      </div>
                    )}
                    {n.driveUploadedAt && <div style={{ fontSize: 10, color: "var(--ok)", marginTop: 3, fontFamily: "var(--font-mono)" }}>☁ on Drive</div>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => tryOpen(n)} disabled={locked} style={locked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>
                        {locked ? "Locked" : "Open"}
                      </button>
                      <button
                        className={"btn btn-sm btn-ghost" + (n.driveUploadedAt ? "" : " btn-locked")}
                        title={n.driveUploadedAt ? "Export PDF" : "Upload to Drive ก่อน"}
                        onClick={() => onExportPdf(n)}
                      >{n.driveUploadedAt ? "PDF" : "🔒"}</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => onUploadDrive(n)} title="Upload to Drive">☁</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => onDuplicate(n.id)} title="Duplicate" disabled={locked} style={locked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>⎘</button>
                      <button className="btn btn-sm btn-ghost btn-danger" onClick={() => onDelete(n.id)} title="Delete">✕</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {lockedMsg && (
        <div className="modal-backdrop" onClick={() => setLockedMsg(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h3>🔒 บันทึกถูกล็อกแล้ว</h3></div>
            <div className="modal-body"><p style={{ margin: 0 }}>{lockedMsg}</p>
              <p style={{ marginTop: 10, fontSize: 12, color: "var(--ink-3)" }}>
                ยังสามารถ export PDF หรืออัปโหลดไป Drive ได้ตามปกติ — แต่ไม่สามารถเปิดแก้ไขเนื้อหาได้แล้ว
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={() => setLockedMsg(null)}>เข้าใจแล้ว</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.Dashboard = Dashboard;
