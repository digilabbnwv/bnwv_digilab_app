import React, { useRef, useEffect } from 'react'
import { Bold, Italic, Table as TableIcon } from 'lucide-react'
import { saneerHtml } from '../lib/sanitizeHtml'

function ToolbarKnop({ icon, onClick, label }) {
    const Icon = icon
    return (
        <button
            type="button"
            onMouseDown={e => e.preventDefault()} // behoud selectie/focus in de editor
            onClick={onClick}
            title={label}
            aria-label={label}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
            <Icon size={15} />
        </button>
    )
}

export default function RichText({ value, onChange, minHeight = 80 }) {
    const ref = useRef(null)

    // Externe waarde alleen overschrijven als die echt anders is (voorkomt cursor-sprongen tijdens typen).
    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== (value || '')) {
            ref.current.innerHTML = value || ''
        }
    }, [value])

    const emit = () => onChange(ref.current?.innerHTML || '')

    const opmaak = (cmd) => {
        ref.current?.focus()
        try { document.execCommand('styleWithCSS', false, false) } catch { /* niet overal ondersteund */ }
        document.execCommand(cmd, false)
        emit()
    }

    const voegTabelToe = () => {
        ref.current?.focus()
        const tabel = '<table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>'
        document.execCommand('insertHTML', false, tabel)
        emit()
    }

    return (
        <div className="border border-overlay/20 rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-overlay/10 bg-overlay/5">
                <ToolbarKnop icon={Bold} onClick={() => opmaak('bold')} label="Vet" />
                <ToolbarKnop icon={Italic} onClick={() => opmaak('italic')} label="Cursief" />
                <span className="w-px h-4 bg-overlay/15 mx-1" />
                <ToolbarKnop icon={TableIcon} onClick={voegTabelToe} label="Tabel invoegen" />
            </div>
            <div
                ref={ref}
                contentEditable
                onInput={emit}
                onBlur={emit}
                className="rt-content px-4 py-3 text-base text-text-primary focus:outline-none"
                style={{ minHeight }}
                suppressContentEditableWarning
            />
        </div>
    )
}

export function RichTekstWeergave({ html, className = '' }) {
    if (!html) return null
    return <div className={`rt-render text-text-secondary ${className}`} dangerouslySetInnerHTML={{ __html: saneerHtml(html) }} />
}
