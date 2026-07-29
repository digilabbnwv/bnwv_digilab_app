import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLeerlijnMatrix, getAllThemas } from '../lib/lesplannen'
import { LaadIndicator } from '../components/UI'
import { Network, GraduationCap, X } from 'lucide-react'

const RANG = { kennismaking: 1, verdieping: 2, beheersing: 3 }
const CEL_STIJL = {
    kennismaking: 'bg-primary/20 text-primary',
    verdieping: 'bg-primary/50 text-white',
    beheersing: 'bg-primary text-white',
    onbekend: 'bg-primary/10 text-primary',
}

function diepste(lessen) {
    let beste = null
    for (const l of lessen) {
        if (!l.diepgang) continue
        if (!beste || (RANG[l.diepgang] || 0) > (RANG[beste] || 0)) beste = l.diepgang
    }
    return beste
}

export default function Leerlijn() {
    const [matrix, setMatrix] = useState(null)
    const [themas, setThemas] = useState([])
    const [themaFilter, setThemaFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [geselecteerd, setGeselecteerd] = useState(null) // {k, d, lessen}

    useEffect(() => { getAllThemas().then(setThemas).catch(console.error) }, [])

    useEffect(() => {
        let actief = true
        const laden = async () => {
            setLoading(true)
            setGeselecteerd(null)
            try {
                const m = await getLeerlijnMatrix({ thema_id: themaFilter || undefined })
                if (actief) setMatrix(m)
            } catch (e) {
                console.error(e)
            } finally {
                if (actief) setLoading(false)
            }
        }
        laden()
        return () => { actief = false }
    }, [themaFilter])

    const rijenPerVak = useMemo(() => {
        if (!matrix) return []
        const groepen = new Map()
        matrix.rijen.forEach(k => {
            if (!groepen.has(k.vakgebied)) groepen.set(k.vakgebied, [])
            groepen.get(k.vakgebied).push(k)
        })
        return [...groepen.entries()]
    }, [matrix])

    return (
        <div className="app-container lg:max-w-6xl pt-8 pb-4 animate-fadeIn">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Network size={22} className="text-primary" />
                    <h1 className="text-2xl font-bold text-text-primary">Leerlijn</h1>
                </div>
                <select
                    value={themaFilter}
                    onChange={e => setThemaFilter(e.target.value)}
                    className="bg-bg-surface border border-overlay/20 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50"
                >
                    <option value="">Alle thema's</option>
                    {themas.map(t => <option key={t.id} value={t.id}>{t.naam}</option>)}
                </select>
            </div>
            <p className="text-text-muted text-sm mb-4">Welke kerndoelen komen in welke jaargroep aan bod — en waar zit nog geen aanbod.</p>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 mb-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-primary/20" /> kennismaking</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-primary/50" /> verdieping</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-primary" /> beheersing</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-dashed border-overlay/40" /> geen aanbod</span>
            </div>

            {loading ? (
                <LaadIndicator />
            ) : !matrix || matrix.rijen.length === 0 ? (
                <div className="card p-8 text-center">
                    <Network size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                    <p className="text-text-muted text-sm">Nog geen gepubliceerde lesbrieven met kerndoelen{themaFilter ? ' voor dit thema' : ''}.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto card p-0">
                        <table className="border-separate border-spacing-1 text-xs" style={{ minWidth: 'max-content' }}>
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-10 bg-bg-surface text-left font-medium text-text-secondary px-3 py-2 min-w-[220px]">Kerndoel</th>
                                    {matrix.kolommen.map(d => (
                                        <th key={d.id} className="font-medium text-text-secondary px-2 py-2 whitespace-nowrap text-center min-w-[90px]">{d.naam}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rijenPerVak.map(([vak, kerndoelen]) => (
                                    <React.Fragment key={vak}>
                                        <tr>
                                            <td colSpan={matrix.kolommen.length + 1} className="sticky left-0 bg-bg-surface text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 pt-3 pb-1">{vak}</td>
                                        </tr>
                                        {kerndoelen.map(k => (
                                            <tr key={k.id}>
                                                <td className="sticky left-0 z-10 bg-bg-surface px-3 py-2 min-w-[220px] align-top">
                                                    <span className="text-text-primary font-medium">{k.code}</span>
                                                    <span className="block text-[11px] text-text-muted leading-tight line-clamp-2">{k.omschrijving}</span>
                                                </td>
                                                {matrix.kolommen.map(d => {
                                                    const lessen = matrix.cellen[`${k.id}|${d.id}`]
                                                    if (!lessen || lessen.length === 0) {
                                                        return <td key={d.id} className="text-center"><div className="mx-auto h-9 rounded-md border border-dashed border-overlay/20" /></td>
                                                    }
                                                    const dg = diepste(lessen) || 'onbekend'
                                                    const isSel = geselecteerd && geselecteerd.k.id === k.id && geselecteerd.d.id === d.id
                                                    return (
                                                        <td key={d.id} className="text-center">
                                                            <button
                                                                onClick={() => setGeselecteerd({ k, d, lessen })}
                                                                className={`w-full h-9 rounded-md text-xs font-semibold transition-all ${CEL_STIJL[dg]} ${isSel ? 'ring-2 ring-offset-1 ring-primary ring-offset-bg-surface' : 'hover:opacity-80'}`}
                                                                title={`${lessen.length} les${lessen.length !== 1 ? 'sen' : ''} — ${dg}`}
                                                            >
                                                                {lessen.length}
                                                            </button>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Detail van geselecteerde cel */}
                    {geselecteerd && (
                        <div className="card p-4 mt-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">{geselecteerd.k.vakgebied} · {geselecteerd.k.code} — {geselecteerd.d.naam}</p>
                                    <p className="text-xs text-text-muted">{geselecteerd.k.omschrijving}</p>
                                </div>
                                <button onClick={() => setGeselecteerd(null)} className="p-1 text-text-muted hover:text-text-primary flex-shrink-0" aria-label="Sluiten"><X size={16} /></button>
                            </div>
                            <ul className="space-y-1.5">
                                {geselecteerd.lessen.map(les => (
                                    <li key={les.lesplanId}>
                                        <Link to={`/lesplannen/${les.lesplanId}`} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors">
                                            <GraduationCap size={15} className="text-primary flex-shrink-0" />
                                            <span className="flex-1">{les.titel}</span>
                                            {les.diepgang && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CEL_STIJL[les.diepgang]}`}>{les.diepgang}</span>}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
