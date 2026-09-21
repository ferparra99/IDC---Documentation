export function TopToolbar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 16,
    }}>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{subtitle}</div>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
    </div>
  );
}
