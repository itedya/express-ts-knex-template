import {isArray, ValidationError} from "class-validator";
import supertest from "supertest";

const convertErrorsToDotNotation = (errors: ValidationError[]): string[] => {
    return errors.map(ele => {
        const childrenConstraints = convertErrorsToDotNotation(ele.children!).map(childrenError => `${ele.property}.${childrenError}`);
        const ownErrors = Object.keys(ele.constraints!).map(constraintName => `${ele.property}.${constraintName}`);
        return [...childrenConstraints,...ownErrors];
    }).flat();
}

const removeRequestError = (errors: string[], errorName: string): string[] => {
    const index = errors.findIndex(ele => ele === errorName);
    if (index === -1) throw new Error("Error does not exist in error list! " + errorName);
    errors.splice(index, 1);
    return errors;
}

interface RequestValidationTestEntry {
    name: string,
    body: any,
    expectedErrors: string[]
}

const testValidationExceptions = async (initializeCallback: (body: any) => Promise<supertest.Response>, testCases: RequestValidationTestEntry[]) => {
    for (const testCase of testCases) {
        test(testCase.name, async () => {
            const { body } = await initializeCallback(testCase.body);
            expect(body.statusCode).toBe(400);
            expect(body.message).toBe("VALIDATION_EXCEPTION");
            expect(isArray(body.data)).toBeTruthy();

            let errors = convertErrorsToDotNotation(body.data);
            testCase.expectedErrors.forEach(expectedError => {
                errors = removeRequestError(errors, expectedError);
            });

            if (errors.length !== 0) {
                throw new Error("Unexpected errors in response! Values: " + errors.join(", "));
            }
        });
    }
}

export { testValidationExceptions, RequestValidationTestEntry, convertErrorsToDotNotation }