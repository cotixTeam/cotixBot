exports.convertNestedMapsToStringify = function convertNestedMapsToStringify(map) {
    let listObjects = {};
    for (let [key, value] of map) {
        if (value instanceof Map) {
            listObjects[key] = convertNestedMapsToStringify(value);
        } else {
            listObjects[key] = value;
        }
    }
    return listObjects;
}

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
}