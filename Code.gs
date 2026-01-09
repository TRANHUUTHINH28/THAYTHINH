
/**
 * THPT PRO AI - BACKEND (GOOGLE APPS SCRIPT)
 * Hỗ trợ tự động khởi tạo và quản lý dữ liệu học sinh khi chia sẻ cho đồng nghiệp
 */

function getSettings() {
  return {
    studentSheetName: "DS_HocSinh",
    evalSheetName: "DanhGia"
  };
}

/**
 * Hàm hỗ trợ lấy hoặc tự tạo Sheet nếu chưa có.
 * Điều này giúp đồng nghiệp chỉ cần dán link là dùng được ngay mà không cần cài đặt.
 */
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
    
    // Thêm dữ liệu mẫu vào sheet học sinh để người dùng dễ hình dung
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

/**
 * Xử lý yêu cầu GET: Lấy danh sách học sinh
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const settings = getSettings();
    
    // Tự động kiểm tra và tạo sheet nếu chưa có
    const studentSheet = getOrCreateSheet(
      settings.studentSheetName, 
      [["Khoi", "Lop", "Nhom", "Ten_HS"]], 
      "#4f46e5"
    );
    
    getOrCreateSheet(
      settings.evalSheetName, 
      [["ThoiGian", "Lop", "Ten_HS", "Loai_DanhGia", "Noi_Dung", "Diem"]], 
      "#10b981"
    );

    if (action === 'getStudents') {
      const data = studentSheet.getDataRange().getValues();
      data.shift(); // Bỏ dòng tiêu đề
      
      const students = data
        .filter(row => row[3] && row[3].toString().trim() !== "") // Lọc dòng trống
        .map(row => ({
          khoi: String(row[0]),
          lop: String(row[1]),
          nhom: String(row[2]),
          tenHS: String(row[3])
        }));
        
      return createResponse(students);
    }
    
    return createResponse({ error: "Yêu cầu không hợp lệ" }, 400);
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

/**
 * Xử lý yêu cầu POST: Lưu đánh giá từ App vào Sheet
 */
function doPost(e) {
  try {
    const settings = getSettings();
    const evalSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(settings.evalSheetName);
    
    if (!evalSheet) {
      return createResponse({ error: "Sheet Đánh giá không tồn tại" }, 404);
    }

    const data = JSON.parse(e.postData.contents);
    
    // Ghi dữ liệu xuống dòng cuối cùng
    evalSheet.appendRow([
      new Date(), 
      data.lop, 
      data.tenHS, 
      data.loai, 
      data.noiDung, 
      data.diem
    ]);
    
    return createResponse({ status: "success" });
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

/**
 * Tạo phản hồi JSON chuẩn
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Tạo Menu trong Google Sheets để quản lý thủ công nếu cần
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🚀 THPT PRO AI')
      .addItem('Kiểm tra & Cài đặt Sheet', 'setupSheetsManual')
      .addToUi();
}

function setupSheetsManual() {
  const settings = getSettings();
  getOrCreateSheet(settings.studentSheetName, [["Khoi", "Lop", "Nhom", "Ten_HS"]], "#4f46e5");
  getOrCreateSheet(settings.evalSheetName, [["ThoiGian", "Lop", "Ten_HS", "Loai_DanhGia", "Noi_Dung", "Diem"]], "#10b981");
  SpreadsheetApp.getUi().alert("Hệ thống", "Hệ thống Sheet đã sẵn sàng để hoạt động!", SpreadsheetApp.getUi().ButtonSet.OK);
}
