import React, { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { QrCode, CameraOff } from 'lucide-react'

/**
 * In-app QR-scanner. Gebruikt de native BarcodeDetector-API waar beschikbaar
 * (Chrome/Edge/Samsung Internet op Android), en valt anders terug op jsQR
 * (canvas-gebaseerd, werkt ook in Firefox en iOS Safari — die BarcodeDetector
 * niet ondersteunen). Alleen als getUserMedia zelf ontbreekt of geweigerd wordt
 * tonen we de instructie om de camera-app te gebruiken.
 *
 * @param {(waarde:string) => void} onDetect - aangeroepen met de gescande ruwe waarde
 */
export default function QrScanner({ onDetect }) {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const detectRef = useRef(onDetect)
    const gevondenRef = useRef(false)
    // init | scanning | unsupported | denied | error
    const [status, setStatus] = useState(
        () => (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) ? 'init' : 'unsupported'
    )

    useEffect(() => { detectRef.current = onDetect }, [onDetect])

    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return

        let cancelled = false
        let timer = null
        const barcodeDetector = (typeof window !== 'undefined' && 'BarcodeDetector' in window)
            ? new window.BarcodeDetector({ formats: ['qr_code'] })
            : null

        const stop = () => {
            cancelled = true
            if (timer) clearTimeout(timer)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop())
                streamRef.current = null
            }
        }

        const decodeMetBarcodeDetector = async () => {
            const codes = await barcodeDetector.detect(videoRef.current)
            return codes?.[0]?.rawValue ?? null
        }

        const decodeMetJsQR = () => {
            const video = videoRef.current
            if (!video || !video.videoWidth) return null
            const canvas = canvasRef.current
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(frame.data, frame.width, frame.height)
            return code?.data ?? null
        }

        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play().catch(() => {})
                }
                setStatus('scanning')
                scan()
            } catch (err) {
                if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') setStatus('denied')
                else setStatus('error')
            }
        }

        const scan = async () => {
            if (cancelled || gevondenRef.current || !videoRef.current) return
            try {
                const waarde = barcodeDetector ? await decodeMetBarcodeDetector() : decodeMetJsQR()
                if (waarde) {
                    gevondenRef.current = true
                    detectRef.current?.(waarde)
                    return
                }
            } catch { /* enkel-frame fout negeren, volgende poging */ }
            timer = setTimeout(scan, 250)
        }

        start()
        return stop
    }, [])

    if (status === 'scanning' || status === 'init') {
        return (
            <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {/* Richtkader */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-2/3 aspect-square border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                    </div>
                </div>
                <p className="text-text-secondary text-sm text-center">
                    Richt de camera op de QR-code op de leskist.
                </p>
            </div>
        )
    }

    // Fallback: camera-API niet beschikbaar, toegang geweigerd, of fout
    return (
        <div className="card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center mx-auto">
                <CameraOff size={28} className="text-text-muted" />
            </div>
            <div className="space-y-1">
                <h2 className="text-lg font-bold text-text-primary">
                    {status === 'denied' ? 'Geen toegang tot de camera' : 'Scannen niet beschikbaar'}
                </h2>
                <p className="text-text-secondary text-sm">
                    {status === 'denied'
                        ? 'Sta cameratoegang toe in je browser, of gebruik de camera-app van je telefoon.'
                        : 'Deze telefoon ondersteunt scannen in de app niet. Gebruik de camera-app van je telefoon.'}
                </p>
            </div>
            <div className="bg-bg-app rounded-xl p-4 text-left space-y-2">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode size={13} /> Zo werkt het
                </p>
                <p className="text-text-secondary text-sm">
                    Open de camera-app, richt op de QR-code en tik op de melding die verschijnt — die opent
                    automatisch de juiste materiaalpagina.
                </p>
            </div>
        </div>
    )
}
