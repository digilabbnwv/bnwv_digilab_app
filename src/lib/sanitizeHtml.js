// Eenvoudige HTML-sanitizer voor de rich-text-velden.
// Interne tool (alleen beheerders schrijven), maar we blijven aan de veilige kant:
// verwijder scripts/handlers en onbekende tags en strip alle attributen.

const TOEGESTAAN = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'DIV', 'SPAN', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI'])

export function saneerHtml(html) {
    if (!html) return ''
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
    const root = doc.body.firstChild
    const loop = (node) => {
        for (const kind of [...node.childNodes]) {
            if (kind.nodeType !== 1) continue
            const tag = kind.tagName
            if (tag === 'SCRIPT' || tag === 'STYLE') {
                kind.remove()
            } else if (!TOEGESTAAN.has(tag)) {
                kind.replaceWith(...kind.childNodes)
            } else {
                for (const attr of [...kind.attributes]) kind.removeAttribute(attr.name)
                loop(kind)
            }
        }
    }
    loop(root)
    return root.innerHTML
}
