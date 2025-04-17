import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  pdfTexts: defineTable({
    title: v.string(),
    content: v.string(),
    createdAt: v.number(),
    // Добавьте другие нужные поля
  }),
});