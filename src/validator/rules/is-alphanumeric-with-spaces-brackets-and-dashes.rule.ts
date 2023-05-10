import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from "class-validator";
import deburr from "lodash.deburr";

export default function IsAlphanumericWithSpacesBracketsAndDashes(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isAlphanumericWithSpacesBracketsAndDashes',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== "string") return false;

                    let text = deburr(value);
                    return /^[A-Za-z0-9 ()-]*$/u.test(text);
                },
                defaultMessage(validationArguments?: ValidationArguments): string {
                    return 'Text can only contain: small and big letters, numbers, brackets, spaces and dashes!';
                }
            },
        });
    };
}
