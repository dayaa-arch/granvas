import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import type { DownloadFormat } from '@/modules/transfer/domain/TransferPolicy'

import './DownloadDialog.css'

export type DownloadDialogSubmitDto = Readonly<{
  name: string
  format: DownloadFormat
}>

export type DownloadDialogProps = Readonly<{
  open: boolean
  defaultFileName: string
  canDownloadVisual: boolean
  diagnosticsCount: number
  busy?: boolean
  onClose(): void
  onDownload(input: DownloadDialogSubmitDto): void
}>

const formats: readonly Readonly<{
  value: DownloadFormat
  label: string
  description: string
}>[] = Object.freeze([
  {
    value: 'granvas',
    label: '.granvas',
    description: 'Editable project',
  },
  { value: 'svg', label: 'SVG', description: 'Scalable graph' },
  { value: 'png', label: 'PNG', description: '2× image' },
  { value: 'pdf', label: 'PDF', description: 'Single page' },
])

export function DownloadDialog({
  open,
  defaultFileName,
  canDownloadVisual,
  diagnosticsCount,
  busy = false,
  onClose,
  onDownload,
}: DownloadDialogProps) {
  const [name, setName] = useState(defaultFileName)
  const [format, setFormat] = useState<DownloadFormat>('granvas')
  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const frame = requestAnimationFrame(() => {
      setName(defaultFileName)
      setFormat('granvas')
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })

    return () => cancelAnimationFrame(frame)
  }, [defaultFileName, open])

  if (!open) {
    return null
  }

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return
    }

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    )
    const first = focusable[0]
    const last = focusable.at(-1)

    if (!first || !last) {
      return
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="download-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose()
        }
      }}
    >
      <div
        className="download-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-dialog-title"
        aria-describedby="download-dialog-description"
        onKeyDown={trapFocus}
      >
        <div className="download-dialog__heading">
          <div>
            <span className="download-dialog__eyebrow">Export</span>
            <h2 id="download-dialog-title">Download your work</h2>
          </div>
          <button
            className="download-dialog__close"
            type="button"
            aria-label="Close Download dialog"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>

        <p id="download-dialog-description" className="download-dialog__intro">
          Keep an editable project or share the current valid graph.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onDownload({ name, format })
          }}
        >
          <label className="download-dialog__label" htmlFor="download-file-name">
            File name
          </label>
          <input
            ref={nameInputRef}
            id="download-file-name"
            className="download-dialog__input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            disabled={busy}
          />

          <fieldset className="download-dialog__formats">
            <legend>Format</legend>
            <div className="download-dialog__format-grid">
              {formats.map((option) => {
                const disabled = option.value !== 'granvas' && !canDownloadVisual

                return (
                  <label
                    className={`download-format${format === option.value ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="download-format"
                      value={option.value}
                      checked={format === option.value}
                      onChange={() => setFormat(option.value)}
                      disabled={disabled || busy}
                    />
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {diagnosticsCount > 0 ? (
            <p className="download-dialog__notice" role="note">
              {diagnosticsCount} diagnostic{diagnosticsCount === 1 ? '' : 's'} — visual
              formats include the valid projection only.
            </p>
          ) : null}

          <div className="download-dialog__actions">
            <button
              className="button button--quiet"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Preparing…' : 'Download'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
