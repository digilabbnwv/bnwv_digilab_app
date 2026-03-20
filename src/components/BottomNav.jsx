import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, Wrench, BookOpen, CalendarDays, CalendarCheck, User } from 'lucide-react'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/materiaal', icon: Package, label: 'Materiaal' },
    { to: '/reserveren', icon: CalendarCheck, label: 'Reserveren' },
    { to: '/kalender', icon: CalendarDays, label: 'Kalender' },
    { to: '/profiel', icon: User, label: 'Profiel' },
]

export default function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-xl border-t border-overlay/10 safe-area-inset-bottom">
            <div className="flex items-center justify-around px-2 py-2 max-w-3xl mx-auto">
                {navItems.map((item) => {
                    const IconComp = item.icon
                    return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${isActive
                                ? 'text-primary'
                                : 'text-text-muted hover:text-text-secondary'
                            }`
                        }
                    >
                        <IconComp size={20} />
                        <span className={`text-xs font-medium ${item.accent ? '' : ''}`}>{item.label}</span>
                    </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
