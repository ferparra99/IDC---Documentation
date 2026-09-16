const items = [
  { id: 'fichaje', label: 'Fichaje', icon: '◷' },
  { id: 'calendario', label: 'Calendario', icon: '▦' },
  { id: 'permisos', label: 'Permisos', icon: '✉' },
  { id: 'viajes', label: 'Viajes', icon: '✈' },
  { id: 'reportes', label: 'Reportes', icon: '▭' },
] as const;

export function Sidebar({ tab, setTab, collapsed }: { tab: string; setTab: (t: any) => void; collapsed?: boolean }) {
  return (
    <aside style={{
      width: collapsed ? 64 : 230, flexShrink: 0,
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', padding: collapsed ? '16px 8px' : '16px 12px',
      gap: 4, minHeight: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: collapsed ? 14 : 16, marginBottom: 12, textAlign: collapsed ? 'center' : 'left', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {collapsed ? '◈' : '◈ Timetracker'}
      </div>
      {items.map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} title={it.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
              background: active ? 'var(--accent-primary-muted)' : 'transparent',
              color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: active ? 600 : 400,
            }}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{it.icon}</span>
            {!collapsed && it.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      {!collapsed && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6 }}>IDC</div>}
    </aside>
  );
}
