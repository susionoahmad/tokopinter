import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Velocity Analysis API Point
app.post("/api/gemini/velocity-analysis", async (req: any, res: any) => {
  const { products, transactions } = req.body;

  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ error: "Invalid products array" });
  }

  // Determine last 30 days boundary
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Calculate actual sales metrics per product in the last 30 days
  const velocityMap: Record<string, { name: string; category: string; stock: number; minStock: number; sold30d: number }> = {};

  // Initialize map
  products.forEach((p: any) => {
    velocityMap[p.id] = {
      name: p.name,
      category: p.category,
      stock: p.stock,
      minStock: p.minStock || 5,
      sold30d: 0
    };
  });

  // Populate from transactions
  if (transactions && Array.isArray(transactions)) {
    transactions.forEach((tx: any) => {
      const txDate = new Date(tx.timestamp);
      if (txDate >= thirtyDaysAgo && tx.items) {
        tx.items.forEach((item: any) => {
          if (velocityMap[item.productId]) {
            velocityMap[item.productId].sold30d += (item.quantity || 0);
          }
        });
      }
    });
  }

  const calculatedData = Object.entries(velocityMap).map(([id, val]) => {
    const dailyVelocity = val.sold30d / 30;
    const daysRemaining = dailyVelocity > 0 ? (val.stock / dailyVelocity) : 9999;
    return {
      id,
      name: val.name,
      category: val.category,
      stock: val.stock,
      minStock: val.minStock,
      sold30d: val.sold30d,
      dailyVelocity: dailyVelocity.toFixed(2),
      daysRemaining: daysRemaining === 9999 ? -1 : Math.round(daysRemaining)
    };
  });

  try {
    // Build the prompt for Gemini
    const prompt = `
      Anda adalah pakar manajemen stok & inventaris POS Retail Indonesia.
      Tugas Anda adalah menganalisis data kecepatan penjualan (velocity) berikut ini yang kami kumpulkan dari riwayat transaksi 30 hari terakhir.
      Gunakan data ini untuk memberikan analisis stok, memprediksi kapan stok akan habis, dan menyarankan jumlah pemesanan kembali (reorder quantity) yang optimal.

      Data Produk & Penjualan (30 Hari Terakhir):
      ${JSON.stringify(calculatedData, null, 2)}

      Silakan berikan dalam responseSchema:
      1. Klasifikasi tingkat kecepatan penjualan (Tinggi/Sedang/Rendah/Tidak Ada Penjualan) untuk masing-masing barang (velocityGrade).
      2. Estimasi hari tersisa sebelum stok habis (daysRemainingEst). Gunakan -1 jika tidak terhingga / tidak ada penjualan.
      3. Saran jumlah pemesanan/restok kembali (optimalReorderQty). Harus berupa bilangan bulat positif rasional (biasanya kelipatan 5 atau 10 lebih disukai untuk kepraktisan toko). Jika stok saat ini aman dan penjualan nihil, set ke 0.
      4. Alasan singkat dan taktis dalam Bahasa Indonesia (reason) yang menjelaskan mengapa jumlah ini disarankan dikaitkan dengan stok saat ini, angka minStock, dan kategori barang tersebut.
      5. Ringkasan umum situasi inventaris toko dalam satu atau dua kalimat memotivasi (generalSummary) dalam Bahasa Indonesia.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  velocityGrade: { type: Type.STRING, description: "Tinggi, Sedang, Rendah, atau Tidak Ada Penjualan" },
                  daysRemainingEst: { type: Type.NUMBER, description: "Hari sebelum stok habis. -1 jika tidak terhingga." },
                  optimalReorderQty: { type: Type.NUMBER, description: "Jumlah optimal pemesanan ulang yang disarankan." },
                  reason: { type: Type.STRING, description: "Penjelasan rasional dan saran praktis dalam Bahasa Indonesia." }
                },
                required: ["productId", "productName", "velocityGrade", "daysRemainingEst", "optimalReorderQty", "reason"]
              }
            },
            generalSummary: {
              type: Type.STRING,
              description: "Ringkasan situasi stok toko secara keseluruhan, menyoroti tren kritis atau kesiapan barang dagangan, dalam Bahasa Indonesia."
            }
          },
          required: ["insights", "generalSummary"]
        }
      }
    });

    const resultText = response.text || "{}";
    const analysisResult = JSON.parse(resultText);

    res.json({
      success: true,
      calculatedData,
      aiAnalysis: analysisResult
    });
  } catch (error: any) {
    console.warn("Gemini stock velocity analysis failed, providing fallback analysis:", error.message);

    // Graceful fallback: Generate basic analysis locally
    const fallbackInsights = calculatedData.map((item: any) => {
      let velocityGrade = 'Tidak Ada Penjualan';
      let optimalReorderQty = 0;
      let reason = '';
      const dailyVel = parseFloat(item.dailyVelocity);

      if (item.sold30d === 0) {
        velocityGrade = 'Tidak Ada Penjualan';
        optimalReorderQty = 0;
        reason = 'Produk ini tidak memiliki penjualan dalam 30 hari terakhir. Monitor stok dan pertimbangkan penawaran promosi atau rotasi barang.';
      } else if (dailyVel >= 5) {
        velocityGrade = 'Tinggi';
        optimalReorderQty = Math.ceil(dailyVel * 30);
        reason = `Penjualan cepat (${item.sold30d} unit/30 hari). Rekomendasikan restok ${optimalReorderQty} unit untuk memenuhi permintaan bulanan.`;
      } else if (dailyVel >= 1) {
        velocityGrade = 'Sedang';
        optimalReorderQty = Math.ceil(dailyVel * 45);
        reason = `Penjualan sedang (${item.sold30d} unit/30 hari). Restok ${optimalReorderQty} unit untuk menjaga ketersediaan 1.5 bulan ke depan.`;
      } else if (dailyVel > 0) {
        velocityGrade = 'Rendah';
        optimalReorderQty = Math.max(5, Math.ceil(dailyVel * 60));
        reason = `Penjualan rendah (${item.sold30d} unit/30 hari). Restok minimal ${optimalReorderQty} unit atau pertimbangkan diskontinuasi.`;
      }

      return {
        productId: item.id,
        productName: item.name,
        velocityGrade,
        daysRemainingEst: item.daysRemaining,
        optimalReorderQty,
        reason
      };
    });

    res.json({
      success: true,
      usingFallback: true,
      fallbackReason: 'Analisis AI tidak tersedia saat ini. Menampilkan analisis perkiraan berdasarkan data.',
      calculatedData,
      aiAnalysis: {
        insights: fallbackInsights,
        generalSummary: 'Analisis ini dibuat secara otomatis berdasarkan data penjualan 30 hari terakhir. Untuk saran yang lebih akurat, aktifkan Gemini API.'
      }
    });
  }
});

// Serving logic
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Gunakan __dirname untuk memastikan path relatif terhadap file ini
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started successfully on port ${PORT}`);
  });
}

bootstrap();
