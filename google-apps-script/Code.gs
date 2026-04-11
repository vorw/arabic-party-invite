function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RSVP") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("RSVP");

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Response", "Event", "SubmittedAt"]);
    }

    var payload = {};

    if (e.postData && e.postData.contents && String(e.postData.type || "").indexOf("application/json") > -1) {
      payload = JSON.parse(e.postData.contents || "{}");
    } else {
      payload = {
        name: e.parameter.name,
        response: e.parameter.response,
        event: e.parameter.event,
        submittedAt: e.parameter.submittedAt
      };
    }

    var name = String(payload.name || "").trim();
    var response = String(payload.response || "").trim();
    var eventName = String(payload.event || "").trim();
    var submittedAt = String(payload.submittedAt || "").trim();

    if (!name || !response) {
      return jsonResponse_({ ok: false, error: "Missing required fields" });
    }

    sheet.appendRow([
      new Date(),
      name,
      response,
      eventName,
      submittedAt
    ]);

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error) });
  }
}

function doGet() {
  return jsonResponse_({ ok: true, service: "rsvp-endpoint" });
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
