/**
 * 
 * @param {string} sValue - String where the ending slashes get removed
 */
function removeEndingSlash(sValue) {
  if (sValue.endsWith('/')) {
    sValue = sValue.slice(0, -1);
  }
  return sValue;
}

module.exports = {
  removeEndingSlash: removeEndingSlash
}