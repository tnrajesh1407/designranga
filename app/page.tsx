'use client'

import { useState, useRef, useCallback } from 'react'
import { FESTIVALS, LANGUAGES, STYLES, CATEGORIES, PRICES } from '@/lib/constants'
import {
  ProductDetails,
  GeneratedCopy,
  UploadStep,
  AppStage,
  Festival,
  Language,
  Style,
  Category,
} from '@/types'

const UPLOAD_STEPS = [
  { key: 'processing-image',  label: 'Processing Image' },
  { key: 'generating-copy',   label: 'Generating SEO Copy' },
  { key: 'uploading-preview', label: 'Uploading Preview' },
  { key: 'creating-product',  label: 'Creating Product' },
  { key: 'attaching-zip',     label: 'Attaching Download' },
  { key: 'done',              label: 'Published!' },
]

function StepIndicator({ currentStep }: { currentStep: UploadStep }) {
  return (
    <div className="space-y-2">
      {UPLOAD_STEPS.map((step, i) => {
        const keys = UPLOAD_STEPS.map(s => s.key)
        const current = keys.indexOf(currentStep)
        const isDone = current > i || currentStep === 'done'
        const isActive = currentStep === step.key
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              ${isDone ? 'bg-green-500 text-white' :
                isActive ? 'bg-orange-500 text-white animate-pulse' :
                'bg-gray-800 text-gray-600'}`}>
              {isDone ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${isDone ? 'text-green-400' : isActive ? 'text-white font-medium' : 'text-gray-600'}`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Select({ label, value, onChange, options, grouped = false }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; group?: string }[]
  grouped?: boolean
}) {
  const cls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none'
  const lbl = <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
  if (grouped) {
    const groups = [...new Set(options.map(o => o.group))]
    return (
      <div>
        {lbl}
        <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
          <option value="">Select {label}</option>
          {groups.map(g => (
            <optgroup key={g} label={g || ''}>
              {options.filter(o => o.group === g).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    )
  }
  return (
    <div>
      {lbl}
      <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function EditableField({ label, value, onChange, multiline = false, mono = false }: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  mono?: boolean
}) {
  const cls = `w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors ${mono ? 'font-mono text-xs' : ''}`
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} className={cls + ' resize-none'} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className={cls} />}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function AdminPage() {
  const [appStage, setAppStage] = useState<AppStage>('prompt')

  const [prompt, setPrompt] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('') // returned by backend, editable
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [genError, setGenError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const [festival, setFestival] = useState<Festival | ''>('')
  const [language, setLanguage] = useState<Language | ''>('')
  const [style, setStyle] = useState<Style | ''>('')
  const [category, setCategory] = useState<Category | ''>('')
  const [price, setPrice] = useState('99')
  const mode = 'social'

  const [copy, setCopy] = useState<GeneratedCopy | null>(null)
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)

  const [currentStep, setCurrentStep] = useState<UploadStep>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ productId: number; productUrl: string; editUrl: string } | null>(null)

  // ── Step 1: Generate image via Replicate ──────────────────────────────────

  const handleGenerateImage = async () => {
    if (!prompt.trim()) { setGenError('Enter a prompt first'); return }
    setIsGeneratingImage(true); setGenError(''); setAppStage('generating')
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          // On regenerate, send the (possibly edited) enhanced prompt so
          // the backend skips re-enhancement and generates directly from it
          ...(enhancedPrompt.trim() ? { enhancedPrompt } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const dataUrl = `data:image/jpeg;base64,${data.imageBase64}`
      setImagePreviewUrl(dataUrl)
      setImageBase64(data.imageBase64)
      const blob = await (await fetch(dataUrl)).blob()
      setImageFile(new File([blob], 'ai-generated.jpg', { type: 'image/jpeg' }))
      // Store the enhanced prompt returned by the backend
      if (data.enhancedPrompt) setEnhancedPrompt(data.enhancedPrompt)
      setAppStage('review')
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Image generation failed')
      setAppStage('prompt')
    } finally { setIsGeneratingImage(false) }
  }

  const handleRegenerate = () => {
    setImagePreviewUrl(''); setImageBase64(''); setImageFile(null)
    setCopy(null); setCurrentStep('idle'); setError(''); setResult(null)
    // Keep prompt + enhancedPrompt so user can edit and regenerate
    setAppStage('prompt')
  }

  const handleApproveImage = () => setAppStage('details')

  // ── Manual upload fallback ────────────────────────────────────────────────

  const handleImageFile = useCallback((file: File) => {
    setImageFile(file); setImagePreviewUrl(URL.createObjectURL(file))
    setCopy(null); setResult(null); setCurrentStep('idle'); setError('')
    const reader = new FileReader()
    reader.onload = e => setImageBase64((e.target?.result as string).split(',')[1])
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleImageFile(file)
  }, [handleImageFile])

  // ── Image helpers ─────────────────────────────────────────────────────────

  const resizeImageForClaude = useCallback((base64: string): Promise<string> => {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
      }
      img.src = `data:image/jpeg;base64,${base64}`
    })
  }, [])

  const prepareImageForUpload = useCallback((file: File): Promise<{ base64: string; fileName: string }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 4096
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve({
          base64: canvas.toDataURL('image/jpeg', 0.92).split(',')[1],
          fileName: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
        })
      }
      img.onerror = reject; img.src = url
    })
  }, [])

  // ── Step 3: Generate SEO copy ─────────────────────────────────────────────

  const handleGenerateCopy = async () => {
    if (!imageBase64 || !festival || !language || !category) {
      setError('Fill Festival, Language, and Category first'); return
    }
    setIsGeneratingCopy(true); setError('')
    try {
      const details = { festival, language, style, category, price, imageFile, imageBase64, imageName: imageFile?.name || 'ai-generated.jpg',
        originalPrompt: prompt,
        enhancedPrompt: enhancedPrompt || undefined,
      } as ProductDetails
      const smallBase64 = await resizeImageForClaude(imageBase64)
      const res = await fetch('/api/generate-copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details, imageBase64: smallBase64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCopy(data.copy)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate copy')
    } finally { setIsGeneratingCopy(false) }
  }

  // ── Step 4: Publish ───────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (!copy || !imageFile) { setError('Generate SEO copy first'); return }
    setError(''); setResult(null)
    try {
      setCurrentStep('processing-image')
      const { base64: uploadBase64, fileName: uploadFileName } = await prepareImageForUpload(imageFile)
      const formData = new FormData()
      const imageBlob = new Blob([Uint8Array.from(atob(uploadBase64), c => c.charCodeAt(0))], { type: 'image/jpeg' })
      formData.append('image', imageBlob, uploadFileName)
      formData.append('copy', JSON.stringify(copy))
      formData.append('fileName', uploadFileName)
      formData.append('price', price)
      formData.append('categorySlug', category)
      formData.append('mode', mode)

      const uploadRes = await fetch('/api/upload-product', { method: 'POST', body: formData })
      setCurrentStep('uploading-preview')

      const rawText = await uploadRes.text()
      let uploadData: Record<string, unknown>
      try { uploadData = JSON.parse(rawText) }
      catch { throw new Error(`Server error (${uploadRes.status}): ${rawText.slice(0, 120)}`) }
      if (!uploadRes.ok) throw new Error((uploadData.error as string) ?? `Upload failed (${uploadRes.status})`)

      setCurrentStep('creating-product')
      await new Promise(r => setTimeout(r, 300))
      setCurrentStep('attaching-zip')
      await new Promise(r => setTimeout(r, 300))
      setCurrentStep('done')
      setResult({ productId: uploadData.productId as number, productUrl: uploadData.productUrl as string, editUrl: uploadData.editUrl as string })
    } catch (err: unknown) {
      setCurrentStep('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const resetAll = () => {
    setPrompt(''); setEnhancedPrompt(''); setAspectRatio('1:1')
    setImageFile(null); setImagePreviewUrl(''); setImageBase64('')
    setFestival(''); setLanguage(''); setStyle(''); setCategory(''); setPrice('99')
    setCopy(null); setCurrentStep('idle'); setError(''); setResult(null); setGenError('')
    setAppStage('prompt')
  }

  const canPublish = copy && imageBase64 && festival && language && category
  const isUploading = !['idle', 'done', 'error'].includes(currentStep)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            <span className="text-orange-400">designranga</span>
            <span className="text-gray-500 font-normal ml-2">/ Admin</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Product Upload Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {(['prompt', 'review', 'details'] as const).map(stage => {
              const labels = { prompt: '1. Generate', review: '2. Review', details: '3. Publish' }
              const isDone = (appStage === 'details' && stage !== 'details') || (appStage === 'review' && stage === 'prompt')
              const isActive = appStage === stage || (appStage === 'generating' && stage === 'prompt')
              return (
                <span key={stage} className={`px-2 py-1 rounded-lg ${isDone ? 'text-green-400' : isActive ? 'bg-orange-500/20 text-orange-400 font-medium' : 'text-gray-600'}`}>
                  {labels[stage]}
                </span>
              )
            })}
          </div>
          <a href="https://designranga.com/wp-admin" target="_blank" rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-orange-400 transition-colors">WP Admin →</a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Stage 1: Prompt ─────────────────────────────────────────── */}
        {(appStage === 'prompt' || appStage === 'generating') && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Generate Image with AI</h2>
                <p className="text-xs text-gray-500">Describe your design — nano-banana (Gemini 2.5 Flash) will create it.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Prompt</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerateImage() }}
                  placeholder="e.g. Vibrant Holi celebration — colorful powder clouds, flowers, rangoli patterns. No text. Digital poster style."
                  rows={3} disabled={isGeneratingImage}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none disabled:opacity-50" />
                <p className="text-xs text-gray-600 mt-1">Ctrl+Enter to generate</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Aspect Ratio</label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={isGeneratingImage}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none disabled:opacity-50">
                    {[
                      { value: '1:1',  label: '1:1 — Square' },
                      { value: '3:4',  label: '3:4 — Portrait' },
                      { value: '4:3',  label: '4:3 — Landscape' },
                      { value: '9:16', label: '9:16 — Story' },
                      { value: '16:9', label: '16:9 — Banner' },
                    ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleGenerateImage} disabled={isGeneratingImage || !prompt.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                    {isGeneratingImage ? <><Spinner /><span>Generating...</span></> : <><span>✨</span><span>Generate Image</span></>}
                  </button>
                </div>
              </div>
              {isGeneratingImage && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1"><Spinner />
                    <span className="text-orange-400 text-sm font-medium">nano-banana is generating…</span>
                  </div>
                  <p className="text-gray-500 text-xs">Usually 10–20 seconds</p>
                </div>
              )}
              {genError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-sm font-medium">Error</p>
                  <p className="text-gray-400 text-xs mt-1">{genError}</p>
                </div>
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-1.5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tips</p>
              <p className="text-xs text-gray-600">• Describe visuals only — colors, patterns, style, mood</p>
              <p className="text-xs text-gray-600">• End with &quot;No text in image&quot; to prevent script hallucination</p>
              <p className="text-xs text-gray-600">• Add text overlays manually after approval using an image editor</p>
            </div>
          </div>
        )}

        {/* ── Stage 2: Review ─────────────────────────────────────────── */}
        {appStage === 'review' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white mb-1">Review Generated Image</h2>
                  <p className="text-xs text-gray-500">Approve to continue, or regenerate with a refined prompt.</p>
                </div>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg font-medium">nano-banana</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt="AI generated" className="w-full object-contain max-h-[480px]" />
              </div>

              {/* Original prompt — read-only */}
              <div className="bg-gray-800/40 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">Your prompt:</p>
                <p className="text-sm text-gray-300">{prompt}</p>
              </div>

              {/* Enhanced prompt — editable; sent on next regenerate to skip re-enhancement */}
              {enhancedPrompt && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Enhanced prompt
                      <span className="ml-2 text-gray-600 normal-case font-normal">— edit &amp; regenerate to refine</span>
                    </p>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-lg">AI enhanced</span>
                  </div>
                  <textarea
                    value={enhancedPrompt}
                    onChange={e => setEnhancedPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-200 text-xs focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleRegenerate}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  <span>↺</span><span>Regenerate</span>
                </button>
                <button onClick={handleApproveImage}
                  className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  <span>✓</span><span>Approve &amp; Continue</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stage 3: Details + SEO + Publish ────────────────────────── */}
        {appStage === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left */}
            <div className="lg:col-span-1 space-y-4">
              <div onClick={() => fileInputRef.current?.click()} onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)}
                className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden aspect-square
                  ${isDragging ? 'border-orange-400 bg-orange-500/10' : 'border-gray-700'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt="Product image" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                  <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">Replace image</span>
                </div>
                <div className="absolute top-2 left-2 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-lg font-medium">✓ Approved</div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-300">Product Details</h2>
                <Select label="Festival / Occasion" value={festival} onChange={v => setFestival(v as Festival)} options={FESTIVALS} grouped />
                <Select label="Language" value={language} onChange={v => setLanguage(v as Language)} options={LANGUAGES} />
                <Select label="Style" value={style} onChange={v => setStyle(v as Style)} options={STYLES} />
                <Select label="Category" value={category} onChange={v => setCategory(v as Category)} options={CATEGORIES} />
                <Select label="Price" value={price} onChange={v => setPrice(v)} options={PRICES} />
                <div className="bg-gray-800/50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-500">📦 WhatsApp, Instagram, Facebook, Story, Twitter/X, Web + Print 300DPI</p>
                </div>
              </div>

              <button onClick={handleGenerateCopy}
                disabled={isGeneratingCopy || !imageBase64 || !festival || !language || !category}
                className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {isGeneratingCopy ? <><Spinner /><span>Claude is writing...</span></> : <><span>✨</span><span>Generate SEO Copy</span></>}
              </button>
            </div>

            {/* Middle */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-300">SEO Copy</h2>
                  {copy && <button onClick={handleGenerateCopy} disabled={isGeneratingCopy}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors">Regenerate</button>}
                </div>
                {!copy ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                    <svg className="w-8 h-8 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-sm">Fill details &amp; click</p>
                    <p className="text-sm text-orange-400 font-medium mt-1">Generate SEO Copy</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[620px] pr-1">
                    <EditableField label="Product Title" value={copy.title} onChange={v => setCopy({ ...copy, title: v })} />
                    <EditableField label="Short Description" value={copy.shortDescription} onChange={v => setCopy({ ...copy, shortDescription: v })} multiline />
                    <EditableField label="Meta Description" value={copy.metaDescription} onChange={v => setCopy({ ...copy, metaDescription: v })} multiline />
                    <EditableField label="URL Slug" value={copy.slug} onChange={v => setCopy({ ...copy, slug: v })} mono />
                    <EditableField label="Focus Keyword" value={copy.focusKeyword} onChange={v => setCopy({ ...copy, focusKeyword: v })} />
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Tags ({copy.tags.length})</label>
                      <div className="flex flex-wrap gap-1.5">
                        {copy.tags.map((tag, i) => (
                          <span key={i} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                            {tag}
                            <button onClick={() => setCopy({ ...copy, tags: copy.tags.filter((_, j) => j !== i) })}
                              className="text-gray-600 hover:text-gray-300 ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <EditableField label="Full Description (HTML)" value={copy.fullDescription} onChange={v => setCopy({ ...copy, fullDescription: v })} multiline mono />
                  </div>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">Publish to WooCommerce</h2>
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Image approved',     done: true },
                    { label: 'Festival selected',  done: !!festival },
                    { label: 'Language selected',  done: !!language },
                    { label: 'Category selected',  done: !!category },
                    { label: 'SEO copy generated', done: !!copy },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${item.done ? 'bg-green-500' : 'bg-gray-800'}`}>
                        {item.done ? '✓' : ''}
                      </div>
                      <span className={`text-xs ${item.done ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {currentStep === 'done' ? (
                  <div className="space-y-3">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                      <p className="text-green-400 text-sm font-semibold">✅ Published!</p>
                      <p className="text-gray-400 text-xs mt-1">Product #{result?.productId} is live</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a href={result?.productUrl} target="_blank" rel="noopener noreferrer"
                        className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium py-2 rounded-xl text-center transition-colors">View Product →</a>
                      <a href={result?.editUrl} target="_blank" rel="noopener noreferrer"
                        className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium py-2 rounded-xl text-center transition-colors">Edit in WP →</a>
                    </div>
                    <button onClick={resetAll}
                      className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                      Upload Another Product
                    </button>
                  </div>
                ) : (
                  <button onClick={handlePublish} disabled={!canPublish || isUploading}
                    className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {isUploading ? <><Spinner /><span>Publishing...</span></> : <><span>🚀</span><span>Publish to designranga.com</span></>}
                  </button>
                )}
              </div>

              {!['idle', 'done'].includes(currentStep) && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Progress</h3>
                  <StepIndicator currentStep={currentStep} />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-sm font-medium">Error</p>
                  <p className="text-gray-400 text-xs mt-1">{error}</p>
                </div>
              )}

              <button onClick={handleRegenerate}
                className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white text-xs font-medium py-2.5 rounded-xl transition-colors">
                ← Back to prompt
              </button>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Tips</h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <p>• Always review &amp; edit copy before publishing</p>
                  <p>• Telugu script in title boosts regional SEO</p>
                  <p>• ₹99 sweet spot for individual images</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
