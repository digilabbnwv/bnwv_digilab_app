import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, CalendarCheck, BookOpen, GraduationCap, Network } from 'lucide-react'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/materiaal', icon: Package, label: 'Materiaal' },
    { to: '/reserveren', icon: CalendarCheck, label: 'Reserveren' },
    { to: '/workshops', icon: BookOpen, label: 'Workshops' },
    { to: '/lesplannen', icon: GraduationCap, label: 'Lesplannen' },
    { to: '/leerlijn', icon: Network, label: 'Leerlijn' },
]

export default function SideNav() {
    return (
        <aside className="no-print hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-dvh z-40 bg-bg-surface/95 backdrop-blur-xl border-r border-overlay/10">
            <div className={`flex flex-col gap-1 p-4 ${MOCK ? 'pt-8' : ''}`}>
                <div className="flex items-center gap-2.5 px-3 py-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-end flex items-center justify-center text-white shadow-md shadow-primary/20">
                        <GraduationCap size={20} />
                    </div>
                    <div className="leading-tight min-w-0">
                        <p className="font-bold text-text-primary truncate">Digilab</p>
                        <p className="text-[11px] text-text-muted truncate">Bibliotheek NW Veluwe</p>
                    </div>
                </div>
                {navItems.map((item) => {
                    const IconComp = item.icon
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                                }`
                            }
                        >
                            <IconComp size={19} className="flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </NavLink>
                    )
                })}
            </div>
        </aside>
    )
}
