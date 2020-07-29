/** Converts a map into an object to be used to stringify.
 * @param {Map} map The map to convert to a string.
 * @returns {Object} The object the map has been converted into.
 */
exports.convertNestMapsToJSON = function convertNestMapsToJSON(map) {
    let listObjects = {};
    for (let [key, value] of map) {
        if (value instanceof Map) {
            listObjects[key] = convertNestMapsToJSON(value);
        } else {
            listObjects[key] = value;
        }
    }
    return listObjects;
};

/** Converts a JSON object to a Map with the last level being a JSON object.
 * @param {Object} JSONObject The JSON object to be converted to a map.
 * @returns {Map} The map generated from the JSON object.
 */
exports.JSONObjectToMap = function JSONObjectToMap(JSONObject) {
    let map = new Map();
    let object = {};
    let objectRet = false;
    for (let key of Object.keys(JSONObject)) {
        if (JSONObject[key] instanceof Object) {
            map.set(key, JSONObjectToMap(JSONObject[key]));
        } else {
            objectRet = true;
            object[key.toString()] = JSONObject[key];
        }
    }

    if (objectRet) return object;
    return map;
};
