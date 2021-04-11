"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentifiableMongoDbPersistence = exports.MongoDbPersistence = exports.MongoDbConnection = void 0;
/**
 * @module persistence
 * @preferred
 *
 */
var MongoDbConnection_1 = require("../connect/MongoDbConnection");
Object.defineProperty(exports, "MongoDbConnection", { enumerable: true, get: function () { return MongoDbConnection_1.MongoDbConnection; } });
var MongoDbPersistence_1 = require("./MongoDbPersistence");
Object.defineProperty(exports, "MongoDbPersistence", { enumerable: true, get: function () { return MongoDbPersistence_1.MongoDbPersistence; } });
var IdentifiableMongoDbPersistence_1 = require("./IdentifiableMongoDbPersistence");
Object.defineProperty(exports, "IdentifiableMongoDbPersistence", { enumerable: true, get: function () { return IdentifiableMongoDbPersistence_1.IdentifiableMongoDbPersistence; } });
//# sourceMappingURL=index.js.map