"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const process = require('process');
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const DummyPersistenceFixture_1 = require("../fixtures/DummyPersistenceFixture");
const DummyMongoDbPersistence_1 = require("./DummyMongoDbPersistence");
suite('DummyMongoDbPersistence', () => {
    let persistence;
    let fixture;
    let mongoUri = process.env['MONGO_SERVICE_URI'];
    let mongoHost = process.env['MONGO_SERVICE_HOST'] || 'localhost';
    let mongoPort = process.env['MONGO_SERVICE_PORT'] || 27017;
    let mongoDatabase = process.env['MONGO_DB'] || 'test';
    let mongoUser = process.env['MONGO_USER'] || '';
    let mongoPass = process.env['MONGO_PASS'] || '';
    if (mongoUri == null && mongoHost == null) {
        return;
    }
    setup(() => __awaiter(void 0, void 0, void 0, function* () {
        let dbConfig = pip_services3_commons_nodex_1.ConfigParams.fromTuples('connection.uri', mongoUri, 'connection.host', mongoHost, 'connection.port', mongoPort, 'connection.database', mongoDatabase, 'credential.username', mongoUser, 'credential.password', mongoPass);
        persistence = new DummyMongoDbPersistence_1.DummyMongoDbPersistence();
        persistence.configure(dbConfig);
        fixture = new DummyPersistenceFixture_1.DummyPersistenceFixture(persistence);
        yield persistence.open(null);
        yield persistence.clear(null);
    }));
    teardown(() => __awaiter(void 0, void 0, void 0, function* () {
        yield persistence.close(null);
    }));
    test('Crud Operations', () => __awaiter(void 0, void 0, void 0, function* () {
        yield fixture.testCrudOperations();
    }));
    test('Batch Operations', () => __awaiter(void 0, void 0, void 0, function* () {
        yield fixture.testBatchOperations();
    }));
});
//# sourceMappingURL=DummyMongoDbPersistence.test.js.map