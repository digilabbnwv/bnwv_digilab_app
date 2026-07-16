import React, { useEffect, useState } from 'react'
import { getAllLabels } from '../lib/labels'
import { Tag } from 'lucide-react'

export default function LabelMultiSelect({ selectedIds, onChange, disabled }) {
    const [labels, setLabels] = useState([])

    useEffect(() => {
        getAllLabels().then(setLabels).catch(console.error)
    }, [])

    const toggle = (id) => {
        if (disabled) return
        onChange(selectedIds.includes(id)
            ? selectedIds.filter(i => i !== id)
            : [...selectedIds, id])
    }

    if (labels.length === 0) return null

    return (
        <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
                <Tag size={14} className="inline mr-1.5 -mt-0.5" />Labels
            </label>
            <div className="flex flex-wrap gap-2">
                {labels.map(label => {
                    const actief = selectedIds.includes(label.id)
                    return (
                        <button
                            key={label.id}
                            type="button"
                            onClick={() => toggle(label.id)}
                            disabled={disabled}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${actief ? 'text-white' : 'bg-bg-app border-overlay/10 text-text-muted hover:text-text-secondary'
                                }`}
                            style={actief ? { backgroundColor: label.kleur || '#64748B', borderColor: label.kleur || '#64748B' } : undefined}
                        >
                            {label.naam}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
