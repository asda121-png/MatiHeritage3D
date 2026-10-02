/** Formatted Local Cultural Inventory export (Excel with layout + spacing) */
const MatiLciExport = (() => {
  const BORDER_THIN = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  const HEADER_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E3D" },
  };

  const HEADER_FONT = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
    name: "Calibri",
  };

  const SECTION_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  const INVENTORY_COLUMN_WIDTHS = [6, 34, 28, 18, 24, 18, 58, 12, 14, 18, 24, 20];

  function estimateWrappedLines(text, charsPerLine) {
    const value = String(text ?? "");
    if (!value) return 1;
    return value
      .split("\n")
      .reduce(
        (total, line) =>
          total + Math.max(1, Math.ceil(Math.max(line.length, 1) / charsPerLine)),
        0,
      );
  }

  function estimateInventoryRowHeight(row) {
    const lines = Math.max(
      estimateWrappedLines(row.location, 26),
      estimateWrappedLines(row.description, 52),
      estimateWrappedLines(row.declaration, 22),
      estimateWrappedLines(row.category, 22),
      2,
    );
    return Math.min(180, Math.max(30, lines * 15 + 8));
  }

  function styleHeaderCell(cell) {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = BORDER_THIN;
  }

  function styleSectionCell(cell, { align = "left" } = {}) {
    cell.font = { bold: true, size: 11, name: "Calibri", color: { argb: "FF0F172A" } };
    cell.fill = SECTION_FILL;
    cell.alignment = { vertical: "middle", horizontal: align, wrapText: true };
    cell.border = BORDER_THIN;
  }

  function styleDataCell(cell, { align = "left", bold = false } = {}) {
    cell.font = {
      bold,
      size: 10,
      name: "Calibri",
      color: { argb: "FF1E293B" },
    };
    cell.alignment = { vertical: "top", horizontal: align, wrapText: true };
    cell.border = BORDER_THIN;
  }

  function addSummaryTable(sheet, startRow, title, rows) {
    const titleRow = sheet.getRow(startRow);
    titleRow.height = 24;
    const titleCell = sheet.getCell(startRow, 1);
    titleCell.value = title;
    sheet.mergeCells(startRow, 1, startRow, 2);
    styleSectionCell(titleCell);

    const headerRow = sheet.getRow(startRow + 1);
    headerRow.height = 22;
    const labelHeader = sheet.getCell(startRow + 1, 1);
    const valueHeader = sheet.getCell(startRow + 1, 2);
    labelHeader.value = "Item";
    valueHeader.value = "Count";
    styleHeaderCell(labelHeader);
    styleHeaderCell(valueHeader);

    rows.forEach((entry, index) => {
      const rowIndex = startRow + 2 + index;
      const row = sheet.getRow(rowIndex);
      row.height = 22;
      const labelCell = sheet.getCell(rowIndex, 1);
      const valueCell = sheet.getCell(rowIndex, 2);
      labelCell.value = entry.label;
      valueCell.value = entry.value;
      styleDataCell(labelCell);
      styleDataCell(valueCell, { align: "center", bold: entry.emphasis });
      if (entry.emphasis) {
        labelCell.font = { ...labelCell.font, bold: true };
      }
    });

    return startRow + 2 + rows.length;
  }

  function buildSummarySheet(workbook, summary) {
    const sheet = workbook.addWorksheet("Summary", {
      views: [{ showGridLines: false }],
      properties: { defaultRowHeight: 20 },
    });

    sheet.columns = [
      { width: 42 },
      { width: 14 },
    ];

    sheet.mergeCells("A1:B1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "MATI LOCAL CULTURAL INVENTORY";
    titleCell.font = { bold: true, size: 16, name: "Calibri", color: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:B2");
    const subtitleCell = sheet.getCell("A2");
    subtitleCell.value =
      "City Government of Mati — City Tourism and Promotions Office";
    subtitleCell.font = {
      italic: true,
      size: 11,
      name: "Calibri",
      color: { argb: "FF475569" },
    };
    subtitleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    sheet.getRow(2).height = 22;

    sheet.getRow(3).height = 10;

    let nextRow = addSummaryTable(sheet, 4, "HERITAGE SUMMARY", [
      { label: "Built Heritage (Tangible Immovable)", value: summary.built },
      { label: "Natural Heritage", value: summary.natural },
      { label: "Intangible Cultural Heritage", value: summary.intangible },
    ]);

    nextRow += 2;

    nextRow = addSummaryTable(sheet, nextRow, "MULTIMEDIA SUMMARY", [
      { label: "Photos", value: summary.totalPhotos },
      { label: "Videos", value: summary.totalVideos },
      { label: "Audio", value: summary.totalAudio },
      { label: "3D Models", value: summary.totalModels },
    ]);

    nextRow += 2;

    const usersTitleRow = sheet.getRow(nextRow);
    usersTitleRow.height = 24;
    const usersTitle = sheet.getCell(nextRow, 1);
    usersTitle.value = "PORTAL USERS";
    sheet.mergeCells(nextRow, 1, nextRow, 2);
    styleSectionCell(usersTitle);

    const usersRow = sheet.getRow(nextRow + 1);
    usersRow.height = 22;
    const usersLabel = sheet.getCell(nextRow + 1, 1);
    const usersValue = sheet.getCell(nextRow + 1, 2);
    usersLabel.value = "Registered Portal Users";
    usersValue.value = summary.registeredUsers;
    styleDataCell(usersLabel);
    styleDataCell(usersValue, { align: "center" });

    sheet.getCell(nextRow + 3, 1).value = `Generated: ${new Date().toLocaleString("en-PH")}`;
    sheet.getCell(nextRow + 3, 1).font = {
      size: 9,
      italic: true,
      color: { argb: "FF64748B" },
      name: "Calibri",
    };
  }

  function buildInventorySheet(workbook, rows) {
    const sheet = workbook.addWorksheet("Inventory Records", {
      views: [{ state: "frozen", ySplit: 3, activeCell: "A4" }],
      properties: { defaultRowHeight: 20 },
    });

    sheet.columns = INVENTORY_COLUMN_WIDTHS.map((width) => ({ width }));

    sheet.mergeCells(1, 1, 1, MatiAdminStore.LCI_COLUMNS.length);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = "LOCAL CULTURAL INVENTORY RECORDS";
    titleCell.font = { bold: true, size: 14, name: "Calibri", color: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 28;

    sheet.mergeCells(2, 1, 2, MatiAdminStore.LCI_COLUMNS.length);
    const noteCell = sheet.getCell(2, 1);
    noteCell.value =
      "In compliance with Section 14 of Republic Act No. 10066 (National Cultural Heritage Act) as amended by Republic Act No. 11961";
    noteCell.font = { size: 9, name: "Calibri", color: { argb: "FF475569" } };
    noteCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    sheet.getRow(2).height = 28;
    sheet.getRow(3).height = 8;

    const headerRow = sheet.getRow(4);
    headerRow.height = 42;
    MatiAdminStore.LCI_COLUMNS.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.label;
      styleHeaderCell(cell);
    });

    rows.forEach((row, rowIndex) => {
      const excelRow = sheet.getRow(5 + rowIndex);
      excelRow.height = estimateInventoryRowHeight(row);

      MatiAdminStore.LCI_COLUMNS.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1);
        cell.value = row[column.key] ?? "";
        const centered = column.key === "no" || column.key === "multimedia";
        styleDataCell(cell, { align: centered ? "center" : "left" });
      });

      if (rowIndex % 2 === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        });
      }
    });

    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + rows.length, column: MatiAdminStore.LCI_COLUMNS.length },
    };
  }

  async function exportInventory() {
    if (typeof ExcelJS === "undefined") {
      MatiAdminStore.exportLciInventoryCsv();
      return "csv";
    }

    const summary = MatiAdminStore.buildLciSummary();
    const rows = MatiAdminStore.buildLciInventoryRows();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mati Heritage 3D Admin";
    workbook.created = new Date();

    buildSummarySheet(workbook, summary);
    buildInventorySheet(workbook, rows);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `mati-local-cultural-inventory-${summary.year}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    return "xlsx";
  }

  return { exportInventory };
})();
