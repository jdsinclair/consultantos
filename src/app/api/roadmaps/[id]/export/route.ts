import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRoadmap } from "@/lib/db/roadmaps";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const roadmap = await getRoadmap(params.id, user.id);

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";

    // Build tag lookup
    const tagLookup = new Map(
      (roadmap.tags || []).map((t: any) => [t.id, t.name])
    );

    // Helper to get tag names from IDs
    const getTagNames = (tagIds: string[] | undefined) => {
      if (!tagIds || tagIds.length === 0) return "";
      return tagIds.map((id) => tagLookup.get(id) || id).join(", ");
    };

    // Helper to format subtasks
    const formatSubtasks = (subtasks: any[] | undefined) => {
      if (!subtasks || subtasks.length === 0) return "";
      return subtasks
        .map((s) => `${s.done ? "✓" : "○"} ${s.title}`)
        .join("\n");
    };

    // Create workbook
    const wb = XLSX.utils.book_new();

    // 1. Overview Sheet
    const overviewData = [
      ["Roadmap Export"],
      [],
      ["Title", roadmap.title],
      ["Vision", roadmap.vision || ""],
      ["Objective", roadmap.objective || ""],
      ["Planning Horizon", roadmap.planningHorizon || ""],
      ["Status", roadmap.status || "draft"],
      [],
      ["Export Date", new Date().toISOString().split("T")[0]],
      ["Total Items", roadmap.items?.length || 0],
      ["Backlog Items", roadmap.backlog?.length || 0],
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    wsOverview["!cols"] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

    // 2. Items Sheet
    const itemsHeader = [
      "Title",
      "Swimlane",
      "Timeframe",
      "Status",
      "Size",
      "Description",
      "Notes",
      "Why",
      "Success Criteria",
      "Tags",
      "Subtasks",
      "Subtasks Done",
      "Subtasks Total",
    ];

    // Get swimlane lookup
    const swimlaneLookup = new Map(
      (roadmap.swimlanes || []).map((s: any) => [s.key, s.label || s.name])
    );

    const itemsData = (roadmap.items || []).map((item: any) => [
      item.title || "",
      swimlaneLookup.get(item.swimlaneKey) || item.swimlaneKey || "",
      item.timeframe || "",
      item.status || "idea",
      item.size || "",
      item.description || "",
      item.notes || "",
      item.why || "",
      item.successCriteria || "",
      getTagNames(item.tags),
      formatSubtasks(item.subtasks),
      item.subtasks?.filter((s: any) => s.done).length || 0,
      item.subtasks?.length || 0,
    ]);

    const wsItems = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsData]);
    wsItems["!cols"] = [
      { wch: 30 }, // Title
      { wch: 15 }, // Swimlane
      { wch: 12 }, // Timeframe
      { wch: 12 }, // Status
      { wch: 8 },  // Size
      { wch: 40 }, // Description
      { wch: 30 }, // Notes
      { wch: 30 }, // Why
      { wch: 30 }, // Success Criteria
      { wch: 20 }, // Tags
      { wch: 40 }, // Subtasks
      { wch: 12 }, // Subtasks Done
      { wch: 12 }, // Subtasks Total
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, "Items");

    // 3. Backlog Sheet
    const backlogHeader = [
      "Title",
      "Description",
      "Notes",
      "Suggested Swimlane",
      "Suggested Timeframe",
      "Suggested Size",
      "Suggested Impact",
      "Tags",
    ];

    const backlogData = (roadmap.backlog || []).map((item: any) => [
      item.title || "",
      item.description || "",
      item.notes || "",
      item.suggestedSwimlane || "",
      item.suggestedTimeframe || "",
      item.suggestedSize || "",
      item.suggestedImpact || "",
      getTagNames(item.tags),
    ]);

    const wsBacklog = XLSX.utils.aoa_to_sheet([backlogHeader, ...backlogData]);
    wsBacklog["!cols"] = [
      { wch: 30 }, // Title
      { wch: 40 }, // Description
      { wch: 30 }, // Notes
      { wch: 18 }, // Suggested Swimlane
      { wch: 18 }, // Suggested Timeframe
      { wch: 15 }, // Suggested Size
      { wch: 15 }, // Suggested Impact
      { wch: 20 }, // Tags
    ];
    XLSX.utils.book_append_sheet(wb, wsBacklog, "Backlog");

    // 4. Swimlanes Sheet
    const swimlanesHeader = ["Name", "Key", "Color", "Order"];
    const swimlanesData = (roadmap.swimlanes || []).map((lane: any) => [
      lane.label || lane.name || "",
      lane.key || "",
      lane.color || "",
      lane.order ?? "",
    ]);

    const wsSwimlanes = XLSX.utils.aoa_to_sheet([swimlanesHeader, ...swimlanesData]);
    wsSwimlanes["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSwimlanes, "Swimlanes");

    // 5. Tags Sheet
    if (roadmap.tags && roadmap.tags.length > 0) {
      const tagsHeader = ["Name", "Color", "ID"];
      const tagsData = roadmap.tags.map((tag: any) => [
        tag.name || "",
        tag.color || "",
        tag.id || "",
      ]);

      const wsTags = XLSX.utils.aoa_to_sheet([tagsHeader, ...tagsData]);
      wsTags["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 36 }];
      XLSX.utils.book_append_sheet(wb, wsTags, "Tags");
    }

    // Generate file based on format
    const filename = `${roadmap.title.replace(/[^a-z0-9]/gi, "_")}_roadmap`;

    if (format === "csv") {
      // For CSV, export items only (most useful for import into other tools)
      const csvContent = XLSX.utils.sheet_to_csv(wsItems);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // XLSX format
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error("Failed to export roadmap:", error);
    return NextResponse.json(
      { error: "Failed to export roadmap" },
      { status: 500 }
    );
  }
}
