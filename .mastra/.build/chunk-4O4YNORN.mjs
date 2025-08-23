// src/error/index.ts
var MastraBaseError = class extends Error {
  id;
  domain;
  category;
  details = {};
  message;
  constructor(errorDefinition, originalError) {
    let error;
    if (originalError instanceof Error) {
      error = originalError;
    } else if (originalError) {
      error = new Error(String(originalError));
    }
    const message = errorDefinition.text ?? error?.message ?? "Unknown error";
    super(message, { cause: error });
    this.id = errorDefinition.id;
    this.domain = errorDefinition.domain;
    this.category = errorDefinition.category;
    this.details = errorDefinition.details ?? {};
    this.message = message;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  /**
   * Returns a structured representation of the error, useful for logging or API responses.
   */
  toJSONDetails() {
    return {
      message: this.message,
      domain: this.domain,
      category: this.category,
      details: this.details
    };
  }
  toJSON() {
    return {
      message: this.message,
      details: this.toJSONDetails(),
      code: this.id
    };
  }
  toString() {
    return JSON.stringify(this.toJSON());
  }
};
var MastraError = class extends MastraBaseError {
};

export { MastraError as M };
