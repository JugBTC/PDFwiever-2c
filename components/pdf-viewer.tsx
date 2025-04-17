"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
} from "lucide-react"

declare global {
  interface Window {
    pdfjsLib?: typeof import("pdfjs-dist");
  }
}

type PDFPageContent = {
  items: Array<{
    str: string
    [key: string]: any
  }>
}

type FormDataType = {
  [key: string]: string;
};

interface SavedDocument {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export default function PDFViewer() {
  const savePdfText = useMutation(api.pdfTexts.save);
  const savedDocuments = useQuery(api.listDocuments.list) as SavedDocument[] | undefined;

  const documentTypes = ["invoice", "letter", "mandate", "offer", "report", "contract", "other"];

  const fieldLabels = [
    { label: "Invoice number", key: "invoice_number" },
    { label: "Date of issue", key: "date_issue" },
    { label: "Date due", key: "date_due" },
    { label: "Vendor UUID", key: "vendor_uuid", placeholder: "Bdgbn_" },
    { label: "Vendor name", key: "vendor_name" },
    { label: "Description", key: "description" },
    { label: "Vendor email", key: "vendor_email" },
    { label: "Vendor address", key: "vendor_address" },
    { label: "Client UUID", key: "client_uuid", placeholder: "Kmnpx_" },
    { label: "Client name", key: "client_name" },
    { label: "Client email", key: "client_email" },
    { label: "Client address", key: "client_address" },
    { label: "Amount due", key: "amount_due" },
    { label: "Summary line", key: "summary" },
  ];

  const [state, setState] = useState<{
    fileName: string;
    scale: number;
    pdfDoc: any;
    currentPage: number;
    totalPages: number;
    documentType: string;
    formData: FormDataType;
    text: string;
    notification: {
      show: boolean;
      message: string;
      type: 'success' | 'error';
    };
    isSaving: boolean;
    modalDoc: SavedDocument | null;
  }>({
    fileName: "",
    scale: 1.0,
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    documentType: "invoice",
    formData: {
      invoice_number: "336EB2B70001",
      date_issue: "2025-02-16",
      date_due: "2025-02-16",
      vendor_uuid: "Bdgbn_",
      vendor_name: "Anthropic",
      description: "Claude services subscription",
      vendor_email: "support@anthropic.com",
      vendor_address: "548 Market St, San Francisco, CA 94104",
      client_uuid: "Kmnpx_",
      client_name: "Natalia Soboleva",
      client_email: "gol2info@gmail.com",
      client_address: "9 Route de Turin, Nice, France",
      amount_due: "€195.00",
      summary: "336EB2B70001 · €195.00 due February 16, 2025",
    },
    text: "",
    notification: {
      show: false,
      message: "",
      type: 'success'
    },
    isSaving: false,
    modalDoc: null
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveText = async (title: string, extractedText: string) => {
    if (state.isSaving) return;

    const existingDocs = savedDocuments?.filter(doc => 
      doc.content === extractedText && doc.title === title
    );

    if (existingDocs && existingDocs.length > 0) {
      setState(prev => ({
        ...prev,
        notification: {
          show: true,
          message: "Этот текст уже сохранен в базе данных",
          type: 'error'
        }
      }));
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          notification: {
            ...prev.notification,
            show: false
          }
        }));
      }, 3000);
      return;
    }

    try {
      setState(prev => ({ ...prev, isSaving: true }));
      
      const id = await savePdfText({ title, content: extractedText });
      console.log("Text saved to Convex with ID:", id);
      setState(prev => ({
        ...prev,
        notification: {
          show: true,
          message: "Текст успешно сохранен",
          type: 'success'
        }
      }));
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          notification: {
            ...prev.notification,
            show: false
          }
        }));
      }, 3000);
    } catch (error) {
      console.error("Error saving text:", error);
      setState(prev => ({
        ...prev,
        notification: {
          show: true,
          message: "Ошибка при сохранении",
          type: 'error'
        }
      }));
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const renderPage = async () => {
    if (!state.pdfDoc) return;
    try {
      const page = await state.pdfDoc.getPage(state.currentPage);
      const viewport = page.getViewport({ scale: state.scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (error) {
      console.error("Error rendering PDF page:", error);
    }
  };

  const extractTextFromPDF = async (pdf: any) => {
    let allText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      allText += strings.join(" ") + "\n\n";
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
    };
    return { text: allText, formData };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState((prev) => ({ ...prev, fileName: file.name }));
    const reader = new FileReader();
    reader.onload = async () => {
      if (!reader.result) return;
      try {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await window.pdfjsLib!.getDocument({ data: typedArray }).promise;
        setState((prev) => ({
          ...prev,
          pdfDoc: pdf,
          currentPage: 1,
          totalPages: pdf.numPages,
        }));
        const { text, formData } = await extractTextFromPDF(pdf);
        setState((prev) => ({ ...prev, text, formData }));
      } catch (error) {
        console.error("Error processing PDF:", error);
        setState((prev) => ({
          ...prev,
          text: "Failed to read PDF file: PDF.js not loaded. Please refresh the page and try again.",
          formData: {},
        }));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFormChange = (key: string, value: string) => {
    setState((prev) => ({ ...prev, formData: { ...prev.formData, [key]: value } }));
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(state.formData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = state.fileName.replace(/.pdf$/i, "") + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDocTypeChange = (type: string) => {
    setState((prev) => ({ ...prev, documentType: type }));
  };

  const handleCopyText = () => {
    navigator.clipboard
      .writeText(state.text)
      .then(() => {
        alert("Text copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  const changePage = (delta: number) => {
    if (!state.pdfDoc) return;
    const newPage = state.currentPage + delta;
    if (newPage >= 1 && newPage <= state.totalPages) {
      setState((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const changeZoom = (delta: number) => {
    const newScale = Math.max(0.5, Math.min(2.0, state.scale + delta));
    setState((prev) => ({ ...prev, scale: newScale }));
  };

  const resetZoom = () => {
    setState((prev) => ({ ...prev, scale: 1.0 }));
  };

  useEffect(() => {
    if (state.pdfDoc) renderPage();
  }, [state.pdfDoc, state.currentPage, state.scale]);

  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        window.pdfjsLib!.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    } else {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Notification */}
      {state.notification.show && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-md shadow-lg ${
            state.notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white transition-opacity duration-300`}
        >
          {state.notification.message}
        </div>
      )}
      
      <div className="p-4">
        {/* Top toolbar */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </button>

          <div className="flex items-center gap-2">
            <span className="text-gray-800">Document Type:</span>
            <select
              value={state.documentType}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 w-40"
            >
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button
            className="bg-white border border-blue-500 text-blue-500 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleSaveText(state.fileName || "Untitled PDF", state.text)}
            disabled={!state.text || state.isSaving}
          >
            <Save className="w-4 h-4" />
            {state.isSaving ? "Сохранение..." : "Save to Database"}
          </button>

          <button
            className="bg-white border border-blue-500 text-blue-500 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2"
            onClick={handleDownloadJSON}
            disabled={!Object.keys(state.formData).length}
          >
            <Save className="w-4 h-4" />
            Download JSON
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
          <span>File: {state.fileName || "No file selected"}</span>
        </div>

        {/* Main content - two column layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left column - PDF viewer (2/3 width) */}
          <div className="w-full lg:w-2/3">
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
                  className="bg-blue-500 text-white px-3 flex items-center justify-center rounded-md hover:bg-blue-600 transition-colors"
                  onClick={resetZoom}
                  disabled={!state.pdfDoc}
                >
                  100%
                </button>
              </div>
            </div>

            {/* Document viewer */}
            <div className="border border-gray-200 bg-white rounded-md p-4 mb-4 min-h-[500px] flex items-center justify-center">
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
            <div className="mt-4 flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Extracted Text:</h2>
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                onClick={handleCopyText}
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-md border border-gray-200 max-h-[300px] overflow-y-auto">
              <p className="whitespace-pre-line">
                {state.text ||
                  "Failed to read PDF file: PDF.js not loaded. Please refresh the page and try again."}
              </p>
            </div>
          </div>

          {/* Right column - Form data (1/3 width) */}
          <div className="w-full lg:w-1/3">
            <div className="sticky top-4">
              <h2 className="text-xl font-bold mb-4">Extracted Data:</h2>
              <div className="bg-white p-4 rounded-md border border-gray-200">
                {Object.keys(state.formData).length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {fieldLabels.map(({ label, key, placeholder }) => (
                      <div key={key} className="flex flex-col">
                        <label className="text-sm text-gray-600">{label}</label>
                        {key === "description" ? (
                          <textarea
                            value={state.formData[key] || ""}
                            onChange={(e) => handleFormChange(key, e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 mt-1 h-24 resize-none overflow-y-auto"
                          />
                        ) : key.endsWith("_uuid") ? (
                          <input
                            type="text"
                            value={state.formData[key] || ""}
                            onChange={(e) => {
                              // Преобразуем введенный текст в формат UUID
                              const value = e.target.value
                                .slice(0, 6) // Ограничиваем длину 6 символами (5 букв + _)
                                .replace(/[^a-zA-Z0-9_]/g, "") // Оставляем только буквы, цифры и _
                                .replace(/^(.)(.{0,4})(.*)$/, (_, first, rest) => 
                                  first.toUpperCase() + rest.toLowerCase()
                                );
                              handleFormChange(key, value.length === 5 ? value + "_" : value);
                            }}
                            placeholder={placeholder}
                            className="border border-gray-300 rounded px-3 py-2 mt-1 font-mono"
                            maxLength={6}
                          />
                        ) : (
                          <input
                            type="text"
                            value={state.formData[key] || ""}
                            onChange={(e) => handleFormChange(key, e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 mt-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Upload a PDF file to see extracted data</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Saved texts with scroll */}
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-4">Сохраненные тексты</h2>
          <div 
            className="bg-white rounded-md border border-gray-200 overflow-y-scroll"
            style={{ 
              height: '400px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E1 #F1F5F9'
            }}
          >
            <div className="p-4 space-y-4">
              {savedDocuments?.map((doc) => (
                <div 
                  key={doc.id} 
                  className="border-b border-gray-200 pb-4 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setState(prev => ({ ...prev, modalDoc: doc }))}
                >
                  <h3 className="text-lg font-semibold">{doc.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{new Date(doc.createdAt).toLocaleString()}</p>
                  <p className="text-gray-800">{doc.content.substring(0, 200)}...</p>
                </div>
              ))}
              {(!savedDocuments || savedDocuments.length === 0) && (
                <p className="text-gray-500 italic">Нет сохраненных документов</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal for full text view */}
        {state.modalDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">{state.modalDoc.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(state.modalDoc.createdAt).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setState(prev => ({ ...prev, modalDoc: null }))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <pre className="whitespace-pre-wrap font-sans">{state.modalDoc.content}</pre>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(state.modalDoc!.content);
                    setState(prev => ({
                      ...prev,
                      notification: {
                        show: true,
                        message: "Текст скопирован в буфер обмена",
                        type: 'success'
                      }
                    }));
                    setTimeout(() => {
                      setState(prev => ({
                        ...prev,
                        notification: {
                          ...prev.notification,
                          show: false
                        }
                      }));
                    }, 3000);
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Копировать текст
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}