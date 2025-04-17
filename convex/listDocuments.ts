import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const list = query({
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("pdfTexts")
      .order("desc")
      .collect();
    
    return docs.map(doc => ({
      id: doc._id,
      title: doc.title,
      createdAt: new Date(doc.createdAt).toLocaleString(),
      content: doc.content
    }));
  },
}); 