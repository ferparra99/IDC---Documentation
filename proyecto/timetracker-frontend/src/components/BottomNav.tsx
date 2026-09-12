const items = [
  { id: 'fichaje', label: 'Fichaje', icon: '◷' },
  { id: 'calendario', label: 'Calendario', icon: '▦' },
  { id: 'permisos', label: 'Permisos', icon: '✉' },
  { id: 'viajes', label: 'Viajes', icon: '✈' },
  { id: 'reportes', label: 'Reportes', icon: '▭' },
] as const;

export function BottomNav({ tab, setTab }: { tab: string; setTab: (t: any) => void }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-around',
      background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)',
      padding: '6px 0 calc(6px + env(safe-area-inset-bottom))',
      zIndex: 50,
    }}>
      {items.map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: active ? 600 : 400, fontSize: 10,
              minHeight: 48, minWidth: 48, padding: '4px 0',
            }}>
            <span style={{
              fontSize: 18, width: 28, height: 28, display: 'grid', placeItems: 'center',
              background: active ? 'var(--accent-primary-muted)' : 'transparent', borderRadius: 8,
            }}>{it.icon}</span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
