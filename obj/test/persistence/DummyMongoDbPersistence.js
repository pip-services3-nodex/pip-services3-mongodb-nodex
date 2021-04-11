"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DummyMongoDbPersistence = void 0;
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const IdentifiableMongoDbPersistence_1 = require("../../src/persistence/IdentifiableMongoDbPersistence");
class DummyMongoDbPersistence extends IdentifiableMongoDbPersistence_1.IdentifiableMongoDbPersistence {
    constructor() {
        super('dummies');
    }
    defineSchema() {
        this.ensureIndex({ key: 1 });
    }
    getPageByFilter(correlationId, filter, paging) {
        filter = filter || new pip_services3_commons_nodex_1.FilterParams();
        let key = filter.getAsNullableString('key');
        let filterCondition = {};
        if (key != null)
            filterCondition['key'] = key;
        return super.getPageByFilter(correlationId, filterCondition, paging, null, null);
    }
    getCountByFilter(correlationId, filter) {
        filter = filter || new pip_services3_commons_nodex_1.FilterParams();
        let key = filter.getAsNullableString('key');
        let filterCondition = {};
        if (key != null)
            filterCondition['key'] = key;
        return super.getCountByFilter(correlationId, filterCondition);
    }
}
exports.DummyMongoDbPersistence = DummyMongoDbPersistence;
//# sourceMappingURL=DummyMongoDbPersistence.js.map