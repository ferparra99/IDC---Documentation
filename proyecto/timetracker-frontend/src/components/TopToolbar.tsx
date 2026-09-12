import { useTheme } from '../context/ThemeContext';

export function TopToolbar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { toggle, isDark } = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 16,
    }}>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        <button onClick={toggle} title={isDark ? 'Modo claro' : 'Modo oscuro'}
          style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 16,
          }}>
          {isDark ? '☀' : '☾'}
        </button>
      </div>
    </div>
  );
}
