import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    getAlleReserveringen, getMijnReserveringen,
    maakReservering, annuleerReservering, exporteerICS,
} from '../lib/reserveringen'
import { getAllMateriaal } from '../lib/materiaal'
import { LaadIndicator } from '../components/UI'
import Modal from '../components/Modal'
import {
    ChevronLeft, ChevronRight, Plus, Calendar,
    Package, User, Trash2, Download, Info,
} from 'lucide-react'

// ── Datum hulpfuncties ───────────────────────────────────────────

const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MAANDEN = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
]

function dagenInMaand(jaar, maand) {
    return new Date(jaar, maand + 1, 0).getDate()
}

function eersteDagVanMaand(jaar, maand) {
    // 0=Zo, 1=Ma ... zet om naar Ma=0
    const dag = new Date(jaar, maand, 1).getDay()
    return dag === 0 ? 6 : dag - 1
}

function formatDatum(isoDate) {
    if (!isoDate) return ''
    const [j, m, d] = isoDate.split('-')
    return `${d}-${m}-${j}`
}

function vandaagStr() {
    return new Date().toISOString().slice(0, 10)
}

function datumRange(van, tot) {
    const days = []
    const cur = new Date(van)
    const end = new Date(tot)
    while (cur <= end) {
        days.push(cur.toISOString().slice(0, 10))
        cur.setDate(cur.getDate() + 1)
    }
    return days
}

// ── Kleur per item ───────────────────────────────────────────────

const KLEUREN = [
    'bg-primary/70', 'bg-accent/70', 'bg-emerald-500/70',
    'bg-amber-500/70', 'bg-rose-500/70', 'bg-sky-500/70', 'bg-violet-500/70',
]
function kleurVoorItem(itemId, items) {
    const idx = items.findIndex(i => i.id === itemId)
    return KLEUREN[idx % KLEUREN.length] || KLEUREN[0]
}

// ── Hoofd component ──────────────────────────────────────────────

export default function ReserverenPagina() {
    const { medewerker } = useAuth()
    const [reserveringen, setReserveringen] = useState([])
    const [alleItems, setAlleItems] = useState([])
    const [loading, setLoading] = useState(true)

    // Kalender state
    const nu = new Date()
    const [jaar, setJaar] = useState(nu.getFullYear())
    const [maand, setMaand] = useState(nu.getMonth())
    const [gekozenDag, setGekozenDag] = useState(null)

    // Tab: kalender vs mijn reserveringen
    const [tab, setTab] = useState('kalender')

    // Nieuw reservering modal
    const [toonNieuw, setToonNieuw] = useState(false)
    const [nieuwForm, setNieuwForm] = useState({
        materiaalId: '', vanDatum: vandaagStr(), totDatum: vandaagStr(), toelichting: '',
    })
    const [nieuwLoading, setNieuwLoading] = useState(false)
    const [nieuwFout, setNieuwFout] = useState('')

    const laad = useCallback(async () => {
        setLoading(true)
        try {
            const [res, items] = await Promise.all([getAlleReserveringen(), getAllMateriaal()])
            setReserveringen(res)
            setAlleItems(items)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { laad() }, [laad])

    // Bouw kalender: dagcellen met bijhorende reserveringen
    const aantalDagen = dagenInMaand(jaar, maand)
    const eersteOffset = eersteDagVanMaand(jaar, maand)

    // Bouw een map: datum → lijst reserveringen
    const dagMap = {}
    reserveringen.forEach(r => {
        datumRange(r.van_datum, r.tot_datum).forEach(d => {
            if (!dagMap[d]) dagMap[d] = []
            dagMap[d].push(r)
        })
    })

    // Reserveringen voor de gekozen dag of de hele maand
    const geselecteerdeRes = gekozenDag
        ? (dagMap[gekozenDag] || [])
        : reserveringen.filter(r => {
            const maandStr = `${jaar}-${String(maand + 1).padStart(2, '0')}`
            return r.van_datum.startsWith(maandStr) || r.tot_datum.startsWith(maandStr) ||
                (r.van_datum < maandStr + '-01' && r.tot_datum > maandStr + '-31')
        })

    // Mijn reserveringen
    const mijnRes = reserveringen.filter(r => r.medewerker?.id === medewerker.id)

    const vorigeMaand = () => {
        if (maand === 0) { setMaand(11); setJaar(j => j - 1) }
        else setMaand(m => m - 1)
        setGekozenDag(null)
    }
    const volgendeMaand = () => {
        if (maand === 11) { setMaand(0); setJaar(j => j + 1) }
        else setMaand(m => m + 1)
        setGekozenDag(null)
    }

    const naarVandaag = () => {
        const n = new Date()
        setJaar(n.getFullYear()); setMaand(n.getMonth())
        setGekozenDag(vandaagStr())
    }

    // Nieuw reservering opslaan
    const handleNieuwOpslaan = async () => {
        if (!nieuwForm.materiaalId) return setNieuwFout('Kies een product')
        if (!nieuwForm.vanDatum || !nieuwForm.totDatum) return setNieuwFout('Kies van- en tot-datum')
        if (nieuwForm.vanDatum > nieuwForm.totDatum) return setNieuwFout('Van-datum moet vóór tot-datum liggen')
        setNieuwLoading(true); setNieuwFout('')
        try {
            await maakReservering({
                materiaalId: nieuwForm.materiaalId,
                medewerkerId: medewerker.id,
                vanDatum: nieuwForm.vanDatum,
                totDatum: nieuwForm.totDatum,
                toelichting: nieuwForm.toelichting,
            })
            setToonNieuw(false)
            setNieuwForm({ materiaalId: '', vanDatum: vandaagStr(), totDatum: vandaagStr(), toelichting: '' })
            await laad()
        } catch (err) {
            setNieuwFout(err.message || 'Opslaan mislukt')
        } finally {
            setNieuwLoading(false)
        }
    }

    // Annuleer reservering
    const handleAnnuleer = async (r) => {
        if (!confirm(`Reservering voor "${r.materiaal?.naam}" annuleren?`)) return
        try {
            await annuleerReservering(r.id, medewerker.id)
            await laad()
        } catch (err) { console.error(err) }
    }

    // ICS download
    const handleICSDownload = () => {
        const tekst = exporteerICS(reserveringen)
        const blob = new Blob([tekst], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'digilab-reserveringen.ics'; a.click()
        URL.revokeObjectURL(url)
    }

    const vandaag = vandaagStr()

    return (
        <div className="app-container pt-8 pb-4 animate-fadeIn">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Reserveren</h1>
                    <p className="text-text-muted text-sm mt-0.5">{reserveringen.length} actieve reservering{reserveringen.length !== 1 ? 'en' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleICSDownload}
                        className="btn-ghost p-2.5"
                        title="Download als .ics (agenda-import)"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={() => setToonNieuw(true)}
                        className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                    >
                        <Plus size={16} /> Reserveer
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-bg-surface rounded-xl p-1 mb-5 border border-white/10">
                {[
                    { key: 'kalender', label: '📅 Kalender' },
                    { key: 'mijn', label: `👤 Mijn (${mijnRes.length})` },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === key
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {loading ? <LaadIndicator /> : tab === 'kalender' ? (
                <>
                    {/* Maand navigatie */}
                    <div className="card p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={vorigeMaand} className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="text-center">
                                <p className="font-semibold text-text-primary">{MAANDEN[maand]} {jaar}</p>
                                <button onClick={naarVandaag} className="text-xs text-primary hover:text-primary-end transition-colors">
                                    Vandaag
                                </button>
                            </div>
                            <button onClick={volgendeMaand} className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Dag-headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAGEN.map(d => (
                                <div key={d} className="text-center text-xs font-medium text-text-muted py-1">{d}</div>
                            ))}
                        </div>

                        {/* Dag-cellen */}
                        <div className="grid grid-cols-7 gap-0.5">
                            {/* Lege cellen voor offset */}
                            {Array.from({ length: eersteOffset }).map((_, i) => (
                                <div key={`leeg-${i}`} />
                            ))}

                            {/* Dag-nummers */}
                            {Array.from({ length: aantalDagen }).map((_, i) => {
                                const dagNum = i + 1
                                const dagStr = `${jaar}-${String(maand + 1).padStart(2, '0')}-${String(dagNum).padStart(2, '0')}`
                                const isVandaag = dagStr === vandaag
                                const isGekozen = dagStr === gekozenDag
                                const dagRes = dagMap[dagStr] || []
                                const heeftReserv = dagRes.length > 0

                                return (
                                    <button
                                        key={dagNum}
                                        onClick={() => setGekozenDag(isGekozen ? null : dagStr)}
                                        className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all min-h-[44px] ${isGekozen
                                                ? 'bg-primary text-white'
                                                : isVandaag
                                                    ? 'bg-primary/15 text-primary font-bold'
                                                    : 'hover:bg-bg-hover text-text-secondary'
                                            }`}
                                    >
                                        <span className="text-sm leading-none">{dagNum}</span>
                                        {/* Gekleurde puntjes per reservering */}
                                        {heeftReserv && (
                                            <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                                                {dagRes.slice(0, 3).map(r => (
                                                    <div
                                                        key={r.id}
                                                        className={`w-1.5 h-1.5 rounded-full ${isGekozen ? 'bg-white/80' : kleurVoorItem(r.materiaal_id, alleItems)}`}
                                                    />
                                                ))}
                                                {dagRes.length > 3 && (
                                                    <span className={`text-[9px] font-bold ${isGekozen ? 'text-white/70' : 'text-text-muted'}`}>
                                                        +{dagRes.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Legenda */}
                    {alleItems.length > 0 && reserveringen.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {[...new Set(reserveringen.map(r => r.materiaal_id))].map(id => {
                                const item = alleItems.find(i => i.id === id)
                                if (!item) return null
                                return (
                                    <div key={id} className="flex items-center gap-1.5 text-xs text-text-muted">
                                        <div className={`w-2.5 h-2.5 rounded-full ${kleurVoorItem(id, alleItems)}`} />
                                        {item.naam}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Reserveringen voor geselecteerde dag / maand */}
                    <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                            {gekozenDag
                                ? `${formatDatum(gekozenDag)} — ${geselecteerdeRes.length} reservering${geselecteerdeRes.length !== 1 ? 'en' : ''}`
                                : `Deze maand — ${geselecteerdeRes.length} reservering${geselecteerdeRes.length !== 1 ? 'en' : ''}`
                            }
                        </p>
                        <ReserveringLijst
                            reserveringen={geselecteerdeRes}
                            medewerker={medewerker}
                            alleItems={alleItems}
                            onAnnuleer={handleAnnuleer}
                        />
                    </div>
                </>
            ) : (
                /* Mijn reserveringen tab */
                <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                        Jouw aankomende reserveringen
                    </p>
                    {mijnRes.length === 0 ? (
                        <div className="card p-8 text-center">
                            <Calendar size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                            <p className="text-text-muted text-sm">Je hebt nog geen reserveringen</p>
                            <button onClick={() => setToonNieuw(true)} className="btn-primary mt-4 text-sm py-2">
                                Eerste reservering maken
                            </button>
                        </div>
                    ) : (
                        <ReserveringLijst
                            reserveringen={mijnRes}
                            medewerker={medewerker}
                            alleItems={alleItems}
                            onAnnuleer={handleAnnuleer}
                            toonAnnuleer
                        />
                    )}
                </div>
            )}

            {/* ICS tip */}
            <div className="mt-5 flex items-start gap-2 bg-bg-surface rounded-xl p-3 border border-white/10">
                <Info size={16} className="text-text-muted flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-muted leading-relaxed">
                    Via <Download size={11} className="inline" /> kun je reserveringen exporteren als .ics bestand voor import in elke agenda.
                    Toekomstig: automatische sync met de agenda van <span className="text-text-secondary">ictleskisten@bibliotheeknwveluwe.nl</span>.
                </p>
            </div>

            {/* Nieuw reservering modal */}
            {toonNieuw && (
                <Modal title="Nieuwe reservering" onClose={() => { setToonNieuw(false); setNieuwFout('') }} size="lg">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Product *</label>
                            <select
                                className="input"
                                value={nieuwForm.materiaalId}
                                onChange={e => setNieuwForm(f => ({ ...f, materiaalId: e.target.value }))}
                            >
                                <option value="">Kies een product...</option>
                                {alleItems.map(i => (
                                    <option key={i.id} value={i.id}>{i.naam} — {i.type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-text-secondary text-sm font-medium mb-2">Van datum *</label>
                                <input
                                    type="date"
                                    className="input"
                                    min={vandaagStr()}
                                    value={nieuwForm.vanDatum}
                                    onChange={e => setNieuwForm(f => ({
                                        ...f,
                                        vanDatum: e.target.value,
                                        totDatum: f.totDatum < e.target.value ? e.target.value : f.totDatum,
                                    }))}
                                />
                            </div>
                            <div>
                                <label className="block text-text-secondary text-sm font-medium mb-2">Tot datum *</label>
                                <input
                                    type="date"
                                    className="input"
                                    min={nieuwForm.vanDatum || vandaagStr()}
                                    value={nieuwForm.totDatum}
                                    onChange={e => setNieuwForm(f => ({ ...f, totDatum: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">Toelichting</label>
                            <textarea
                                className="input resize-none"
                                rows={3}
                                placeholder="Voor welke activiteit, school of gelegenheid?"
                                value={nieuwForm.toelichting}
                                onChange={e => setNieuwForm(f => ({ ...f, toelichting: e.target.value }))}
                            />
                        </div>

                        {nieuwFout && (
                            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                                {nieuwFout}
                            </div>
                        )}

                        <button
                            onClick={handleNieuwOpslaan}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                            disabled={nieuwLoading}
                        >
                            {nieuwLoading
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <><Calendar size={16} /> Reservering opslaan</>
                            }
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    )
}

// ── Reservering kaart component ─────────────────────────────────

function ReserveringLijst({ reserveringen, medewerker, alleItems, onAnnuleer, toonAnnuleer }) {
    if (reserveringen.length === 0) {
        return (
            <div className="card p-6 text-center">
                <Calendar size={28} className="mx-auto mb-2 text-text-muted opacity-30" />
                <p className="text-text-muted text-sm">Geen reserveringen</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {reserveringen.map(r => {
                const isMijn = r.medewerker?.id === medewerker.id
                const kleur = kleurVoorItem(r.materiaal_id, alleItems)
                return (
                    <div key={r.id} className={`card overflow-hidden border-l-2`} style={{ borderLeftColor: '' }}>
                        <div className={`h-1 w-full ${kleur}`} />
                        <div className="p-4 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                {/* Item naam */}
                                <Link
                                    to={`/item/${r.materiaal?.qr_code}`}
                                    className="font-semibold text-text-primary hover:text-primary transition-colors block truncate"
                                >
                                    {r.materiaal?.naam || 'Onbekend item'}
                                </Link>

                                {/* Datum range */}
                                <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-1.5">
                                    <Calendar size={13} className="flex-shrink-0" />
                                    {formatDatum(r.van_datum)}
                                    {r.van_datum !== r.tot_datum && <> → {formatDatum(r.tot_datum)}</>}
                                </p>

                                {/* Medewerker */}
                                <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                                    <User size={11} />
                                    {isMijn ? 'Jouw reservering' : r.medewerker?.naam || '—'}
                                </p>

                                {/* Toelichting */}
                                {r.toelichting && (
                                    <p className="text-xs text-text-muted mt-1 italic line-clamp-2">"{r.toelichting}"</p>
                                )}
                            </div>

                            {/* Annuleer knop (eigen reserveringen) */}
                            {(toonAnnuleer || isMijn) && (
                                <button
                                    onClick={() => onAnnuleer(r)}
                                    className="p-2 text-text-muted hover:text-error transition-colors flex-shrink-0"
                                    title="Annuleer reservering"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
