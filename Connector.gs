function getConfig() {
  var config = cc.getConfig();

  config
    .newInfo()
    .setId('introduction')
    .setText(
      'Enter information for connecting to orion.'
    );

  config
    .newTextInput()
    .setId('orionUrl')
    .setName('Orion URL')
    .setHelpText('')
    .setPlaceholder("https://your-orion:1026");

  config
    .newTextInput()
    .setId('fiwareService')
    .setName('FIWARE Service');

  config
    .newTextInput()
    .setId('fiwareServicePath')
    .setName('Fiware Service Path')
    .setPlaceholder("/");

  config
    .newTextInput()
    .setId('entityType')
    .setName('Entity Type')
    .setHelpText('Entity Type')
    .setPlaceholder("Room");

  config
    .newTextInput()
    .setId('authHeaderName')
    .setName('Authorization Header Name')
    .setHelpText('')
    .setPlaceholder("Authorization");

  config
    .newTextInput()
    .setId('authHeaderValue')
    .setName('Authorization Value')
    .setHelpText('')
    .setPlaceholder("Bearer aaaabbbb-cccc-dddd-0000-111122223333");

  config.setDateRangeRequired(true);

  return config.build();
}

function getFields(request) {
  var fields = cc.getFields();
  var types = cc.FieldType;

  fields
    .newDimension()
    .setId("id")
    .setName("id")
    .setType(types.TEXT);

  var attributes = fetchAttributes(request)["attrs"]
  for (var attribute in attributes) {
    console.log("attribute " + JSON.stringify(attribute));
    var type = undefined;
    for (var index in attributes[attribute]["types"]) {
      if (attributes[attribute]["types"][index] == "Number" ||
          attributes[attribute]["types"][index] == "Float") {
        type = types.NUMBER;
      } else if (attributes[attribute]["types"][index] == "Text") {
        type = types.TEXT;
      } else if (attributes[attribute]["types"][index] == "DateTime") {
        type = types.YEAR_MONTH_DAY_HOUR
      } else if (attributes[attribute]["types"][index] == "geo:json") {
        type = types.LATITUDE_LONGITUDE
      } else if (attributes[attribute]["types"][index] == "geo:point") {
        type = types.LATITUDE_LONGITUDE
      } else if (attributes[attribute]["types"][index] == "StructuredValue") {
        type = types.TEXT
      }
    }
    fields
      .newDimension()
      .setId(attribute)
      .setName(attribute)
      .setType(type);
  }
  return fields;
}

function getSchema(request) {
  return {schema: getFields(request).build()};
}

function getData(request) {
  var requestedFields = getFields(request).forIds(
    request.fields.map(function(field) {
      return field.name;
    })
  );

  try {
    var apiResponse = fetchDataFromApi(request);
    var data = getFormattedData(apiResponse, requestedFields);
  } catch (e) {
    cc.newUserError()
      .setDebugText('Error fetching data from API. Exception details: ' + e)
      .setText(
        'The connector has encountered an unrecoverable error. Please try again later, or file an issue if this error persists.'
      )
      .throwException();
  }

  return {
    schema: requestedFields.build(),
    rows: data
  };
}

function fetchDataFromApi(request) {
  var url = request.configParams.orionUrl + "/v2/entities?limit=1000&type=" + request.configParams.entityType
  var options = {
    method: "get",
    headers: {
      [request.configParams.authHeaderName]: request.configParams.authHeaderValue,
      "Fiware-Service": request.configParams.fiwareService,
      "Fiware-ServicePath": request.configParams.fiwareServicePath
    }
  }
  try {
    var response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

function fetchAttributes(request) {
  var url = request.configParams.orionUrl + "/v2/types/" + request.configParams.entityType + "?limit=1000";
  var options = {
    method: "get",
    headers: {
      [request.configParams.authHeaderName]: request.configParams.authHeaderValue,
      "Fiware-Service": request.configParams.fiwareService,
      "Fiware-ServicePath": request.configParams.fiwareServicePath
    }
  }
  try {
    var response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

function getFormattedData(response, requestedFields) {
  var data = [];
  response.forEach(function (entity) {
    var row = [];
    requestedFields.asArray().forEach(function (attrName) {
      if (attrName.getId() == "id") {
        row.push(entity["id"]);
      } else if (entity[attrName.getId()]) {
        if (entity[attrName.getId()]["type"] == "Number" ||
            entity[attrName.getId()]["type"] == "Float" ||
            entity[attrName.getId()]["type"] == "Text" ||
            entity[attrName.getId()]["type"] == "DateTime") {
          row.push(entity[attrName.getId()]["value"]);
        } else if (entity[attrName.getId()]["type"] == "geo:json") {
          row.push(entity[attrName.getId()]["value"]['coordinates'][1] + "," + entity[attrName.getId()]["value"]['coordinates'][0]);
        } else if (entity[attrName.getId()]["type"] == "geo:point") {
          row.push(entity[attrName.getId()]["value"]);
        } else if (entity[attrName.getId()]["type"] == "StructuredValue") {
          row.push(null);
        } else {
          if (attrName.getType() == cc.FieldType.TEXT) {
            row.push("");
          } else if (attrName.getType() == cc.FieldType.YEAR_MONTH_DAY_HOUR) {
            row.push(null);
          } else if (attrName.getType() == cc.FieldType.LATITUDE_LONGITUDE) {
            row.push(null);
          } else {
            row.push(0);
          }
        }
      } else {
        if (attrName.getType() == cc.FieldType.TEXT) {
          row.push("");
        } else if (attrName.getType() == cc.FieldType.YEAR_MONTH_DAY_HOUR) {
          row.push(null);
        } else if (attrName.getType() == cc.FieldType.LATITUDE_LONGITUDE) {
          row.push(null);
        } else {
          row.push(0);
        }
      }
    });
    data.push({"values": row});
  });
  return data;
}

function isAdminUser() {
  return false;
}
