import React from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, children, onClose, size = 'md' }) {
    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-xl',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full ${sizes[size]} bg-bg-surface rounded-t-2xl sm:rounded-2xl border border-overlay/10 shadow-2xl animate-slideUp sm:animate-fadeIn`}>
                {/* Handle (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 bg-overlay/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-overlay/10">
                    <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-overlay/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
