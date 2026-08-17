/**
 * CSV-export voor rapportagetabellen. Bouwt een CSV-string uit kolomdefinities
 * en rijen, en start een download in de browser.
 *
 * @param {Array<{key: string, label: string}>} kolommen
 * @param {Array<Object>} rijen - objecten met velden overeenkomend met kolom.key
 * @param {string} bestandsnaam - zonder extensie
 */
export function exporteerCSV(kolommen, rijen, bestandsnaam = 'rapportage') {
    const escape = (waarde) => {
        const s = waarde == null ? '' : String(waarde)
        // Omwikkel met quotes als er een puntkomma, quote of newline in zit
        if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
    }

    const kop = kolommen.map(k => escape(k.label)).join(';')
    const body = rijen
        .map(rij => kolommen.map(k => escape(rij[k.key])).join(';'))
        .join('\n')
    // BOM zodat Excel UTF-8 (accenten) correct toont; puntkomma = NL-Excel scheidingsteken
    const csv = '﻿' + kop + '\n' + body

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${bestandsnaam}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
