// Reusable field components

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Field({ label, hint, children, span }) {
  return (
    <div className="field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || ""}
      {...rest}
    />
  );
}

function TextArea({ value, onChange, placeholder, large, rows }) {
  return (
    <textarea
      className={large ? "large" : ""}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || ""}
      rows={rows}
    />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder || "— เลือก —"}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function ComboBox({ value, onChange, options, placeholder }) {
  // input with datalist — freeform + suggested options
  const id = useMemo(() => "dl_" + Math.random().toString(36).slice(2, 8), []);
  return (
    <>
      <input
        type="text"
        list={id}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ""}
      />
      <datalist id={id}>
        {options.map(opt => <option key={opt} value={opt} />)}
      </datalist>
    </>
  );
}

function Chips({ value, onChange, options }) {
  return (
    <div className="chips">
      {options.map(opt => (
        <button
          type="button"
          key={opt}
          className={"chip" + (value === opt ? " active" : "")}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function compressImage(file, maxPx = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function ImageUpload({ value, onChange, label }) {
  const inputRef = useRef(null);
  const [compressing, setCompressing] = React.useState(false);
  const pick = () => inputRef.current && inputRef.current.click();
  const handle = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setCompressing(true);
    try {
      const dataUrl = await compressImage(f);
      onChange({ dataUrl, name: f.name });
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  };
  return (
    <div className="spec-drop" onClick={compressing ? undefined : pick} style={compressing ? { cursor: "wait", opacity: 0.7 } : undefined}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handle} />
      {compressing ? (
        <div className="spec-empty">
          <div style={{ fontSize: 18, marginBottom: 6 }}>⏳</div>
          <div style={{ fontSize: 11 }}>กำลังบีบรูป…</div>
        </div>
      ) : value ? (
        <>
          <img src={value.dataUrl} alt={value.name} />
          <button className="spec-rm" onClick={(e) => { e.stopPropagation(); onChange(null); }}>ลบ</button>
        </>
      ) : (
        <div className="spec-empty">
          <div style={{ fontSize: 22, marginBottom: 6 }}>＋</div>
          <div>{label || "เพิ่มรูป specimen"}</div>
          <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4 }}>JPG / PNG · บีบอัตโนมัติ</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Field, TextInput, TextArea, Select, ComboBox, Chips, ImageUpload });
