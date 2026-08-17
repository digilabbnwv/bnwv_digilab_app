import React from 'react'
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// Merk-palet (zie tailwind.config.js). Voor categorische reeksen (pie/legenda).
const PALET = ['#E8772E', '#7C3AED', '#10B981', '#F5A623', '#A855F7', '#EF4444', '#3B82F6']

const asKleur = 'rgb(var(--color-text-muted))'
const gridKleur = 'rgb(var(--color-overlay) / 0.1)'

const tooltipStijl = {
    background: 'rgb(var(--color-bg-surface))',
    border: '1px solid rgb(var(--color-overlay) / 0.15)',
    borderRadius: 12,
    color: 'rgb(var(--color-text-primary))',
    fontSize: 13,
}

/**
 * Dunne wrapper om Recharts. Ondersteunt bar (horizontaal/verticaal), line en pie.
 * Data is een array; xKey = categorie-veld, yKey = waarde-veld.
 */
export default function RapportGrafiek({
    type = 'bar',
    data = [],
    xKey = 'label',
    yKey = 'aantal',
    kleur = '#E8772E',
    horizontaal = false,
    hoogte = 260,
    naamLabel = 'Aantal',
}) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center text-text-muted text-sm" style={{ height: hoogte }}>
                Geen gegevens voor deze periode
            </div>
        )
    }

    if (type === 'pie') {
        return (
            <ResponsiveContainer width="100%" height={hoogte}>
                <PieChart>
                    <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius="75%" label>
                        {data.map((_, i) => <Cell key={i} fill={PALET[i % PALET.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStijl} />
                    <Legend wrapperStyle={{ fontSize: 12, color: asKleur }} />
                </PieChart>
            </ResponsiveContainer>
        )
    }

    if (type === 'line') {
        return (
            <ResponsiveContainer width="100%" height={hoogte}>
                <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridKleur} />
                    <XAxis dataKey={xKey} tick={{ fill: asKleur, fontSize: 12 }} stroke={gridKleur} />
                    <YAxis allowDecimals={false} tick={{ fill: asKleur, fontSize: 12 }} stroke={gridKleur} />
                    <Tooltip contentStyle={tooltipStijl} />
                    <Line type="monotone" dataKey={yKey} name={naamLabel} stroke={kleur} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
            </ResponsiveContainer>
        )
    }

    // bar
    return (
        <ResponsiveContainer width="100%" height={hoogte}>
            <BarChart
                data={data}
                layout={horizontaal ? 'vertical' : 'horizontal'}
                margin={{ top: 8, right: 12, left: horizontaal ? 8 : -12, bottom: 4 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke={gridKleur} />
                {horizontaal ? (
                    <>
                        <XAxis type="number" allowDecimals={false} tick={{ fill: asKleur, fontSize: 12 }} stroke={gridKleur} />
                        <YAxis type="category" dataKey={xKey} width={110} tick={{ fill: asKleur, fontSize: 12 }} stroke={gridKleur} />
                    </>
                ) : (
                    <>
                        <XAxis dataKey={xKey} tick={{ fill: asKleur, fontSize: 12 }} stroke={gridKleur} interval={0} angle={-15} textAnchor="end" height={50} />
                        <YAxis allowDecimals={false} tick={{ fill: asKleur, fontSize: 12 }} stroke={gridKleur} />
                    </>
                )}
                <Tooltip contentStyle={tooltipStijl} cursor={{ fill: 'rgb(var(--color-overlay) / 0.05)' }} />
                <Bar dataKey={yKey} name={naamLabel} fill={kleur} radius={horizontaal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}
