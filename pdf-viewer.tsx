"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Save,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Copy,
  Upload,
  Monitor,
} from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../convex/_generated/api"

// Add type for pdfjsLib
declare global {
  interface Window {
    pdfjsLib?: typeof import("pdfjs-dist")
  }
}

type FormDataType = {
  [key: string]: string
}

export default function PDFViewer() {
  // Use insertPDFText from chat module
  const insertPDFText = useMutation(api.chat.insertPDFText)

  const documentTypes = ["invoice", "letter", "mandate", "offer", "report", "contract", "other"]

  const fieldLabels = [
    { label: "Invoice number", key: "invoice_number" },
    { label: "Date of issue", key: "date_issue" },
    { label: "Date due", key: "date_due" },
    { label: "Vendor name", key: "vendor_name" },
    { label: "Description", key: "description" },
    { label: "Vendor email", key: "vendor_email" },
    { label: "Vendor address", key: "vendor_address" },
    { label: "Client name", key: "client_name" },
    { label: "Client email", key: "client_email" },
    { label: "Client address", key: "client_address" },
    { label: "Amount due", key: "amount_due" },
    { label: "Summary line", key: "summary" },
  ]

  const [state, setState] = useState<{
    screen: string
    fileName: string
    scale: number
    pdfDoc: any
    currentPage: number
    totalPages: number
    documentType: string
    formData: FormDataType
    text: string
  }>({
    screen: "upload",
    fileName: "",
    scale: 1.0,
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    documentType: "invoice",
    formData: {},
    text: "",
  })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const toggleScreen = () => {
    const screens = ["upload", "invoices", "documents", "contacts", "catalog"]
    const currentIndex = screens.indexOf(state.screen)
    const nextIndex = (currentIndex + 1) % screens.length
    setState((prev) => ({ ...prev, screen: screens[nextIndex] }))
  }

  const renderPage = async () => {
    if (!state.pdfDoc) return
    try {
      const page = await state.pdfDoc.getPage(state.currentPage)
      const viewport = page.getViewport({ scale: state.scale })
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext("2d")
      if (!context) return
      canvas.height = viewport.height
      canvas.width = viewport.width
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise
    } catch (error) {
      console.error("Error rendering PDF page:", error)
    }
  }

  const extractTextFromPDF = async (pdf: any) => {
    let allText = ""
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const strings = content.items.map((item: any) => item.str)
      allText += strings.join(" ") + "\n\n"
    }
    const formData: FormDataType = {
      invoice_number: "336EB2B70001",
      date_issue: "2025-02-16",
      date_due: "2025-02-16",
      vendor_name: "Anthropic",
      description: "Claude services subscription",
      vendor_email: "support@anthropic.com",
      vendor_address: "548 Market St, San Francisco, CA 94104",
      client_name: "Natalia Soboleva",
      client_email: "gol2info@gmail.com",
      client_address: "9 Route de Turin, Nice, France",
      amount_due: "€195.00",
      summary: "336EB2B70001 · €195.00 due February 16, 2025",
    }
    return { text: allText, formData }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setState((prev) => ({ ...prev, fileName: file.name }))
    const reader = new FileReader()
    reader.onload = async () => {
      if (!reader.result) return
      try {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer)
        const pdf = await window.pdfjsLib!.getDocument({ data: typedArray }).promise
        setState((prev) => ({
          ...prev,
          pdfDoc: pdf,
          currentPage: 1,
          totalPages: pdf.numPages,
        }))
        const { text, formData } = await extractTextFromPDF(pdf)
        setState((prev) => ({ ...prev, text, formData }))
      } catch (error) {
        console.error("Ошибка при обработке PDF:", error)
        setState((prev) => ({
          ...prev,
          text: "Не удалось прочитать PDF файл: PDF.js не загружен. Пожалуйста, обновите страницу и попробуйте снова.",
          formData: {},
        }))
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFormChange = (key: string, value: string) => {
    setState((prev) => ({ ...prev, formData: { ...prev.formData, [key]: value } }))
  }

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(state.formData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = state.fileName.replace(/.pdf$/i, "") + ".json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDocTypeChange = (type: string) => {
    setState((prev) => ({ ...prev, documentType: type }))
  }

  const handleCopyText = () => {
    navigator.clipboard
      .writeText(state.text)
      .then(() => {
        alert("Текст скопирован в буфер обмена!")
      })
      .catch((err) => {
        console.error("Не удалось скопировать текст: ", err)
      })
  }

  const changePage = (delta: number) => {
    if (!state.pdfDoc) return
    const newPage = state.currentPage + delta
    if (newPage >= 1 && newPage <= state.totalPages) {
      setState((prev) => ({ ...prev, currentPage: newPage }))
    }
  }

  const changeZoom = (delta: number) => {
    const newScale = Math.max(0.5, Math.min(2.0, state.scale + delta))
    setState((prev) => ({ ...prev, scale: newScale }))
  }

  const resetZoom = () => {
    setState((prev) => ({ ...prev, scale: 1.0 }))
  }

  useEffect(() => {
    if (state.pdfDoc) renderPage()
  }, [state.pdfDoc, state.currentPage, state.scale])

  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
      script.async = true
      script.onload = () => {
        window.pdfjsLib!.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
      }
      document.body.appendChild(script)
      return () => {
        document.body.removeChild(script)
      }
    } else {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="p-4">
        {/* Top toolbar */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Загрузить PDF
          </button>

          <div className="flex items-center gap-2">
            <span className="text-gray-800">Тип документа:</span>
            <select
              value={state.documentType}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 w-64"
            >
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button
            className="bg-white border border-blue-500 text-blue-500 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2 ml-auto"
            onClick={handleDownloadJSON}
          >
            <Save className="w-4 h-4" />
            <span>Скачать JSON</span>
          </button>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            onClick={toggleScreen}
          >
            <Monitor className="w-4 h-4" />
            Переключить экран
          </button>

          <button
            className="bg-white border border-blue-500 text-blue-500 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2"
            onClick={async () => {
              try {
                const id = await insertPDFText({
                  pdfText: state.text,
                  user: "user",
                })
                alert("✅ Сохранено в базу!")
              } catch (e) {
                console.error("Ошибка при сохранении в Convex:", e)
                alert("❌ Не удалось сохранить в базу")
              }
            }}
          >
            <Save className="w-4 h-4" />
            <span>Сохранить в Convex</span>
          </button>
        </div>

        {/* File info */}
        <div className="flex items-center gap-2 mb-4 text-gray-800">
          <div className="text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span>Файл: {state.fileName || "Facture No 031224 David Giuntoli.pdf"}</span>
        </div>

        {/* Navigation controls */}
        <div className="flex justify-between mb-4">
          <div className="flex gap-1">
            <button
              className="bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => setState((prev) => ({ ...prev, currentPage: 1 }))}
              disabled={!state.pdfDoc || state.currentPage === 1}
            >
              <ChevronFirst className="w-5 h-5" />
            </button>
            <button
              className="bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => changePage(-1)}
              disabled={!state.pdfDoc || state.currentPage === 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="bg-white border border-gray-300 px-3 flex items-center justify-center rounded-md">
              {state.currentPage} / {state.totalPages}
            </div>
            <button
              className="bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => changePage(1)}
              disabled={!state.pdfDoc || state.currentPage === state.totalPages}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              className="bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => setState((prev) => ({ ...prev, currentPage: state.totalPages }))}
              disabled={!state.pdfDoc || state.currentPage === state.totalPages}
            >
              <ChevronLast className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-1">
            <button
              className="bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => changeZoom(-0.1)}
              disabled={!state.pdfDoc}
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="bg-white border border-gray-300 px-3 flex items-center justify-center rounded-md min-w-[80px]">
              {Math.round(state.scale * 100)}%
            </div>
            <button
              className="bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => changeZoom(0.1)}
              disabled={!state.pdfDoc}
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              className="bg-blue-500 text-white px-3 flex items-center justify-center rounded-md"
              onClick={resetZoom}
              disabled={!state.pdfDoc}
            >
              100%
            </button>
          </div>
        </div>

        {/* Document viewer */}
        <div className="border border-gray-200 bg-white rounded-md p-4 mb-4 min-h-[400px] flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-full" />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </div>

        {/* Extracted text */}
        <div className="mt-8 flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Извлеченный текст:</h2>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            onClick={handleCopyText}
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-white p-4 rounded-md border border-gray-200">
          <p className="whitespace-pre-line">
            {state.text ||
              "Не удалось прочитать PDF файл: PDF.js не загружен. Пожалуйста, обновите страницу и попробуйте снова."}
          </p>
        </div>

        {/* Form data */}
        {Object.keys(state.formData).length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Извлеченные данные:</h2>
            <div className="bg-white p-4 rounded-md border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              {fieldLabels.map(({ label, key }) => (
                <div key={key} className="flex flex-col">
                  <label className="text-sm text-gray-600">{label}</label>
                  <input
                    type="text"
                    value={state.formData[key] || ""}
                    onChange={(e) => handleFormChange(key, e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 mt-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
