import { FilterParams } from 'pip-services3-commons-nodex';
import { PagingParams } from 'pip-services3-commons-nodex';
import { DataPage } from 'pip-services3-commons-nodex';

import { IdentifiableMongoDbPersistence } from '../../src/persistence/IdentifiableMongoDbPersistence';
import { Dummy } from '../fixtures/Dummy';
import { IDummyPersistence } from '../fixtures/IDummyPersistence';

export class DummyMongoDbPersistence 
    extends IdentifiableMongoDbPersistence<Dummy, string> 
    implements IDummyPersistence
{
    public constructor() {
        super('dummies');
    }

    protected defineSchema(): void {
        this.ensureIndex({ key: 1 });
    }

    public getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams): Promise<DataPage<Dummy>> {
        filter = filter || new FilterParams();
        let key = filter.getAsNullableString('key');

        let filterCondition: any = {};
        if (key != null)
            filterCondition['key'] = key;

        return super.getPageByFilter(correlationId, filterCondition, paging, null, null);
    }

    public getCountByFilter(correlationId: string, filter: FilterParams): Promise<number> {
        filter = filter || new FilterParams();
        let key = filter.getAsNullableString('key');

        let filterCondition: any = {};
        if (key != null)
            filterCondition['key'] = key;

        return super.getCountByFilter(correlationId, filterCondition);
    }
}