const CONVERT = require('xml-js');
const REQUEST = require("sync-request");
const JSONPATH = require('jsonpath');
const HELPER = require('./helper');
const fs = require('fs');

/**
 * 
 * @param {string} sEntityName - Name of the entity
 * @param {string} sPropertyName - Name of the entity property
 * @param {string} sPropertyValue - Value of the entity property
 * @param {object} oEntity - Object which holds the entity data
 */
function logToConsole(sEntityName, sPropertyName, sPropertyValue, oEntity, bVerbose) {
  const sSeparator = '----------------------------------------------------------------------------------------------------';
  const sContent = `${sSeparator}\nFound string in Entity ${sEntityName}\nProperty: ${sPropertyName}\nValue: ${sPropertyValue}\n`;
  const sVerbose = `${JSON.stringify(oEntity, null, 2)}\n`;
  console.log(sContent);

  if (bVerbose) console.log(sVerbose);
  console.log(`${sSeparator}\n\n`);
}

/**
 * 
 * @param {*} user - Username for oData logon
 * @param {*} password - Password for oData logon
 */
function authenticateUser(sUser, sPassword) {
  var token = sUser + ":" + sPassword;
  var hash = Buffer.from(token).toString('base64')
  return "Basic " + hash;
}

/**
 * 
 * @param {object} oElement - oData Entity
 */
function getNavigationProperties(oElement) {
  if (oElement) {
    return JSONPATH.query(oElement, "$..[?(@.name == 'NavigationProperty')]");
  } else {
    return [];
  }
}

/**
 *
 * @param {object} oArgs - Object that holds all commandline arguments 
 * @param {string} sEntityName - Name of the entity
 * @param {string} sPropertyName - Name of the entity property
 * @param {string} sPropertyValue - Value of the entity property
 * @param {object} oEntity - Object which holds the entity data
 */
function logToFile(oArgs, sEntityName, sPropertyName, sPropertyValue, oEntity) {
  sFilename = sEntityName.replaceAll('/', '.');
  sFilename = sFilename.replace('$expand=', '');
  const sSeparator = '----------------------------------------------------------------------------------------------------';
  if (!fs.existsSync(oArgs.output)) {
    fs.mkdirSync(oArgs.output);
  }
  const sContent = `${sSeparator}\nFound string in Entity ${sEntityName}\nProperty: ${sPropertyName}\nValue: ${sPropertyValue}\n`;
  const sVerbose = `${JSON.stringify(oEntity, null, 2)}\n`;
  if (!fs.existsSync(`${oArgs.output}/${sFilename}`)) {
    fs.writeFileSync(`${oArgs.output}/${sFilename}`, sContent);
  } else {
    fs.appendFileSync(`${oArgs.output}/${sFilename}`, sContent);
  }

  if (oArgs.verbose) {
    fs.appendFileSync(`${oArgs.output}/${sFilename}`, sVerbose);
  }
  fs.appendFileSync(`${oArgs.output}/${sFilename}`, `${sSeparator}\n\n`);

}

/**
 * 
 * @param {string} sEntityName - Name of the entity
 * @param {array} aEntities - List of all entities to search in
 * @param {string} sSearchString - String which gets searched
 * @param {boolean} bPersist - Save found results in file or write them to the output
 * @param {boolean} bCaseSensitive - Search case sensitive or case insensitive
 */
function searchForKey(sEntityName, aEntities, oArgs) {
  var sCompareLeft = '';
  var sCompareRight = '';

  aEntities.forEach(oEntity => {
    if (typeof oEntity === 'object') {
      for (sProperty in oEntity) {
        if (!sProperty.startsWith('__')) {
          if (typeof oEntity[sProperty] === 'object') {
            if (oEntity[sProperty]) {
              searchForKey(sEntityName, [oEntity[sProperty]], oArgs);
            }
          } else if (typeof oEntity[sProperty] === 'string') {
            if (!oArgs.caseSensitive) {
              sCompareLeft = sProperty.toLowerCase();
              sCompareRight = oArgs.search.trim().toLowerCase();
            } else {
              sCompareLeft = sProperty.trim();
              sCompareRight = oArgs.search.trim();
            }
            if (sCompareLeft.includes(sCompareRight)) {
              if (!oArgs.persist) {
                logToConsole(sEntityName, sProperty, oEntity[sProperty], oEntity, oArgs.verbose);
              } else {
                logToFile(oArgs, sEntityName, sProperty, oEntity[sProperty], oEntity);
              }
            }
          }
        }
      }
    }
  });
}

/**
 * 
 * @param {string} sExpand - Expand string for odata call
 * @param {object} oEntities - List of entities of odata service
 * @param {string} sEntityName - Name of the entity
 * @param {number} iDepth - Actual depth of the recursive function
 * @param {number} iMaxDepth - Maximal depth of the recursive function
 * @param {array} aExpands - List of all expand strings for the given entity
 */
function assignExpandString(sExpand, oEntities, sEntityName, iDepth, iMaxDepth, aExpands = []) {
  const oEntity = getEntities(oEntities, sEntityName);
  var aNavigationProperties = getNavigationProperties(oEntity);

  for (let index = 0; index < aNavigationProperties.length; index++) {
    sNewExpand = sExpand;
    if (!aNavigationProperties[index].attributes.ToRole.endsWith("_ref")) {
      var sNavigationProperty = aNavigationProperties[index].attributes.Name;
      var sNextNavigationProperty = aNavigationProperties[index].attributes.ToRole;
      sNewExpand += `${sNavigationProperty}/`;
      if (iDepth < iMaxDepth) {
        var iNewDepth = iDepth + 1;
        assignExpandString(sNewExpand, oEntities, sNextNavigationProperty, iNewDepth, iMaxDepth, aExpands);
      } else {
        aExpands.push(HELPER.removeEndingSlash(sNewExpand));
      }
    } else {
      var sNavigationProperty = aNavigationProperties[index].attributes.Name;
      sNewExpand += `${sNavigationProperty}`;
      aExpands.push(HELPER.removeEndingSlash(sNewExpand));
    }
  }
  return aExpands;
}

/**
 * 
 * @param {string} sUri - URL of the odata request
 * @param {string} sUser - User of the odata request
 * @param {string} sPassword - Password of the odata request
 * @param {boolean} bJson - Return response in Json format
 */
function getData(sUri, sUser, sPassword, bJson = false) {
  if (bJson) {
    const sConnector = (sUri.includes('?')) ? '&' : '?';
    sUri = (bJson) ? `${sUri}${sConnector}$format=json` : sUri;
  }
  const oResponse = REQUEST('GET', sUri, {
    headers: {
      'Authorization': authenticateUser(sUser, sPassword)
    }
  });
  try {
    const sUtf8 = oResponse.getBody('utf8');
    return sUtf8;
  } catch (error) {
    return "{}";
  }
}

/**
 * 
 * @param {object} oJson - Object which holds all the entities in JSON format
 * @param {string} sEntityName - Name of the entity
 */
function getEntities(oJson, sEntityName = undefined) {
  var aEntities = undefined;
  if (sEntityName) {
    // console.log("Name:" + sEntityName);
    oJson.forEach(element => {
      if (element.attributes.Name.toLowerCase() === sEntityName.toLowerCase()) {
        aEntities = [element];
      }
    });
  } else {
    // console.log("Name: All");
    aEntities = JSONPATH.query(oJson, "$..[?(@.name == 'EntityType')]");
  }

  return aEntities;
}

/**
 * 
 * @param {string} sUri - URI of the odata service 
 * @param {string} sUser - User of the odata request
 * @param {string} sPassword - Password of the odata request
 */
function getMetadataDocument(sUri, sUser, sPassword) {
  return JSON.parse(CONVERT.xml2json(getData(`${sUri}/$metadata`, sUser, sPassword), {
    compact: false,
    spaces: 4
  }));
}

function searchForValue(sEntityName, aEntities, oArgs) {
  var sProperty = '';
  var sCompareLeft = '';
  var sCompareRight = '';

  aEntities.forEach(oEntity => {
    if (typeof oEntity === 'object') {
      for (sProperty in oEntity) {
        if (!sProperty.startsWith('__')) {
          if (typeof oEntity[sProperty] === 'object') {
            searchForValue(sEntityName, [oEntity[sProperty]], oArgs);
          } else if (typeof oEntity[sProperty] === 'string') {
            if (!oArgs.caseSensitive) {
              sCompareLeft = oEntity[sProperty].toLowerCase();
              sCompareRight = oArgs.search.trim().toLowerCase();
            } else {
              sCompareLeft = oEntity[sProperty].trim();
              sCompareRight = oArgs.search.trim();
            }
            if (sCompareLeft.includes(sCompareRight)) {
              if (!oArgs.persist) {
                logToConsole(sEntityName, sProperty, oEntity[sProperty], oEntity, oArgs.verbose);
              } else {
                logToFile(oArgs, sEntityName, sProperty, oEntity[sProperty], oEntity);
              }
            }
          }
        }
      }
    }
  });
}

module.exports = {
  getMetadataDocument: getMetadataDocument,
  getEntities: getEntities,
  searchForValue: searchForValue,
  getData: getData,
  assignExpandString: assignExpandString,
  searchForKey: searchForKey
}