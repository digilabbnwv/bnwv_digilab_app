import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { getMateriaalaItemById } from '../lib/materiaal'
import { LaadIndicator } from '../components/UI'
import { Printer, ArrowLeft } from 'lucide-react'

/**
 * Printbare A6-kaart (landschap) voor op de fysieke opslagbox van een materiaal-item.
 * Opent als losse pagina (geen app-chrome) zodat 'm print-only stylesheet de pagina
 * exact op A6-formaat kan zetten via @page.
 */
export default function MateriaalKaartPrint() {
    const { id } = useParams()
    const [item, setItem] = useState(null)
    const [qrSvg, setQrSvg] = useState('')
    const [loading, setLoading] = useState(true)
    const [fout, setFout] = useState('')

    useEffect(() => {
        getMateriaalaItemById(id)
            .then(async (data) => {
                setItem(data)
                const url = `${window.location.origin}${import.meta.env.BASE_URL}item/${data.qr_code}`
                const svg = await QRCode.toString(url, {
                    type: 'svg', margin: 0, color: { dark: '#0B1220', light: '#FFFFFF' },
                })
                setQrSvg(svg)
            })
            .catch(() => setFout('Item niet gevonden'))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return <div className="min-h-dvh flex items-center justify-center bg-white"><LaadIndicator /></div>
    }
    if (fout || !item) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-white text-slate-500">
                <p>{fout || 'Item niet gevonden'}</p>
                <Link to="/materiaal" className="text-sm text-primary flex items-center gap-1.5">
                    <ArrowLeft size={14} /> Terug naar materiaaloverzicht
                </Link>
            </div>
        )
    }

    return (
        <div className="kaart-pagina">
            <style>{`
                .kaart-pagina {
                    min-height: 100dvh; background: #e2e8f0; display: flex; flex-direction: column;
                    align-items: center; gap: 20px; padding: 24px 16px; font-family: 'Inter', system-ui, sans-serif;
                }
                .kaart-toolbar { display: flex; align-items: center; gap: 12px; }
                .kaart {
                    width: 148mm; height: 105mm; background: #ffffff; color: #0f172a;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.15); border-radius: 4mm;
                    padding: 6mm; box-sizing: border-box; display: flex; gap: 5mm; flex-shrink: 0;
                }
                .kaart-links { flex: 1; min-width: 0; display: flex; flex-direction: column; }
                .kaart-rechts {
                    width: 36mm; flex-shrink: 0; display: flex; flex-direction: column;
                    align-items: center; justify-content: flex-start; gap: 3mm; text-align: center;
                }
                .kaart-logo { width: 32mm; height: 32mm; object-fit: contain; }
                .kaart-qr-wrap {
                    margin-top: auto; display: flex; flex-direction: column;
                    align-items: center; gap: 1.5mm;
                }
                .kaart-qr { width: 32mm; height: 32mm; }
                .kaart-qr svg { width: 100%; height: 100%; display: block; }
                .kaart-qr-label { font-size: 7.5pt; color: #64748b; line-height: 1.2; }
                .kaart-naam { font-size: 16pt; font-weight: 800; line-height: 1.15; margin: 0 0 1mm; }
                .kaart-sub { font-size: 10pt; color: #475569; margin: 0 0 3mm; }
                .kaart-meta { font-size: 10pt; color: #1e293b; display: flex; flex-wrap: wrap; gap: 1mm 4mm; margin-bottom: 2.5mm; }
                .kaart-meta b { color: #0f172a; }
                .kaart-labels { display: flex; flex-wrap: wrap; gap: 1mm; margin-bottom: 2.5mm; }
                .kaart-label-chip {
                    font-size: 8.5pt; padding: 0.5mm 2mm; border-radius: 3mm;
                    background: #fef3e8; color: #b45309; border: 0.2mm solid #fcd9ae;
                }
                .kaart-inhoud-titel {
                    font-size: 8.5pt; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 0.03em; color: #64748b; margin: 0 0 1mm;
                }
                .kaart-inhoud-tekst {
                    font-size: 9pt; color: #334155; line-height: 1.35;
                    white-space: pre-line; overflow: hidden; flex: 1;
                }
                .kaart-code {
                    font-size: 8.5pt; font-family: 'SFMono-Regular', Consolas, monospace;
                    color: #b45309; margin-top: auto; padding-top: 1mm;
                }

                @media print {
                    @page { size: 148mm 105mm; margin: 0; }
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    .kaart-pagina { padding: 0; gap: 0; background: #fff; min-height: 0; }
                    .kaart { box-shadow: none; border-radius: 0; }
                }
            `}</style>

            <div className="kaart-toolbar no-print">
                <Link to={`/item/${item.qr_code}`} replace className="btn-ghost py-2 px-4 text-sm flex items-center gap-1.5">
                    <ArrowLeft size={15} /> Terug
                </Link>
                <button onClick={() => window.print()} className="btn-primary py-2 px-5 text-sm flex items-center gap-2">
                    <Printer size={16} /> Printen / opslaan als pdf
                </button>
            </div>

            <div className="kaart">
                <div className="kaart-links">
                    <p className="kaart-naam">{item.naam}</p>
                    {(item.type || item.merk) && (
                        <p className="kaart-sub">{[item.type, item.merk].filter(Boolean).join(' · ')}</p>
                    )}

                    <div className="kaart-meta">
                        {item.aantal != null && <span>Aantal: <b>{item.aantal}x</b></span>}
                        {item.standaard_locatie && <span>Locatie: <b>{item.standaard_locatie}</b></span>}
                    </div>

                    {item.labels?.length > 0 && (
                        <div className="kaart-labels">
                            {item.labels.map(l => (
                                <span key={l.id} className="kaart-label-chip">{l.naam}</span>
                            ))}
                        </div>
                    )}

                    {item.inhoud && (
                        <>
                            <p className="kaart-inhoud-titel">Inhoud / onderdelen</p>
                            <p className="kaart-inhoud-tekst">{item.inhoud}</p>
                        </>
                    )}

                    <p className="kaart-code">{item.qr_code}</p>
                </div>

                <div className="kaart-rechts">
                    <img src="/bnwv_digilab_app/logo-bnwv.png" alt="Bibliotheek Noordwest Veluwe" className="kaart-logo" />
                    <div className="kaart-qr-wrap">
                        <div className="kaart-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                        <p className="kaart-qr-label">Scan om naar de app te gaan</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
