export type Tab = 'accounts' | 'reports' | 'dashboard'

const TABS: { id: Tab; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'dashboard', label: 'Dashboard' },
]

export function TabBar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <nav className="tab-bar" aria-label="Main views">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab ${active === tab.id ? 'tab-active' : ''}`}
          aria-pressed={active === tab.id}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
