import { useState, useEffect } from "react";
import { useBreakpoint } from "../hooks/useBreakpoint";

const items = [
  { id: 'fichaje', label: 'Fichaje', icon: '◷' },
  { id: 'calendario', label: 'Calendario', icon: '▦' },
  { id: 'permisos', label: 'Permisos', icon: '✉' },
  { id: 'viajes', label: 'Viajes', icon: '✈' },
  { id: 'reportes', label: 'Reportes', icon: '▭' },
] as const;

export function Sidebar({ tab, setTab }: { tab: string; setTab: (t: any) => void }) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  if (isMobile) return null;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar:collapsed') !== 'false'; } catch { return true; }
  });
  const [hovered, setHovered] = useState(false);
  const expanded = !collapsed || hovered;

  useEffect(()=>{ try{ localStorage.setItem('sidebar:collapsed', String(collapsed)); }catch{} }, [collapsed]);

  // close hover on collapse change via keyboard
  const toggle = ()=> setCollapsed(v=>!v);

  return (
    <aside
      onMouseEnter={()=> { if(bp==='desktop') setHovered(true); }}
      onMouseLeave={()=> setHovered(false)}
      style={{
        width: expanded ? 230 : 64,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: expanded ? '16px 12px' : '16px 8px',
        gap: 4,
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 220ms cubic-bezier(.2,.8,.2,1), padding 220ms',
        overflow: 'hidden',
        willChange: 'width',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent: expanded ? 'space-between':'center', gap:8, marginBottom:12, minHeight:24 }}>
        <div style={{ fontFamily:'Fraunces, serif', fontWeight:700, fontSize: expanded?16:14, whiteSpace:'nowrap', overflow:'hidden', flex: expanded?1:undefined, textAlign: expanded?'left':'center' }}>
          {expanded ? '◈ Timetracker' : '◈'}
        </div>
        <button
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir (clic o hover)' : 'Colapsar'}
          style={{
            width:28, height:28, flexShrink:0, borderRadius:6, border:'1px solid var(--border-subtle)',
            background: 'var(--bg-base)', color:'var(--text-secondary)', cursor:'pointer', display:'grid', placeItems:'center', fontSize:12,
          }}
        >
          {collapsed && !hovered ? '›' : '‹'}
        </button>
      </div>

      {items.map(it=>{
        const active=tab===it.id;
        return (
          <button key={it.id} onClick={()=>setTab(it.id)} title={it.label}
            style={{
              display:'flex', alignItems:'center', gap:10,
              justifyContent: expanded ? 'flex-start':'center',
              padding: expanded ? '10px 12px' : '10px 0',
              borderRadius:8, border:'none', cursor:'pointer', fontSize:14, whiteSpace:'nowrap',
              background: active ? 'var(--accent-primary-muted)' : 'transparent',
              color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: active ? 600 : 400,
              transition:'background 150ms, color 150ms',
            }}>
            <span style={{ fontSize:16, width:20, textAlign:'center', flexShrink:0 }}>{it.icon}</span>
            <span style={{
              opacity: expanded?1:0, transform: expanded?'translateX(0)':'translateX(-6px)',
              transition:'opacity 160ms 40ms, transform 160ms 40ms', overflow:'hidden',
              width: expanded?'auto':0,
            }}>{it.label}</span>
          </button>
        );
      })}
      <div style={{ flex:1 }} />
      <div style={{
        fontSize:11, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:0.6,
        opacity: expanded?1:0, height: expanded? 'auto':0, overflow:'hidden', transition:'opacity 150ms',
        textAlign:'center',
      }}>IDC</div>
    </aside>
  );
}
