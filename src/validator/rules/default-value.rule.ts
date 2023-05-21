import {Transform} from "class-transformer";

const DefaultValue = (defaultValue: any) => {
    return Transform((target: any) => target || defaultValue);
};

export default DefaultValue;
