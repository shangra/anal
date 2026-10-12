'use strict';

class ProductConfigError extends Error {
  constructor(message, issues = [], options = {}) {
    super(message, options);
    this.name = 'ProductConfigError';
    this.code = 'INVALID_PRODUCT_CONFIG';
    this.issues = issues;
  }
}

class AssembleError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AssembleError';

    // options может быть объектом контекста ИЛИ массивом issues
    if (Array.isArray(options)) {
      this.issues = options;
    } else {
      const { code, stage, packageName, cause } = options;
      if (code !== undefined) this.code = code;
      if (stage !== undefined) this.stage = stage;
      if (packageName !== undefined) this.packageName = packageName;
      if (cause !== undefined) this.cause = cause;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AssembleError);
    }
  }
}

module.exports = {
  ProductConfigError,
  AssembleError,
};
