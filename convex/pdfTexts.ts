import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Функция для сохранения текста из PDF
export const save = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pdfTexts", {
      title: args.title,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

// Функция для получения всех сохраненных текстов
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pdfTexts")
      .order("desc")
      .collect();
  },
});

// Функция для получения конкретного текста по ID
export const getById = query({
  args: { id: v.id("pdfTexts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});