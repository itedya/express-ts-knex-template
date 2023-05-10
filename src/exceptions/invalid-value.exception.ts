class InvalidValueException extends Error {
    private propName: string;

    constructor(propName: string) {
        super();
        this.propName = propName;
    }

    public getPropName(): string {
        return this.propName;
    }
}

export default InvalidValueException;