import { useState, useEffect, useMemo, useRef } from 'react'

interface Ramp {
  name: string
  value: string
}

const RAMPS: Ramp[] = [
  { name: 'Classic', value: '@%#*+=-:. ' },
  { name: 'Blocks', value: '█▓▒░ ' },
  { name: 'Inverted', value: ' .:-=+*#%@' },
  { name: 'Numbers', value: '0123456789 ' },
  { name: 'Morse', value: '—▄· ' },
  { name: 'Ultra detail', value: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkha*#MW&8%B@$' },
]

const CHAR_ASPECT = 0.5

function drawSample(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 480
  c.height = 240
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 480, 240)
  g.addColorStop(0, '#6366f1')
  g.addColorStop(0.5, '#a855f7')
  g.addColorStop(1, '#ef4444')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 480, 240)
  ctx.fillStyle = '#09090b'
  ctx.beginPath()
  ctx.arc(240, 118, 74, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(240, 118, 60, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#09090b'
  ctx.beginPath()
  ctx.arc(214, 96, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(266, 96, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#09090b'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(240, 124, 34, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 22px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('HELLO ASCII', 240, 218)
  return c
}

function sourceToCanvas(source: CanvasImageSource, width: number, srcW: number, srcH: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  const scale = width / srcW
  c.width = width
  c.height = Math.max(4, Math.round(srcH * scale * CHAR_ASPECT * 2))
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, c.height)
  return c
}

function convert(canvas: HTMLCanvasElement, ramp: string, invert: boolean, contrast: number, brightness: number): string {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  const out: string[] = []
  const rampLen = ramp.length
  const last = rampLen - 1
  for (let y = 0; y < height; y++) {
    let row = ''
    const rowBase = y * width * 4
    for (let x = 0; x < width; x++) {
      const i = rowBase + x * 4
      let l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (data[i + 3] < 128) {
        l = brightness
      } else {
        l = (l - 128) * contrast + 128 + brightness
      }
      l = Math.max(0, Math.min(255, l))
      const n = (invert ? 1 - l / 255 : l / 255) * last
      row += ramp[Math.round(n)]
    }
    out.push(row)
  }
  return out.join('\n')
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return 'dark'
    if (saved === 'light') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('sample')
  const [width, setWidth] = useState(110)
  const [rampId, setRampId] = useState(0)
  const [invert, setInvert] = useState(false)
  const [contrast, setContrast] = useState(1)
  const [brightness, setBrightness] = useState(0)
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const c = drawSample()
    const image = new Image()
    image.onload = () => setImg(image)
    image.src = c.toDataURL('image/png')
  }, [])

  const ascii = useMemo(() => {
    if (!img) return ''
    const ramp = RAMPS[rampId].value
    const cols = width
    const canvas = sourceToCanvas(img, cols, img.naturalWidth, img.naturalHeight)
    return convert(canvas, ramp, invert, contrast, brightness)
  }, [img, width, rampId, invert, contrast, brightness])

  const asciiRows = useMemo(() => ascii.split('\n').length, [ascii])

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (png, jpg, gif, webp…)')
      return
    }
    setError('')
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImg(image)
      setFileName(file.name)
    }
    image.onerror = () => setError('Could not read that image.')
    image.src = url
  }

  const loadSample = () => {
    const c = drawSample()
    const image = new Image()
    image.onload = () => {
      setImg(image)
      setFileName('hello-ascii.png')
    }
    image.src = c.toDataURL('image/png')
  }

  const copyAscii = async () => {
    if (!ascii) return
    await navigator.clipboard.writeText(ascii)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = (ext: 'txt' | 'html') => {
    if (!ascii) return
    let content = ascii
    let mime = 'text/plain'
    if (ext === 'html') {
      content = `<!doctype html><html><head><meta charset="utf-8"><title>ASCII Art</title><style>html,body{margin:0;background:#09090b}pre{color:#e4e4e7;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;line-height:1;padding:16px;white-space:pre;overflow:auto}</style></head><body><pre>${ascii.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`
      mime = 'text/html'
    }
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascii-art.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-border bg-card/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full object-cover border border-border shadow-sm" />
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">ASCII Art Generator</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/parithosh-varma/ascii-art-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold transition-all border border-border bg-background hover:bg-muted text-foreground rounded-lg shadow-sm hover:border-muted-foreground/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            <span className="hidden sm:inline">Repo</span>
          </a>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="inline-flex items-center justify-center w-9 h-9 border border-border bg-background hover:bg-muted text-foreground rounded-lg transition-all hover:border-muted-foreground/30 shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Turn any image into ASCII art</h2>
            <p className="text-muted-foreground mt-1">Upload a photo, adjust the look, copy or download. All done locally.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSample}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all shadow-sm"
            >
              Try sample
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Upload image
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }} />
          </div>
        </div>

        {!img ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-muted-foreground/40'
            }`}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-1">Drop an image here</h3>
            <p className="text-sm text-muted-foreground">…or click to browse · PNG, JPG, GIF, WebP — everything stays on your device</p>
            <button
              onClick={(e) => { e.stopPropagation(); loadSample() }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              No image? Use the sample
            </button>
            {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            <div className="space-y-4">
              <div className="border border-border rounded-2xl bg-card shadow-sm p-4">
                <img src={img.src} alt="Source" className="w-full max-h-52 object-cover rounded-xl border border-border" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground font-medium truncate">{fileName}</span>
                  <span className="text-xs font-mono text-muted-foreground">{img.naturalWidth}×{img.naturalHeight}px</span>
                </div>
              </div>

              <div className="border border-border rounded-2xl bg-card shadow-sm p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Width (chars)</label>
                    <span className="text-xs font-mono font-bold text-primary">{width}</span>
                  </div>
                  <input
                    type="range" min={40} max={240} value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Character set</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RAMPS.map((r, i) => (
                      <button
                        key={r.name}
                        onClick={() => setRampId(i)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          rampId === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invert</span>
                  <button
                    onClick={() => setInvert(!invert)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${invert ? 'bg-primary' : 'bg-muted border border-border'}`}
                    aria-label="Toggle invert"
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background border border-border shadow-sm transition-all ${invert ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contrast</label>
                    <span className="text-xs font-mono font-bold text-primary">{contrast.toFixed(2)}×</span>
                  </div>
                  <input
                    type="range" min={0.2} max={2.5} step={0.05} value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brightness</label>
                    <span className="text-xs font-mono font-bold text-primary">{brightness > 0 ? '+' : ''}{brightness}</span>
                  </div>
                  <input
                    type="range" min={-100} max={100} step={1} value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>

            <div className="border border-border rounded-2xl bg-zinc-950 dark:bg-black overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">ASCII Output</span>
                <span className="text-xs font-mono text-zinc-500">{width} × {asciiRows}</span>
              </div>
              <div className="max-h-[560px] overflow-auto p-5">
                <pre className="font-mono text-[7px] sm:text-[9px] leading-[1.1] text-zinc-100 select-all">{ascii}</pre>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-white/10 bg-white/5">
                <button
                  onClick={copyAscii}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M20 6 9 17l-5-5"/></svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      Copy ASCII
                    </>
                  )}
                </button>
                <button
                  onClick={() => download('txt')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-white/15 bg-background hover:bg-white/10 text-foreground transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  .txt
                </button>
                <button
                  onClick={() => download('html')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-white/15 bg-background hover:bg-white/10 text-foreground transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  .html
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => { setImg(null); setFileName(''); setError('') }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-white/15 bg-background hover:bg-white/10 text-foreground transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  Change image
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>} title="Private by design" text="Images are processed on-device with the Canvas API — never uploaded to any server." />
          <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2v4"/><path d="m6.34 6.34 2.83 2.83"/><path d="M2 12h4"/><path d="m17.66 6.34-2.83 2.83"/><path d="M14.5 21h-5l-1.5-3.5A2 2 0 0 1 10.5 15.6h3a2 2 0 0 1 2.5 1.9Z"/><path d="M20 12h4"/><path d="m21.66 6.34-2.83 2.83"/></svg>} title="Six character sets" text="Classic, blocks, numbers, inverted and high-detail ramps suit logos, faces and photos." />
          <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M2 19a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0"/></svg>} title="Export anywhere" text="Copy to clipboard, or download a plain .txt or a ready-to-share .html file." />
        </div>
      </main>

      <footer className="text-center py-8 border-t border-border text-sm text-muted-foreground">
        <p>Built with ❤️ by <a href="https://github.com/parithosh-varma" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Parithosh Varma</a></p>
      </footer>
    </div>
  )
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border border-border rounded-2xl bg-card p-5 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-bold tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}

export default App