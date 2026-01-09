
/**
 * SỔ TAY THẦY THỊNH - BACKEND
 */

function getSettings() {
  return {
    studentSheetName: "DS_HocSinh",
    evalSheetName: "DanhGia"
  };
}

function getOrCreateSheet(name, headers, color) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers)
      .setBackground(color)
      .setFontColor("white")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    
    if (name === "DS_HocSinh") {
      sheet.getRange(2, 1, 3, 4).setValues([
        ["10", "10A1", "1", "Nguyễn Văn Mẫu"],
        ["11", "11B2", "1", "Trần Thị Demo"],
        ["12", "12C3", "1", "Lê Văn Ví Dụ"]
      ]);
    }
  }
  return sheet;
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const settings = getSettings();
    const studentSheet = getOrCreateSheet(settings.studentSheetName, [["Khoi", "Lop", "Nhom", "Ten_HS"]], "#2563eb");
    getOrCreateSheet(settings.evalSheetName, [["ThoiGian", "Lop", "Ten_HS", "Loai_DanhGia", "Noi_Dung", "Diem"]], "#10b981");

    if (action === 'getStudents') {
      const data = studentSheet.getDataRange().getValues();
      data.shift();
      const students = data
        .filter(row => row[3] && row[3].toString().trim() !== "")
        .map(row => ({
          khoi: String(row[0]),
          lop: String(row[1]),
          nhom: String(row[2]),
          tenHS: String(row[3])
        }));
      return createResponse(students);
    }
    return createResponse({ error: "Không hợp lệ" }, 400);
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

function doPost(e) {
  try {
    const settings = getSettings();
    const evalSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(settings.evalSheetName);
    const data = JSON.parse(e.postData.contents);
    evalSheet.appendRow([new Date(), data.lop, data.tenHS, data.loai, data.noiDung, data.diem]);
    return createResponse({ status: "success" });
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('💎 SỔ TAY THẦY THỊNH')
      .addItem('Kiểm tra & Cài đặt Sheet', 'setupSheetsManual')
      .addToUi();
}

function setupSheetsManual() {
  const settings = getSettings();
  getOrCreateSheet(settings.studentSheetName, [["Khoi", "Lop", "Nhom", "Ten_HS"]], "#2563eb");
  getOrCreateSheet(settings.evalSheetName, [["ThoiGian", "Lop", "Ten_HS", "Loai_DanhGia", "Noi_Dung", "Diem"]], "#10b981");
  SpreadsheetApp.getUi().alert("Hệ thống", "Dữ liệu đã sẵn sàng!", SpreadsheetApp.getUi().ButtonSet.OK);
}
