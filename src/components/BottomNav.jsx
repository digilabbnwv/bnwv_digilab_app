import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, QrCode, CalendarDays, User } from 'lucide-react'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/materiaal', icon: Package, label: 'Materiaal' },
    { to: '/item/scan', icon: QrCode, label: 'Scan', accent: true },
    { to: '/reserveren', icon: CalendarDays, label: 'Reserveer' },
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
                            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${item.accent
                                ? 'bg-gradient-to-r from-primary to-primary-end text-white shadow-lg shadow-primary/30 -mt-4 px-4 py-3 rounded-2xl'
                                : isActive
                                    ? 'text-primary'
                                    : 'text-text-muted hover:text-text-secondary'
                            }`
                        }
                    >
                        <IconComp size={item.accent ? 22 : 20} />
                        <span className={`text-xs font-medium ${item.accent ? '' : ''}`}>{item.label}</span>
                    </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
