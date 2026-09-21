/**
 * UOM Service
 * 
 * Provides centralized conversion logic between different Units of Measure.
 */

/**
 * Converts a quantity from a document UOM to the Base UOM.
 * 
 * @param {Number} quantity - The document quantity
 * @param {Number} conversionFactor - The conversion factor to base UOM
 * @returns {Number} The equivalent quantity in Base UOM
 */
const convertToBase = (quantity, conversionFactor) => {
  if (quantity == null) return 0;
  const factor = conversionFactor && conversionFactor > 0 ? conversionFactor : 1;
  return Number((quantity * factor).toFixed(6));
};

/**
 * Converts a quantity from Base UOM to a document UOM.
 * 
 * @param {Number} baseQuantity - The base quantity
 * @param {Number} conversionFactor - The conversion factor of the document UOM
 * @returns {Number} The equivalent quantity in document UOM
 */
const convertFromBase = (baseQuantity, conversionFactor) => {
  if (baseQuantity == null) return 0;
  const factor = conversionFactor && conversionFactor > 0 ? conversionFactor : 1;
  return Number((baseQuantity / factor).toFixed(6));
};

module.exports = {
  convertToBase,
  convertFromBase
};
