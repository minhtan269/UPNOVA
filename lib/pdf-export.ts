// ============================================================
// ACRM PDF Report Generator - Upgraded (4.3)
// Executive Summary, GHG Scope Table, Charts, QR, Signature
// ============================================================

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { calculateGHGBreakdown, generateVerificationStatement, generateReportHash } from "./ghg-protocol";
import {
    AVAILABLE_REGIONS,
    ENERGY_COEFFICIENTS,
    GLOBAL_CI_FALLBACK,
} from "./carbon-constants";
import type { ResilienceScores } from "./resilience-engine";

interface ReportData {
    sessionStats: {
        totalCO2: number;
        totalEnergyWh: number;
        totalTokens: number;
        messageCount: number;
    };
    messages: Array<{
        id: string;
        role: string;
        modelId: string;
        metrics: {
            co2Grams: number;
            energyWh: number;
            totalTokens: number;
        };
    }>;
    selectedRegion: string;
    carbonBudget: number;
    resilience?: ResilienceScores;
}

// Colors
const BRAND = { r: 15, g: 166, b: 151 };     // #0FA697
const GREEN = { r: 174, g: 217, b: 17 };       // #AED911
const DARK = { r: 31, g: 41, b: 55 };
const GRAY = { r: 107, g: 114, b: 128 };
const LIGHT = { r: 243, g: 244, b: 246 };
const RED = { r: 217, g: 26, b: 26 };
const AMBER = { r: 245, g: 158, b: 11 };

export async function generatePDFReport(data: ReportData): Promise<void> {
    const doc = new jsPDF();
    const { sessionStats, messages, selectedRegion, carbonBudget } = data;
    const aiMessages = messages.filter((m) => m.role === "assistant");
    const regionInfo = AVAILABLE_REGIONS.find((r) => r.id === selectedRegion);
    const ci = regionInfo?.ci ?? GLOBAL_CI_FALLBACK;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    // GHG data
    const ghg = calculateGHGBreakdown(sessionStats.totalEnergyWh, ci, messages.map((m) => ({
        role: m.role,
        modelId: m.modelId,
        metrics: { totalTokens: m.metrics.totalTokens },
    })));
    const verification = generateVerificationStatement(selectedRegion);
    const reportHash = generateReportHash({
        totalCO2: sessionStats.totalCO2,
        totalTokens: sessionStats.totalTokens,
        messageCount: sessionStats.messageCount,
        timestamp: now.toISOString(),
    });

    let y = 20;

    // ======== PAGE 1: Header + Executive Summary + GHG ========

    // ---- Header ----
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(0, 0, 210, 45, "F");
    // Accent line
    doc.setFillColor(GREEN.r, GREEN.g, GREEN.b);
    doc.rect(0, 42, 210, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("ACRM Carbon Report", 15, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("AI Carbon-Resilience Management Platform", 15, 26);
    doc.text(`Report ID: ${reportHash}`, 15, 33);
    doc.text(`Generated: ${dateStr}`, 15, 40);

    // Region badge (right side)
    doc.setFontSize(9);
    doc.text(
        regionInfo ? `${regionInfo.label} · ${ci} gCO2/kWh` : `Global · ${GLOBAL_CI_FALLBACK} gCO2/kWh`,
        195, 33, { align: "right" }
    );
    doc.text("GHG Protocol - ISO 14064-1", 195, 40, { align: "right" });

    y = 55;

    // ---- Executive Summary ----
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 15, y);
    y += 3;

    // Summary box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 180, 32, 3, 3, "F");
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, y, 180, 32, 3, 3, "S");
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(DARK.r, DARK.g, DARK.b);

    const budgetPct = carbonBudget > 0 ? ((sessionStats.totalCO2 / carbonBudget) * 100).toFixed(1) : "N/A";
    const totalTokensAI = aiMessages.reduce((a, m) => a + m.metrics.totalTokens, 0);
    const baselineCO2 = (totalTokensAI / 1000) * ENERGY_COEFFICIENTS.large * ci;
    const savedPct = baselineCO2 > 0 ? ((baselineCO2 - sessionStats.totalCO2) / baselineCO2 * 100).toFixed(1) : "0";

    const summaryLines = [
        `This session processed ${sessionStats.messageCount} messages (${sessionStats.totalTokens.toLocaleString()} tokens) generating`,
        `${sessionStats.totalCO2.toFixed(4)}g CO2 Scope 2 operational emissions.`,
        `Total GHG (Scope2 + Scope3 estimated): ${ghg.totalGHG.toFixed(4)}g.`,
        `Carbon budget utilization: ${budgetPct}%. Carbon reduction vs all-large baseline: ${savedPct}%.`,
        `Resilience Score: ${data.resilience?.resilienceScore ?? "N/A"}/100.`,
    ];

    for (const line of summaryLines) {
        doc.text(line, 20, y);
        y += 5;
    }
    y += 10;

    // ---- Session Stats ----
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Session Overview", 15, y);
    y += 8;

    // Stats grid (4 boxes)
    const statsGrid = [
        { label: "Scope 2 CO2", value: sessionStats.totalCO2.toFixed(4) + "g", color: BRAND },
        { label: "Energy Used", value: sessionStats.totalEnergyWh.toFixed(4) + " Wh", color: AMBER },
        { label: "Total Tokens", value: sessionStats.totalTokens.toLocaleString(), color: DARK },
        { label: "Budget Used", value: budgetPct + "%", color: parseFloat(budgetPct) > 100 ? RED : BRAND },
    ];

    const boxW = 42;
    const boxH = 18;
    for (let i = 0; i < statsGrid.length; i++) {
        const x = 15 + i * (boxW + 3);
        doc.setFillColor(statsGrid[i].color.r, statsGrid[i].color.g, statsGrid[i].color.b);
        doc.roundedRect(x, y, boxW, boxH, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(statsGrid[i].label, x + 3, y + 6);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(statsGrid[i].value, x + 3, y + 14);
    }
    y += boxH + 8;

    // ---- GHG Scope Breakdown ----
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("GHG Protocol Emissions Breakdown", 15, y);
    y += 8;

    // Table header
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(15, y - 4, 180, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Scope", 20, y);
    doc.text("Description", 50, y);
    doc.text("Emissions (g CO2)", 140, y);
    doc.text("Share", 178, y);
    y += 6;

    // Scope 2 row
    doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
    doc.rect(15, y - 3, 180, 7, "F");
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.setFont("helvetica", "normal");
    doc.text("Scope 2", 20, y);
    doc.text("Purchased electricity (inference)", 50, y);
    doc.text(ghg.scope2.total.toFixed(4), 140, y);
    doc.text(ghg.scope2Percent + "%", 178, y);
    y += 7;

    // Scope 3 row
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text("Scope 3", 20, y);
    doc.text("Training amortization + infrastructure", 50, y);
    doc.text(ghg.scope3.total.toFixed(4), 140, y);
    doc.text(ghg.scope3Percent + "%", 178, y);
    y += 7;

    // Total row
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(15, y - 3, 180, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 20, y + 1);
    doc.text(ghg.totalGHG.toFixed(4), 140, y + 1);
    doc.text("100%", 178, y + 1);
    y += 14;

    // ---- CO2 per Message Bar Chart ----
    if (aiMessages.length > 0) {
        doc.setTextColor(DARK.r, DARK.g, DARK.b);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("CO2 per Message", 15, y);
        y += 6;

        const chartWidth = 170;
        const barMaxHeight = 30;
        const maxCO2 = Math.max(...aiMessages.map((m) => m.metrics.co2Grams), 0.001);

        for (let i = 0; i < Math.min(aiMessages.length, 20); i++) {
            const barW = Math.max(2, chartWidth / Math.min(aiMessages.length, 20) - 1);
            const barH = (aiMessages[i].metrics.co2Grams / maxCO2) * barMaxHeight;
            const x = 20 + i * (barW + 1);

            // Color based on level
            const ratio = aiMessages[i].metrics.co2Grams / maxCO2;
            if (ratio > 0.7) {
                doc.setFillColor(RED.r, RED.g, RED.b);
            } else if (ratio > 0.3) {
                doc.setFillColor(AMBER.r, AMBER.g, AMBER.b);
            } else {
                doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
            }

            doc.rect(x, y + barMaxHeight - barH, barW, barH, "F");
        }

        // X axis
        doc.setDrawColor(GRAY.r, GRAY.g, GRAY.b);
        doc.line(20, y + barMaxHeight, 20 + chartWidth, y + barMaxHeight);
        doc.setFontSize(7);
        doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
        doc.text("Messages ->", 20, y + barMaxHeight + 5);
        doc.text(`Max: ${maxCO2.toFixed(4)}g`, 145, y + barMaxHeight + 5);
        y += barMaxHeight + 12;
    }

    // ---- Model Distribution ----
    const modelMap = new Map<string, { co2: number; count: number; tokens: number }>();
    for (const msg of aiMessages) {
        const prev = modelMap.get(msg.modelId) ?? { co2: 0, count: 0, tokens: 0 };
        modelMap.set(msg.modelId, {
            co2: prev.co2 + msg.metrics.co2Grams,
            count: prev.count + 1,
            tokens: prev.tokens + msg.metrics.totalTokens,
        });
    }

    if (y > 250) { doc.addPage(); y = 20; }

    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Model Distribution", 15, y);
    y += 8;

    // Table header
    doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
    doc.rect(15, y - 4, 180, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text("Model", 20, y);
    doc.text("Messages", 80, y);
    doc.text("Tokens", 110, y);
    doc.text("CO2 (g)", 140, y);
    doc.text("Share", 170, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const [modelId, mdata] of modelMap.entries()) {
        const pct = sessionStats.totalCO2 > 0 ? ((mdata.co2 / sessionStats.totalCO2) * 100).toFixed(1) : "0";
        doc.text(modelId, 20, y);
        doc.text(String(mdata.count), 80, y);
        doc.text(String(mdata.tokens), 110, y);
        doc.text(mdata.co2.toFixed(4), 140, y);
        doc.text(pct + "%", 170, y);

        // Mini bar
        const barW = Math.min(parseFloat(pct), 100) * 0.2;
        doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
        doc.rect(180, y - 2.5, barW, 3, "F");
        y += 6;
    }

    // ======== LAST SECTION: Verification + QR + Signature ========
    if (y > 220) { doc.addPage(); y = 20; }

    y += 5;
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Verification & Methodology", 15, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);

    // Methodology text (wrapped)
    const methodLines = doc.splitTextToSize(verification.methodology, 120);
    for (const line of methodLines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 15, y);
        y += 4;
    }

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text("Data Sources:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    for (const src of verification.dataSources) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text("- " + src, 18, y);
        y += 4;
    }

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(`Confidence Level: ${verification.confidence.toUpperCase()}`, 15, y);
    y += 4;
    doc.text(`Standard: ${verification.standard}`, 15, y);

    // ---- QR Code ----
    try {
        const qrDataUrl = await QRCode.toDataURL(
            `ACRM Report Verification\nID: ${reportHash}\nCO2: ${ghg.totalGHG.toFixed(4)}g\nDate: ${now.toISOString()}`,
            { width: 100, margin: 1 }
        );
        const qrX = 155;
        const qrY = y - 35;
        const qrSize = 32;
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
        doc.setFontSize(6);
        doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
        doc.text("Scan to verify", qrX + qrSize / 2, qrY + qrSize + 3, { align: "center" });
    } catch {
        // QR generation failed silently
    }

    // ---- Digital Signature Block ----
    y += 12;
    if (y > 255) { doc.addPage(); y = 20; }

    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.8);
    doc.line(15, y, 195, y);
    y += 6;

    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Verified by ACRM Platform", 15, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(`Report Hash: ${reportHash}`, 15, y);
    y += 4;
    doc.text(`Timestamp: ${now.toISOString()}`, 15, y);
    y += 4;
    doc.text("GHG Protocol Corporate Standard | ISO 14064-1:2018", 15, y);

    // ---- Page footers ----
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
        doc.text(
            `ACRM Carbon Report - ${reportHash} - Page ${i}/${pageCount}`,
            105, 290, { align: "center" }
        );
    }

    doc.save(`acrm-ghg-report-${now.toISOString().slice(0, 10)}.pdf`);
}
