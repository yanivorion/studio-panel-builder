import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, X, AlignLeft, AlignCenter, AlignRight, AlignJustify, Upload, RefreshCw } from 'lucide-react';
import { tokens } from './tokens.js';
import { SectionImage } from './SectionImage.jsx';
import { isBase44Backend } from '../services/backend.js';
import { uploadPanelTemplateFile } from '../services/base44Api.js';

// ── Font library ──────────────────────────────────────────────────────────────
const FONT_FAMILIES = [
  { label: 'Sora',             value: "'Sora', sans-serif" },
  { label: 'Inter',            value: "'Inter', sans-serif" },
  { label: 'DM Sans',          value: "'DM Sans', sans-serif" },
  { label: 'Space Grotesk',    value: "'Space Grotesk', sans-serif" },
  { label: 'Outfit',           value: "'Outfit', sans-serif" },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'DM Serif Display', value: "'DM Serif Display', serif" },
  { label: 'Madefor',          value: "'WixMadeforText', sans-serif" },
  { label: 'Arial',            value: 'Arial, sans-serif' },
  { label: 'Helvetica',        value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Georgia',          value: 'Georgia, serif' },
  { label: 'Times New Roman',  value: "'Times New Roman', serif" },
  { label: 'Courier New',      value: "'Courier New', monospace" },
];

const FONT_WEIGHTS = [
  { label: 'Thin',      value: 100 },
  { label: 'Light',     value: 300 },
  { label: 'Regular',   value: 400 },
  { label: 'Medium',    value: 500 },
  { label: 'SemiBold',  value: 600 },
  { label: 'Bold',      value: 700 },
  { label: 'ExtraBold', value: 800 },
  { label: 'Black',     value: 900 },
];

// ── Shared primitives ─────────────────────────────────────────────────────────
const ipt = {
  height: 30, borderRadius: 5,
  border: `1px solid ${tokens.border1}`,
  backgroundColor: tokens.bg2,
  display: 'flex', alignItems: 'center',
};

function Lbl({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: tokens.fontUI, color: tokens.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
      {children}
    </div>
  );
}

function InlineInput({ value, onChange, type = 'text', placeholder, style }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      style={{
        flex: 1, height: '100%', padding: '0 7px',
        border: 'none', background: 'none', outline: 'none',
        fontFamily: tokens.fontUI, fontSize: 12, color: tokens.text1,
        ...style,
      }}
    />
  );
}

function Field({ label, children, mb = 10 }) {
  return (
    <div style={{ marginBottom: mb }}>
      {label && <Lbl>{label}</Lbl>}
      {children}
    </div>
  );
}

function Row({ children, gap = 8 }) {
  const count = React.Children.count(children);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap }}>
      {children}
    </div>
  );
}

function NumBox({ label, value, onChange, min, max, step = 1, suffix, mb = 0 }) {
  return (
    <div style={{ marginBottom: mb }}>
      {label && <Lbl>{label}</Lbl>}
      <div style={{ ...ipt, overflow: 'hidden' }}>
        <button onClick={() => onChange(Math.max(min ?? -Infinity, (value || 0) - step))}
          style={{ width: 26, height: '100%', border: 'none', background: 'none', color: tokens.text3, cursor: 'pointer', fontSize: 15, flexShrink: 0, lineHeight: 1 }}>
          −
        </button>
        <input type="number" value={value ?? ''} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, height: '100%', border: 'none', background: 'none', outline: 'none', textAlign: 'center', fontFamily: tokens.fontUI, fontSize: 12, color: tokens.text1 }}
        />
        <button onClick={() => onChange(Math.min(max ?? Infinity, (value || 0) + step))}
          style={{ width: 26, height: '100%', border: 'none', background: 'none', color: tokens.text3, cursor: 'pointer', fontSize: 15, flexShrink: 0, lineHeight: 1 }}>
          +
        </button>
        {suffix && <span style={{ padding: '0 6px', fontSize: 10, color: tokens.text3, fontFamily: tokens.fontUI, borderLeft: `1px solid ${tokens.border0}` }}>{suffix}</span>}
      </div>
    </div>
  );
}

function TextBox({ label, value, onChange, placeholder, mb = 10 }) {
  return (
    <Field label={label} mb={mb}>
      <div style={{ ...ipt, overflow: 'hidden' }}>
        <InlineInput value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    </Field>
  );
}

function ColorBox({ label, value, onChange, mb = 10 }) {
  return (
    <Field label={label} mb={mb}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 30, height: 30, borderRadius: 5, overflow: 'hidden', border: `1px solid ${tokens.border1}`, flexShrink: 0 }}>
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
            style={{ width: '200%', height: '200%', border: 'none', cursor: 'pointer', transform: 'translate(-25%,-25%)' }} />
        </div>
        <div style={{ ...ipt, flex: 1 }}>
          <InlineInput value={value || ''} onChange={onChange} placeholder="#000000"
            style={{ fontFamily: tokens.fontMono, fontSize: 11 }} />
        </div>
      </div>
    </Field>
  );
}

function SelectBox({ label, value, onChange, options, mb = 10 }) {
  return (
    <Field label={label} mb={mb}>
      <div style={{ ...ipt, overflow: 'hidden', position: 'relative' }}>
        <select value={value ?? ''} onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, height: '100%', border: 'none', background: 'none', outline: 'none',
            padding: '0 8px', fontFamily: tokens.fontUI, fontSize: 12, color: tokens.text1,
            cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
          }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={12} color={tokens.text3} style={{ position: 'absolute', right: 8, pointerEvents: 'none' }} />
      </div>
    </Field>
  );
}

function SegmentRow({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          title={o.title}
          style={{
            flex: 1, height: 30, border: `1px solid ${value === o.value ? tokens.accent : tokens.border1}`,
            borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: value === o.value ? tokens.accentSoft : tokens.bg2,
            color: value === o.value ? tokens.accent : tokens.text2,
            fontSize: 11, fontFamily: tokens.fontUI,
          }}
        >
          {o.icon || o.label}
        </button>
      ))}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Accordion({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${tokens.border0}` }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', height: 36, padding: '0 14px',
        border: 'none', cursor: 'pointer', background: 'none',
        fontFamily: tokens.fontUI, fontSize: 11, fontWeight: 600, color: tokens.text2, textAlign: 'left',
      }}>
        {title}
        {open ? <ChevronDown size={13} color={tokens.text3} /> : <ChevronRight size={13} color={tokens.text3} />}
      </button>
      {open && <div style={{ padding: '2px 14px 14px' }}>{children}</div>}
    </div>
  );
}

// ── Layout section (position + size) ─────────────────────────────────────────
function LayoutSection({ element, onUpdate }) {
  return (
    <Accordion title="Layout">
      <Row>
        <NumBox label="X" value={Math.round(element.x)} onChange={v => onUpdate({ x: v })} suffix="px" />
        <NumBox label="Y" value={Math.round(element.y)} onChange={v => onUpdate({ y: v })} suffix="px" />
      </Row>
      <div style={{ height: 8 }} />
      <Row>
        <NumBox label="W" value={Math.round(element.w)} min={1} onChange={v => onUpdate({ w: v })} suffix="px" />
        <NumBox label="H" value={Math.round(element.h)} min={1} onChange={v => onUpdate({ h: v })} suffix="px" />
      </Row>
    </Accordion>
  );
}

// ── Typography section ────────────────────────────────────────────────────────
function TypographySection({ element, onUpdate }) {
  const p = element.props || {};
  const up = patch => onUpdate({ props: { ...p, ...patch } });

  const alignOptions = [
    { value: 'left',    icon: <AlignLeft size={13} />,    title: 'Left' },
    { value: 'center',  icon: <AlignCenter size={13} />,  title: 'Center' },
    { value: 'right',   icon: <AlignRight size={13} />,   title: 'Right' },
    { value: 'justify', icon: <AlignJustify size={13} />, title: 'Justify' },
  ];

  const ttOptions = [
    { value: 'none',       label: 'Aa',   title: 'Normal' },
    { value: 'uppercase',  label: 'AA',   title: 'UPPER' },
    { value: 'lowercase',  label: 'aa',   title: 'lower' },
    { value: 'capitalize', label: 'Aa+',  title: 'Title' },
  ];

  return (
    <Accordion title="Typography">
      {/* Text content */}
      <Field label="Text" mb={8}>
        <textarea
          value={p.text || ''}
          onChange={e => up({ text: e.target.value })}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '6px 8px', resize: 'vertical', minHeight: 60,
            border: `1px solid ${tokens.border1}`, borderRadius: 5,
            backgroundColor: tokens.bg2, outline: 'none',
            fontFamily: tokens.fontUI, fontSize: 12, color: tokens.text1,
            lineHeight: 1.5,
          }}
        />
      </Field>

      {/* Font family */}
      <SelectBox label="Font Family"
        value={p.fontFamily || ''}
        onChange={v => up({ fontFamily: v })}
        options={[{ label: '— inherit —', value: '' }, ...FONT_FAMILIES]}
        mb={8}
      />

      {/* Size + Weight */}
      <Row>
        <NumBox label="Size" value={p.fontSize || 16} min={6} max={400} onChange={v => up({ fontSize: v })} suffix="px" mb={8} />
        <Field label="Weight" mb={8}>
          <div style={{ ...ipt, overflow: 'hidden', position: 'relative' }}>
            <select value={p.fontWeight || 400} onChange={e => up({ fontWeight: Number(e.target.value) })}
              style={{ flex: 1, height: '100%', border: 'none', background: 'none', outline: 'none', padding: '0 8px', fontFamily: tokens.fontUI, fontSize: 12, color: tokens.text1, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
              {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
            <ChevronDown size={12} color={tokens.text3} style={{ position: 'absolute', right: 8, pointerEvents: 'none' }} />
          </div>
        </Field>
      </Row>

      {/* Color */}
      <ColorBox label="Color" value={/^rgba?\(/.test(p.color || '') ? '#ffffff' : (p.color || '#111111')} onChange={v => up({ color: v })} mb={8} />

      {/* Line height + letter spacing */}
      <Row>
        <NumBox label="Line H." value={Math.round((p.lineHeight || 1.5) * 100)} min={100} max={300} step={5} suffix="%" onChange={v => up({ lineHeight: v / 100 })} mb={8} />
        <Field label="Tracking" mb={8}>
          <div style={{ ...ipt, overflow: 'hidden' }}>
            <input type="text" value={p.letterSpacing || 'normal'}
              onChange={e => up({ letterSpacing: e.target.value })}
              placeholder="0em"
              style={{ flex: 1, height: '100%', border: 'none', background: 'none', outline: 'none', padding: '0 7px', fontFamily: tokens.fontUI, fontSize: 12, color: tokens.text1 }} />
          </div>
        </Field>
      </Row>

      {/* Alignment */}
      <Field label="Align" mb={8}>
        <SegmentRow value={p.textAlign || 'left'} onChange={v => up({ textAlign: v })} options={alignOptions} />
      </Field>

      {/* Text transform */}
      <Field label="Case" mb={0}>
        <SegmentRow value={p.textTransform || 'none'} onChange={v => up({ textTransform: v })} options={ttOptions} />
      </Field>
    </Accordion>
  );
}

// ── Image section ─────────────────────────────────────────────────────────────
function ImageSection({ element, onUpdate }) {
  const p = element.props || {};
  const up = patch => onUpdate({ props: { ...p, ...patch } });
  const fileInputRef = useRef(null);

  const handleUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => up({ src: evt.target.result });
    reader.readAsDataURL(file);
  };

  const fitOptions = [
    { value: 'cover',   label: 'Cover',   title: 'Fill frame (crop)' },
    { value: 'contain', label: 'Contain', title: 'Fit inside frame' },
    { value: 'fill',    label: 'Fill',    title: 'Stretch' },
  ];

  const posOptions = [
    { value: 'center',      label: 'Center' },
    { value: 'center top',  label: 'Top' },
    { value: 'center bottom', label: 'Bottom' },
    { value: 'left center', label: 'Left' },
    { value: 'right center', label: 'Right' },
  ];

  return (
    <Accordion title="Image">
      {/* Preview */}
      {p.src && (
        <div style={{
          width: '100%', aspectRatio: '16/9', borderRadius: 5, overflow: 'hidden',
          backgroundColor: '#222', marginBottom: 10, border: `1px solid ${tokens.border1}`,
        }}>
          <img src={p.src} alt="" style={{ width: '100%', height: '100%', objectFit: p.objectFit || 'cover', display: 'block' }} />
        </div>
      )}

      {/* Upload / Replace */}
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            border: `1px solid ${tokens.border1}`, borderRadius: 5, cursor: 'pointer',
            backgroundColor: tokens.bg2, color: tokens.text1, fontFamily: tokens.fontUI, fontSize: 11, fontWeight: 500,
          }}>
          <Upload size={12} /> {p.src ? 'Replace' : 'Upload Image'}
        </button>
        {p.src && (
          <button onClick={() => up({ src: '' })} title="Remove image"
            style={{ width: 32, height: 32, border: `1px solid ${tokens.border1}`, borderRadius: 5, cursor: 'pointer', backgroundColor: tokens.bg2, color: tokens.text3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Source URL (alternative input) */}
      <TextBox label="Or paste URL" value={p.src?.startsWith('data:') ? '' : (p.src || '')}
        onChange={v => up({ src: v })} placeholder="https://…" mb={10} />

      {/* Fit + Position */}
      <SelectBox label="Object Fit" value={p.objectFit || 'cover'} onChange={v => up({ objectFit: v })}
        options={fitOptions} mb={8} />
      <SelectBox label="Object Position" value={p.objectPosition || 'center'} onChange={v => up({ objectPosition: v })}
        options={posOptions} mb={0} />
    </Accordion>
  );
}

// ── Button section ────────────────────────────────────────────────────────────
function ButtonSection({ element, onUpdate }) {
  const p = element.props || {};
  const up = patch => onUpdate({ props: { ...p, ...patch } });

  const variantOptions = [
    { value: 'btn-fill',    label: 'Filled',  title: 'Filled button' },
    { value: 'btn-outline', label: 'Outline', title: 'Outline button' },
    { value: 'btn-text',    label: 'Text',    title: 'Text only' },
  ];

  const ttOptions = [
    { value: 'none',      label: 'Aa'  },
    { value: 'uppercase', label: 'AA'  },
    { value: 'lowercase', label: 'aa'  },
  ];

  return (
    <Accordion title="Button">
      {/* Label */}
      <TextBox label="Label" value={p.label || ''} onChange={v => up({ label: v })} placeholder="Button" mb={8} />

      {/* Variant */}
      <Field label="Style" mb={8}>
        <SegmentRow value={element.type} onChange={v => onUpdate({ type: v })} options={variantOptions} />
      </Field>

      {/* Font family */}
      <SelectBox label="Font Family"
        value={p.fontFamily || ''}
        onChange={v => up({ fontFamily: v })}
        options={[{ label: '— inherit —', value: '' }, ...FONT_FAMILIES]}
        mb={8}
      />

      {/* Size + Weight */}
      <Row>
        <NumBox label="Size" value={p.fontSize || 14} min={8} max={72} onChange={v => up({ fontSize: v })} suffix="px" mb={8} />
        <NumBox label="Radius" value={p.radius !== undefined ? p.radius : 6} min={0} max={9999} onChange={v => up({ radius: v })} suffix="px" mb={8} />
      </Row>

      {/* Colors */}
      <Row>
        <ColorBox label="Text Color"  value={p.color   || '#ffffff'} onChange={v => up({ color: v })}   mb={8} />
        <ColorBox label="BG Color"    value={p.bgColor || '#116DFF'} onChange={v => up({ bgColor: v })} mb={8} />
      </Row>
      <ColorBox label="Border Color" value={p.borderColor || '#ffffff'} onChange={v => up({ borderColor: v })} mb={8} />

      {/* Letter spacing + text case */}
      <Row>
        <Field label="Tracking" mb={0}>
          <div style={{ ...ipt, overflow: 'hidden' }}>
            <input type="text" value={p.letterSpacing || 'normal'}
              onChange={e => up({ letterSpacing: e.target.value })}
              placeholder="0em"
              style={{ flex: 1, height: '100%', border: 'none', background: 'none', outline: 'none', padding: '0 7px', fontFamily: tokens.fontUI, fontSize: 12, color: tokens.text1 }} />
          </div>
        </Field>
        <Field label="Case" mb={0}>
          <SegmentRow value={p.textTransform || 'none'} onChange={v => up({ textTransform: v })} options={ttOptions} />
        </Field>
      </Row>
    </Accordion>
  );
}

// ── Shape section ─────────────────────────────────────────────────────────────
function ShapeSection({ element, onUpdate }) {
  const p = element.props || {};
  const up = patch => onUpdate({ props: { ...p, ...patch } });
  return (
    <Accordion title="Fill & Border">
      <ColorBox label="Fill" value={p.fill || '#e0e0e0'} onChange={v => up({ fill: v })} />
      <Row>
        <NumBox label="Border W." value={p.borderWidth || 0} min={0} max={20} onChange={v => up({ borderWidth: v })} suffix="px" />
        <NumBox label="Radius"    value={p.radius || 0}      min={0}            onChange={v => up({ radius: v })}      suffix="px" />
      </Row>
    </Accordion>
  );
}

// ── Responsive breakpoint section ─────────────────────────────────────────────
function ResponsiveSection({ breakpoint, onChangeBreakpoint }) {
  const bps = [
    { value: 'desktop', label: '🖥 Desktop', sub: '1280px' },
    { value: 'tablet',  label: '📱 Tablet',  sub: '768px'  },
    { value: 'mobile',  label: '📱 Mobile',  sub: '390px'  },
  ];
  return (
    <Accordion title="Responsive" defaultOpen={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {bps.map(bp => (
          <button key={bp.value} onClick={() => onChangeBreakpoint(bp.value)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              height: 34, padding: '0 10px',
              border: `1px solid ${breakpoint === bp.value ? tokens.accent : tokens.border1}`,
              borderRadius: 5, cursor: 'pointer',
              backgroundColor: breakpoint === bp.value ? tokens.accentSoft : tokens.bg2,
              fontFamily: tokens.fontUI, fontSize: 11, color: breakpoint === bp.value ? tokens.accent : tokens.text2,
            }}>
            <span>{bp.label}</span>
            <span style={{ fontSize: 10, color: tokens.text3 }}>{bp.sub}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: tokens.text3, fontFamily: tokens.fontUI, lineHeight: 1.5 }}>
        Layout changes (X, Y, W, H) apply to the selected breakpoint. Content changes apply to all breakpoints.
      </div>
    </Accordion>
  );
}

// ── Section switcher ──────────────────────────────────────────────────────────
function SectionSwitcher({ sections, selectedSectionId, onSelectSection }) {
  if (!sections?.length || !onSelectSection) return null;

  return (
    <div style={{
      padding: '10px 14px',
      borderBottom: `1px solid ${tokens.border0}`,
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, fontFamily: tokens.fontUI,
        color: tokens.text3, textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8,
      }}>
        Sections
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {sections.map(s => {
          const active = selectedSectionId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSection(s.id)}
              style={{
                padding: '5px 10px',
                borderRadius: tokens.r4,
                border: `1px solid ${active ? tokens.accent : tokens.border1}`,
                backgroundColor: active ? tokens.accentSoft : tokens.bg2,
                color: active ? tokens.accent : tokens.text2,
                fontFamily: tokens.fontUI,
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: `all ${tokens.fast}`,
              }}
            >
              {s.label || 'Section'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Section inspector ─────────────────────────────────────────────────────────
function SectionInspector({ section, sections = [], onUpdate, onSwapSectionImage }) {
  const fileInputRef = useRef(null);
  const up = patch => onUpdate(section.id, patch);
  const sectionImage = section.image || section.backgroundImage || null;

  const handleUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const applyImage = image => up({
      image,
      backgroundImage: null,
      backgroundSize: null,
      backgroundPosition: null,
      height: null,
    });

    if (isBase44Backend()) {
      try {
        applyImage(await uploadPanelTemplateFile(file));
        return;
      } catch (err) {
        console.warn('[Inspector] Base44 upload failed, using inline preview', err);
      }
    }

    const reader = new FileReader();
    reader.onload = evt => applyImage(evt.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${tokens.border1}`, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, fontFamily: tokens.fontUI, color: tokens.text1 }}>Section</div>
          <div style={{ fontSize: 10, fontFamily: tokens.fontUI, color: tokens.text3, marginTop: 1 }}>
            {section.label || 'Untitled'}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <Accordion title="Section" defaultOpen>
          <TextBox label="Label" value={section.label || ''} onChange={v => up({ label: v })} mb={10} />
          {!sectionImage && (
            <NumBox label="Height" value={section.height || 400} onChange={v => up({ height: v })} min={40} max={4000} suffix="px" mb={10} />
          )}
          <ColorBox label="Background color" value={section.bg || '#ffffff'} onChange={v => up({ bg: v })} mb={10} />
          <div style={{ marginBottom: 10 }}>
            <Lbl>Position</Lbl>
            <button
              type="button"
              onClick={() => up({ dock: section.dock === 'bottom' ? null : 'bottom' })}
              style={{
                width: '100%', height: 30, padding: '0 10px', borderRadius: 5, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${section.dock === 'bottom' ? tokens.accentBorder : tokens.border1}`,
                backgroundColor: section.dock === 'bottom' ? tokens.accentSoft : tokens.bg2,
                fontFamily: tokens.fontUI, fontSize: 11, color: tokens.text1,
              }}
            >
              {section.dock === 'bottom' ? 'Docked to bottom' : 'Normal (scroll with page)'}
            </button>
          </div>
        </Accordion>

        {section.marquee && (
          <Accordion title="Running text" defaultOpen>
            <TextBox
              label="Ticker text"
              value={section.marquee.text || ''}
              onChange={v => up({ marquee: { ...section.marquee, text: v } })}
              placeholder="SPRITZ BERLIN   8 (AUG) 2035   DOORS OPEN 00:00"
              mb={10}
            />
            <div style={{ fontSize: 10, color: tokens.text3, fontFamily: tokens.fontUI, lineHeight: 1.5 }}>
              Inter 14px regular · scrolls above the docked image
            </div>
          </Accordion>
        )}

        <Accordion title="Section image" defaultOpen>
          {sectionImage && (
            <div style={{
              width: '100%', borderRadius: 5, overflow: 'hidden',
              backgroundColor: '#222', marginBottom: 10, border: `1px solid ${tokens.border1}`,
            }}>
              <SectionImage src={sectionImage} />
            </div>
          )}

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                border: `1px solid ${tokens.border1}`, borderRadius: 5, cursor: 'pointer',
                backgroundColor: tokens.bg2, color: tokens.text1, fontFamily: tokens.fontUI, fontSize: 11, fontWeight: 500,
              }}
            >
              <Upload size={12} /> {sectionImage ? 'Replace' : 'Upload'}
            </button>
            {sectionImage && onSwapSectionImage && sections.filter(s => s.id !== section.id && (s.image || s.backgroundImage)).length > 0 && (
              <select
                defaultValue=""
                onChange={e => {
                  const otherId = e.target.value;
                  if (otherId) onSwapSectionImage(section.id, otherId);
                  e.target.value = '';
                }}
                style={{
                  flex: 1, height: 32, padding: '0 8px', borderRadius: 5, cursor: 'pointer',
                  border: `1px solid ${tokens.border1}`, backgroundColor: tokens.bg2,
                  color: tokens.text1, fontFamily: tokens.fontUI, fontSize: 11,
                }}
              >
                <option value="" disabled>Swap with…</option>
                {sections
                  .filter(s => s.id !== section.id && (s.image || s.backgroundImage))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.label || 'Section'}</option>
                  ))}
              </select>
            )}
            {sectionImage && (
              <button
                type="button"
                onClick={() => up({ image: null, backgroundImage: null, height: 400 })}
                title="Remove image"
                style={{
                  width: 32, height: 32, border: `1px solid ${tokens.border1}`, borderRadius: 5, cursor: 'pointer',
                  backgroundColor: tokens.bg2, color: tokens.text3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <TextBox
            label="Image URL"
            value={sectionImage?.startsWith('data:') ? '' : (sectionImage || '')}
            onChange={v => up({
              image: v || null,
              backgroundImage: null,
              backgroundSize: null,
              backgroundPosition: null,
              height: v ? null : (section.height || 400),
            })}
            placeholder="/sites/thalina/header.png"
            mb={0}
          />
          <div style={{ marginTop: 10, fontSize: 10, color: tokens.text3, fontFamily: tokens.fontUI, lineHeight: 1.5 }}>
            Image renders at 100% width with automatic height.
          </div>
        </Accordion>
      </div>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
      <div style={{ fontSize: 28, opacity: 0.25 }}>⬚</div>
      <div style={{ fontSize: 11, fontFamily: tokens.fontUI, color: tokens.text3, textAlign: 'center', lineHeight: 1.6 }}>
        Click a section or element<br />on the canvas to edit
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  heading: 'Heading', text: 'Text', paragraph: 'Paragraph',
  image: 'Image', button: 'Button', 'btn-fill': 'Button', 'btn-outline': 'Button',
  'shape-rect': 'Rectangle', 'shape-circle': 'Circle', 'shape-line': 'Line',
  container: 'Container', 'video-embed': 'Video',
};

function Header({ element, onDeselect }) {
  const label = TYPE_LABELS[element.type] || element.type;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderBottom: `1px solid ${tokens.border1}`, flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: tokens.fontUI, color: tokens.text1 }}>{label}</div>
        <div style={{ fontSize: 10, fontFamily: tokens.fontMono, color: tokens.text3, marginTop: 1 }}>{element.id.slice(0, 10)}…</div>
      </div>
      <button onClick={onDeselect}
        style={{ width: 26, height: 26, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'none', color: tokens.text3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg2; e.currentTarget.style.color = tokens.text1; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = tokens.text3; }}>
        <X size={13} />
      </button>
    </div>
  );
}

// ── Main Inspector ────────────────────────────────────────────────────────────
export function Inspector({
  element,
  section,
  sections = [],
  selectedSectionId,
  onSelectSection,
  onUpdate,
  onUpdateSection,
  onSwapSectionImage,
  onDeselect,
  breakpoint = 'desktop',
  onChangeBreakpoint,
}) {
  const shell = (body) => (
    <div style={{
      width: tokens.inspectorW, backgroundColor: tokens.bg1,
      borderLeft: `1px solid ${tokens.border1}`,
      flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 14px', borderBottom: `1px solid ${tokens.border0}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: tokens.fontUI, color: tokens.text2 }}>Inspector</span>
        {section && !element && (
          <button
            type="button"
            onClick={onDeselect}
            style={{
              width: 26, height: 26, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: 'none', color: tokens.text3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      <SectionSwitcher
        sections={sections}
        selectedSectionId={selectedSectionId}
        onSelectSection={onSelectSection}
      />
      {body}
    </div>
  );

  if (section && !element && onUpdateSection) {
    return shell(
      <SectionInspector
        section={section}
        sections={sections}
        onUpdate={onUpdateSection}
        onSwapSectionImage={onSwapSectionImage}
      />
    );
  }

  if (!element) return shell(<EmptyState />);

  const handleUpdate = (patch) => onUpdate(element.id, patch);

  const isText   = ['heading', 'paragraph', 'text', 'richtext'].includes(element.type);
  const isButton = ['btn-fill', 'btn-outline', 'button', 'btn-text'].includes(element.type);
  const isShape  = ['shape-rect', 'shape-circle', 'shape-triangle', 'shape-line'].includes(element.type);
  const isImage  = element.type === 'image';

  return shell(
    <>
      <Header element={element} onDeselect={onDeselect} />
      <LayoutSection element={element} onUpdate={handleUpdate} />
      {isText   && <TypographySection element={element} onUpdate={handleUpdate} />}
      {isButton && <ButtonSection     element={element} onUpdate={handleUpdate} />}
      {isImage  && <ImageSection      element={element} onUpdate={handleUpdate} />}
      {isShape  && <ShapeSection      element={element} onUpdate={handleUpdate} />}
      <ResponsiveSection breakpoint={breakpoint} onChangeBreakpoint={onChangeBreakpoint || (() => {})} />
    </>
  );
}
