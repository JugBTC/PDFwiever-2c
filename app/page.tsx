"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import PDFViewer from "@/components/pdf-viewer";

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">PDF Экстрактор</h1>
      
      {/* Компонент для загрузки и обработки PDF */}
      <PDFViewer />
    </main>
  );
}