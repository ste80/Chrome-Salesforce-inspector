function dataLoader() {
  // Load a blank page and then inject the HTML to work around https://bugzilla.mozilla.org/show_bug.cgi?id=792479
  // An empty string as URL loads about:blank synchronously
  var popupWin;
  if (window.unsafeWindow && window.XPCNativeWrapper) {
    // Firefox
    // Use unsafeWindow to work around https://bugzilla.mozilla.org/show_bug.cgi?id=996069
    popupWin = new XPCNativeWrapper(unsafeWindow.open('', '', 'width=850,height=800'));
  } else {
    // Chrome
    popupWin = open('', '', 'width=850,height=800');
  }
  window.addEventListener("pagehide", function() {
    // All JS runs in the parent window, and will stop working when the parent goes away. Therefore close the popup.
    popupWin.close();
  });
  var document = popupWin.document;
  document.head.innerHTML = '\
  <title>Data Loader</title>\
  <style>\
  body {\
    font-family: Arial, Helvetica, sans-serif;\
    font-size: 11px;\
  }\
  textarea {\
    display:block;\
    width: 100%;\
    resize: vertical;\
    white-space: pre;\
    word-wrap: normal;\
  }\
  #query {\
    height: 4em;\
  }\
  #data {\
    height:17em;\
  }\
  #import-result {\
    height:17em;\
  }\
  .area {\
    background-color: #F8F8F8;\
    padding: 3px;\
    border-radius: 5px;\
    border: 1px solid #E0E3E5;\
    border-top: 3px solid #1797C0;\
  }\
  h1 {\
    font-size: 1.2em;\
    margin: 0px;\
    display: inline;\
  }\
  .action-arrow {\
    text-align: center;\
  }\
  .arrow-body {\
    background-color: green;\
    width: 100px;\
    margin: 0 auto;\
    padding-top: 5px;\
  }\
  .arrow-head{\
    border-left: 50px solid transparent;\
    border-right: 50px solid transparent;\
    border-top: 15px solid green;\
    width: 0;\
    margin: 0 auto -8px;\
    position: relative;\
  }\
  .area input[type="radio"], .area input[type="checkbox"] {\
    vertical-align: middle;\
    margin: 0 2px 0 0;\
  }\
  .area label {\
    padding-left: 10px;\
  }\
  #export-help-btn, #import-help-btn {\
    float: right;\
  }\
  </style>\
  ';

  document.body.innerHTML = '\
  <div class="area">\
    <h1>Export query</h1>\
    <label><input type="checkbox" id="query-all"> Include deleted and archived records?</label>\
    <a href="#" id="export-help-btn">Export help</a>\
    <textarea id="query">select Id from Account</textarea>\
    <div id="export-help-box" hidden>\
      <p>Use for quick one-off data exports.</p>\
      <ul>\
        <li>Enter a <a href="http://www.salesforce.com/us/developer/docs/soql_sosl/" target="_blank">SOQL query</a> in the box above</li>\
        <li>Select your output format</li>\
        <li>Press Export</li>\
      </ul>\
      <p>Supports the full SOQL language. The columns in the CSV output depend on the returned data. Using subqueries may cause the output to grow rapidly. Bulk API is not supported. Large data volumes may freeze or crash your browser.</p>\
    </div>\
  </div>\
  <div class="action-arrow">\
    <div class="arrow-body"><button id="export-btn">Export</button></div>\
    <div class="arrow-head"></div>\
  </div>\
  <div class="area">\
    <h1>Data</h1>\
    <label><input type=radio name="data-format" checked id="data-format-excel"> Excel</label>\
    <label><input type=radio name="data-format"> CSV</label>\
    <label><input type=radio name="data-format" id="data-format-json"> JSON</label>\
    <textarea id="data"></textarea>\
  </div>\
  <div class="action-arrow">\
    <div class="arrow-body"><button id="import-btn">Import</button><div style="color:white;font-weight:bold;font-size:1.4em;margin-top:.3em;text-shadow:2px 2px 3px red">BETA!</div></div>\
    <div class="arrow-head"></div>\
  </div>\
  <div class="area">\
    <h1>Import result</h1>\
    <label><input type=radio name="import-action" checked id="import-action-create"> Insert</label>\
    <label><input type=radio name="import-action" id="import-action-update"> Update</label>\
    <label><input type=radio name="import-action" id="import-action-delete"> Delete</label>\
    <label>Object: <input value="Account" id="import-type"></label>\
    <a href="#" id="import-help-btn">Import help</a>\
    <textarea id="import-result"></textarea>\
    <div id="import-help-box" hidden>\
      <p>Use for quick one-off data imports. Support is currently limited and may destroy your data.</p>\
      <ul>\
        <li>Enter your CSV or Excel data in the middle box. The input must contain a header row with field API names. Empty cells insert null values. Number, date, time and checkbox values must conform to the relevant <a href="http://www.w3.org/TR/xmlschema-2/#built-in-primitive-datatypes" target="_blank">XSD datatypes</a>.</li>\
        <li>Select your input format (only Excel and CSV is supported)</li>\
        <li>Select operation (insert, update or delete)</li>\
        <li>Enter the API name of the object to import</li>\
        <li>Press Import</li>\
      </ul>\
      <p>Upsert is not supported. Bulk API is not supported. Batching is not supported (everything goes into one batch). Large data volumes may freeze or crash your browser.</p>\
    </div>\
  </div>\
  ';
  document.querySelector("#export-help-btn").addEventListener("click", function() {
    if (document.querySelector("#export-help-box").hasAttribute("hidden")) {
      document.querySelector("#export-help-box").removeAttribute("hidden");
    } else {
      document.querySelector("#export-help-box").setAttribute("hidden", "");
    }
  });
  document.querySelector("#import-help-btn").addEventListener("click", function() {
    if (document.querySelector("#import-help-box").hasAttribute("hidden")) {
      document.querySelector("#import-help-box").removeAttribute("hidden");
    } else {
      document.querySelector("#import-help-box").setAttribute("hidden", "");
    }
  });
  document.querySelector("#export-btn").addEventListener("click", function() {
    document.querySelector("#export-btn").disabled = true;
    document.querySelector("#data").value = "Exporting...";
    var query = document.querySelector("#query").value;
    var separator = document.querySelector("#data-format-excel").checked ? "\t" : ",";
    var exportAsJson = document.querySelector("#data-format-json").checked;
    var queryMethod = document.querySelector("#query-all").checked ? 'queryAll' : 'query';
    var records = [];
    askSalesforce('/services/data/v31.0/' + queryMethod + '/?q=' + encodeURIComponent(query)).then(function queryHandler(responseText) {
      var data = JSON.parse(responseText);
      var text = "";
      records = records.concat(data.records);
      if (!data.done) {
        document.querySelector("#data").value = "Exporting... Completed " +records.length + " of " + data.totalSize + " records.";
        return askSalesforce(data.nextRecordsUrl).then(queryHandler);
      }
      if (exportAsJson) {
        return JSON.stringify(records);
      }
      if (records.length == 0) {
        text += "No data exported.";
        if (data.totalSize > 0) {
          text += " " + data.totalSize + " record(s)."
        }
      } else {
        var table = [];
        /*
        Discover what columns should be in our CSV file.
        We don't want to build our own SOQL parser, so we discover the columns based on the data returned.
        This means that we cannot find the columns of cross-object relationships, when the relationship field is null for all returned records.
        We don't care, because we don't need a stable set of columns for our use case.
        */
        var header = [];
        for (var i = 0; i < records.length; i++) {
          var record = records[i];
          function discoverColumns(record, prefix) {
            for (var field in record) {
              if (field == "attributes") {
                continue;
              }
              var column = prefix + field;
              if (header.indexOf(column) < 0) {
                header.push(column);
              }
              if (typeof record[field] == "object" && record[field] != null) {
                discoverColumns(record[field], column + ".");
              }
            }
          }
          discoverColumns(record, "");
        }
        table.push(header);
        /*
        Now we have the columns, we add the records to the CSV table.
        */
        for (var i = 0; i < records.length; i++) {
          var record = records[i];
          var row = [];
          for (var c = 0; c < header.length; c++) {
            var column = header[c].split(".");
            var value = record;
            for (var f = 0; f < column.length; f++) {
              var field = column[f];
              if (typeof value != "object") {
                value = null;
              }
              if (value != null) {
                value = value[field];
              }
            }
            if (typeof value == "object" && value != null && value.attributes && value.attributes.type) {
              value = "[" + value.attributes.type + "]";
            }
            row.push(value);
          }
          table.push(row);
        }
        text = csvSerialize(table, separator);
        
        // Set the sobject type to import as the first exported sobject type
        try {
          document.querySelector("#import-type").value = records[0].attributes.type;
        } catch(e) {
          // Ignore errors
        }
      }
      return text;
    }, function(xhr) {
      if (!xhr || xhr.readyState != 4) {
        throw xhr; // Not an HTTP error response
      }
      var data = JSON.parse(xhr.responseText);
      var text = "=== ERROR ===\n";
      for (var i = 0; i < data.length; i++) {
        text += data[i].message + "\n";
      }
      return text;
    }).then( function(text) {
      document.querySelector("#data").value = text;
      document.querySelector("#export-btn").disabled = false;
    }, function(error) {
      console.error(error);
      document.querySelector("#data").value = "UNEXPECTED EXCEPTION:" + error;
      document.querySelector("#export-btn").disabled = false;
    });
  });

  document.querySelector("#import-btn").addEventListener("click", function() {

    if (document.querySelector("#data-format-json").checked) {
      document.querySelector("#import-result").value = "=== ERROR ===\nImport from JSON not supported.";
      return;
    }

    var text = document.querySelector("#data").value;
    var separator = document.querySelector("#data-format-excel").checked ? "\t" : ",";
    var data;
    try {
      data = csvParse(text, separator);
    } catch (e) {
      console.log(e);
      document.querySelector("#import-result").value = "=== ERROR ===\n" + e.message;
      document.querySelector("#data").setSelectionRange(e.offsetStart, e.offsetEnd);
      return;
    }

    if (data.length < 2) {
      document.querySelector("#import-result").value = "=== ERROR ===\nNo records to import";
      return;
    }

    var header = data.shift();

    var apiName = /^[a-zA-Z0-9_]+$/;
    for (var c = 0; c < header.length; c++) {
      if (!apiName.test(header[c])) {
        document.querySelector("#import-result").value = "=== ERROR ===\nInvalid column name: " + header[c];
        return;
      }
    }

    var action =
      document.querySelector("#import-action-create").checked ? "create"
      : document.querySelector("#import-action-update").checked ? "update"
      : document.querySelector("#import-action-delete").checked ? "delete"
      : null;
    var sobjectType = document.querySelector("#import-type").value;

    if (!apiName.test(sobjectType)) {
      document.querySelector("#import-result").value = "=== ERROR ===\nInvalid object name: " + sobjectType;
      return;
    }

    var doc = window.document.implementation.createDocument(null, action);
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var sobjects = doc.createElement("sObjects");
      var type = doc.createElement("type");
      type.textContent = sobjectType;
      sobjects.appendChild(type);
      for (var c = 0; c < row.length; c++) {
        if (row[c].trim() == "") {
          var field = doc.createElement("fieldsToNull");
          field.textContent = header[c];
          sobjects.appendChild(field);
        } else {
          var field = doc.createElement(header[c]);
          field.textContent = row[c];
          sobjects.appendChild(field);
        }
      }
      doc.documentElement.appendChild(sobjects);
    }
    var xml = new XMLSerializer().serializeToString(doc);

    document.querySelector("#import-result").value = "Importing...";

    askSalesforceSoap(xml).then(function(res) {
      var results = res.querySelectorAll("Body result");
      var successResults = [];
      var errorResults = [];
      header.push("__Id");
      header.push("__Errors");
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var row = data[i];
        row.push(result.querySelector("id").textContent);
        var errorNodes = result.querySelectorAll("errors");
        var errors = [];
        for (var e = 0; e < errorNodes.length; e++) {
          var errorNode = errorNodes[e];
          var fieldNodes = errorNode.querySelectorAll("fields");
          var fields = [];
          for (var f = 0; f < fieldNodes.length; f++) {
            var fieldNode = fieldNodes[f];
            fields.push(fieldNode.textContent);
          }
          var error = errorNode.querySelector("statusCode").textContent + ": " + errorNode.querySelector("message").textContent + " [" + fields.join(", ") + "]";
          errors.push(error);
        }
        row.push(errors.join(", "));
        if (result.querySelector("success").textContent == "true") {
          successResults.push(row);
        } else {
          errorResults.push(row);
        }
      }
      var importResultText = "Import completed with " + successResults.length + " success(es) and " + errorResults.length + " error(s).";
      if (successResults.length > 0) {
        successResults.unshift(header);
        importResultText += "\n\nSuccesses:\n" + csvSerialize(successResults, separator);
      }
      if (errorResults.length > 0) {
        errorResults.unshift(header);
        importResultText += "\n\nErrors:\n" + csvSerialize(errorResults, separator);
      }
      document.querySelector("#import-result").value = importResultText+ "\n";
    }, function(xhr) {
      if (!xhr || xhr.readyState != 4) {
        throw xhr; // Not an HTTP error response
      }
      var soapFaults = xhr.responseXML.querySelectorAll("faultstring");
      var text = "=== ERROR ===\n";
      for (var i = 0; i < soapFaults.length; i++) {
        text += soapFaults[i].textContent + "\n";
      }
      document.querySelector("#import-result").value = text;
    }).catch(function(error) {
      console.error(error);
      document.querySelector("#import-result").value = "UNEXPECTED EXCEPTION: " + error;
    });

  });

  function csvSerialize(table, separator) {
    return table.map(function(row) { return row.map(function(text) { return "\"" + ("" + (text == null ? "" : text)).replace("\"", "\"\"") + "\""; }).join(separator); }).join("\r\n");
  }

  function csvParse(csv, separator) {
    var table = [];
    var row = [];
    var offset = 0;
    while (true) {
      var text, next;
      if (offset != csv.length && csv[offset] == "\"") {
        next = csv.indexOf("\"", offset + 1);
        text = "";
        while (true) {
          if (next == -1) {
            throw {message: "Quote not closed", offsetStart: offset, offsetEnd: offset + 1};
          }
          text += csv.substring(offset + 1, next);
          offset = next + 1;
          if (offset == csv.length || csv[offset] != "\"") {
            break;
          }
          text += "\"";
          next = csv.indexOf("\"", offset + 1);
        }
      } else {
        next = csv.length;
        i = csv.indexOf(separator, offset);
        if (i != -1 && i < next) {
          next = i;
        }
        var i = csv.indexOf("\n", offset);
        if (i != -1 && i < next) {
          if (i > offset && csv[i - 1] == "\r") {
            next = i - 1;
          } else {
            next = i;
          }
        }
        text = csv.substring(offset, next);
        offset = next;
      }
      row.push(text);
      if (offset == csv.length) {
        if (row.length != 1 || row[0] != "") {
          table.push(row);
        }
        if (table.length == 0) {
          throw {message: "no data", offsetStart: 0, offsetEnd: csv.length};
        }
        var len = table[0].length;
        for (var i = 0; i < table.length; i++) {
          if (table[i].length != len) {
            throw {
              message: "row " + (i + 1) + " has " + table[i].length + " cells, expected " + len,
              offsetStart: csv.split("\n").slice(0, i).join("\n").length + 1,
              offsetEnd: csv.split("\n").slice(0, i + 1).join("\n").length
            };
          }
        }
        return table;
      } else if (csv[offset] == "\n") {
        offset++;
        table.push(row);
        row = [];
      } else if (csv[offset] == "\r" && offset + 1 < csv.length && csv[offset + 1] == "\n") {
        offset += 2;
        table.push(row);
        row = [];
      } else if (csv[offset] == separator) {
        offset++;
      } else {
        throw {message: "unexpected token '" + csv[offset] + "'", offsetStart: offset, offsetEnd: offset + 1};
      }
    }
  }
}