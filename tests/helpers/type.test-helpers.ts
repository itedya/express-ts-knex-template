import { validate as validateUuid, version as validateUuidVersion } from "uuid";
const isNumber = (value: any): value is number => {
    return typeof value === "number";
}

const isString = (value: any): value is string => {
    return typeof value === "string";
}

const isBoolean = (value: any): value is boolean => {
    return typeof value === "boolean";
}

const isUuid = (value: any): value is string => {
    return isString(value) && validateUuid(value) && validateUuidVersion(value) === 4;
}

const isDate = (value: any): value is Date => {
    return value instanceof Date;
}

const isStringDate = (value: any): value is Date => {
    const res = Date.parse(value)
    return !isNaN(res);
}

export { isNumber, isString, isBoolean, isUuid, isDate, isStringDate };