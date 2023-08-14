/** @module persistence */
import { AnyValueMap } from 'pip-services3-commons-nodex';
import { IIdentifiable } from 'pip-services3-commons-nodex';
import { IdGenerator } from 'pip-services3-commons-nodex';

import { IWriter } from 'pip-services3-data-nodex';
import { IGetter } from 'pip-services3-data-nodex';
import { ISetter } from 'pip-services3-data-nodex';

import { MongoDbPersistence } from './MongoDbPersistence';
import { FindOneAndReplaceOptions, FindOneAndUpdateOptions } from 'mongodb';

/**
 * Abstract persistence component that stores data in MongoDB
 * and implements a number of CRUD operations over data items with unique ids.
 * The data items must implement [[https://pip-services3-nodex.github.io/pip-services3-commons-nodex/interfaces/data.iidentifiable.html IIdentifiable]] interface.
 * 
 * In basic scenarios child classes shall only override [[getPageByFilter]],
 * [[getListByFilter]] or [[deleteByFilter]] operations with specific filter function.
 * All other operations can be used out of the box. 
 * 
 * In complex scenarios child classes can implement additional operations by 
 * accessing <code>this._collection</code> and <code>this._model</code> properties.

 * ### Configuration parameters ###
 * 
 * - collection:                  (optional) MongoDB collection name
 * - connection(s):    
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 27017)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):    
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/auth.icredentialstore.html ICredentialStore]]
 *   - username:                  (optional) user name
 *   - password:                  (optional) user password
 * - options:
 *   - max_pool_size:             (optional) maximum connection pool size (default: 2)
 *   - keep_alive:                (optional) enable connection keep alive (default: true)
 *   - connect_timeout:           (optional) connection timeout in milliseconds (default: 5000)
 *   - socket_timeout:            (optional) socket timeout in milliseconds (default: 360000)
 *   - auto_reconnect:            (optional) enable auto reconnection (default: true)
 *   - reconnect_interval:        (optional) reconnection interval in milliseconds (default: 1000)
 *   - max_page_size:             (optional) maximum page size (default: 100)
 *   - replica_set:               (optional) name of replica set
 *   - ssl:                       (optional) enable SSL connection (default: false)
 *   - auth_source:               (optional) authentication source
 *   - auth_user:                 (optional) authentication user name
 *   - auth_password:             (optional) authentication user password
 *   - debug:                     (optional) enable debug output (default: false).
 * 
 * ### References ###
 * 
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/log.ilogger.html ILogger]] components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code> (optional) Credential stores to resolve credentials
 * 
 * ### Example ###
 * 
 *     class MyMongoDbPersistence extends MongoDbPersistence<MyData, string> {
 *    
 *     public constructor() {
 *         base("mydata", new MyDataMongoDbSchema());
 *     }
 * 
 *     private composeFilter(filter: FilterParams): any {
 *         filter = filter || new FilterParams();
 *         let criteria = [];
 *         let name = filter.getAsNullableString('name');
 *         if (name != null)
 *             criteria.push({ name: name });
 *         return criteria.length > 0 ? { $and: criteria } : null;
 *     }
 * 
 *     public getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams,
 *         callback: (err: any, page: DataPage<MyData>) => void): void {
 *         base.getPageByFilter(correlationId, this.composeFilter(filter), paging, null, null, callback);
 *     }
 * 
 *     }
 * 
 *     let persistence = new MyMongoDbPersistence();
 *     persistence.configure(ConfigParams.fromTuples(
 *         "host", "localhost",
 *         "port", 27017
 *     ));
 * 
 *     persitence.open("123", (err) => {
 *         ...
 *     });
 * 
 *     persistence.create("123", { id: "1", name: "ABC" }, (err, item) => {
 *         persistence.getPageByFilter(
 *             "123",
 *             FilterParams.fromTuples("name", "ABC"),
 *             null,
 *             (err, page) => {
 *                 console.log(page.data);          // Result: { id: "1", name: "ABC" }
 * 
 *                 persistence.deleteById("123", "1", (err, item) => {
 *                    ...
 *                 });
 *             }
 *         )
 *     });
 */
export class IdentifiableMongoDbPersistence<T extends IIdentifiable<K>, K> extends MongoDbPersistence<T>
    implements IWriter<T, K>, IGetter<T, K>, ISetter<T> {
    /**
     * Flag to turn on automated string ID generation
     */
    protected _autoGenerateId: boolean = true;

    /**
     * Creates a new instance of the persistence component.
     * 
     * @param collection    (optional) a collection name.
     */
    public constructor(collection: string) {
        super(collection);
    }

    /** 
     * Converts the given object from the public partial format.
     * 
     * @param value     the object to convert from the public partial format.
     * @returns         the initial object.
     */
    protected convertFromPublicPartial(value: any): any {
        return this.convertFromPublic(value);
    }    
    
    /**
     * Gets a list of data items retrieved by given unique ids.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param ids               ids of data items to be retrieved
     * @returns                 a data list.
     */
    public async getListByIds(correlationId: string, ids: K[]): Promise<T[]> {
        let filter = {
            _id: { $in: ids }
        }
        return await this.getListByFilter(correlationId, filter, null, null);
    }

    /**
     * Gets a data item by its unique id.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param id                an id of data item to be retrieved.
     * @returns                 the found data item.
     */
    public async getOneById(correlationId: string, id: K): Promise<T> {
        let filter = { _id: id };

        let item: any = await this._collection.findOne(filter);

        if (item == null) {
            this._logger.trace(correlationId, "Nothing found from %s with id = %s", this._collectionName, id);
        } else {
            this._logger.trace(correlationId, "Retrieved from %s with id = %s", this._collectionName, id);
        }

        item = this.convertToPublic(item);
        return item;
    }

    /**
     * Creates a data item.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be created.
     * @returns                 theß created item.
     */
    public async create(correlationId: string, item: T): Promise<T> {
        if (item == null) {
            return;
        }

        // Assign unique id
        let newItem: any = Object.assign({}, item);
        delete newItem.id;
        newItem._id = item.id;

        // Auto generate id
        if (this.isEmpty(newItem._id) && this._autoGenerateId) {
            newItem._id = IdGenerator.nextLong();
        }

        return await super.create(correlationId, newItem);
    }

    /**
     * Sets a data item. If the data item exists it updates it,
     * otherwise it create a new data item.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              a item to be set.
     * @returns                 the updated item.
     */
    public async set(correlationId: string, item: T): Promise<T> {
        if (item == null) {
            return null;
        }

        // Assign unique id
        let newItem: any = Object.assign({}, item);
        delete newItem.id;
        newItem._id = item.id;

        // Auto generate id
        if (this.isEmpty(newItem._id) && this._autoGenerateId) {
            newItem._id = IdGenerator.nextLong();
        }

        newItem = this.convertFromPublic(newItem);

        let filter = {
            _id: newItem._id
        };

        let options: FindOneAndReplaceOptions = {
            returnDocument: 'after',
            upsert: true
        };
   
        let result = await this._collection.findOneAndReplace(filter, newItem, options);

        if (item != null) {
            this._logger.trace(correlationId, "Set in %s with id = %s", this._collectionName, item.id);
        }
            
        newItem = result ? this.convertToPublic(result.value) : null;
        return newItem;
    }

    /**
     * Updates a data item.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be updated.
     * @returns                 the updated item.
     */
    public async update(correlationId: string, item: T): Promise<T> {
        if (item == null || this.isEmpty(item.id)) {
            return null;
        }

        let newItem = Object.assign({}, item);
        delete newItem.id;
        newItem = this.convertFromPublic(newItem);

        let filter = { _id: item.id };
        let update = { $set: newItem };
        let options: FindOneAndUpdateOptions = {
            returnDocument: 'after'
        };

        let result = await this._collection.findOneAndUpdate(filter, update, options);

        this._logger.trace(correlationId, "Updated in %s with id = %s", this._collectionName, item.id);

        newItem = result ? this.convertToPublic(result.value) : null;
        return newItem;
    }

    /**
     * Updates only few selected fields in a data item.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param id                an id of data item to be updated.
     * @param data              a map with fields to be updated.
     * @returns                 the updated item.
     */
    public async updatePartially(correlationId: string, id: K, data: AnyValueMap): Promise<T> {            
        if (data == null || id == null || this.isEmpty(id)) {
            return null;
        }

        let newItem = data.getAsObject();
        newItem = this.convertFromPublicPartial(newItem);

        let filter = { _id: id };
        let update = { $set: newItem };
        let options: FindOneAndUpdateOptions = {
            returnDocument: 'after'
        };

        let result = await this._collection.findOneAndUpdate(filter, update, options);

        this._logger.trace(correlationId, "Updated partially in %s with id = %s", this._collectionName, id);

        newItem = result ? this.convertToPublic(result.value) : null;
        return newItem;
    }

    /**
     * Deleted a data item by it's unique id.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param id                an id of the item to be deleted
     * @returns                 the deleted item.
     */
    public async deleteById(correlationId: string, id: K): Promise<T> {
        let filter = { _id: id };
        
        let result = await this._collection.findOneAndDelete(filter);

        this._logger.trace(correlationId, "Deleted from %s with id = %s", this._collectionName, id);

        let oldItem = result ? this.convertToPublic(result.value) : null;
        return oldItem;
    }

    /**
     * Deletes multiple data items by their unique ids.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param ids               ids of data items to be deleted.
     */
    public async deleteByIds(correlationId: string, ids: K[]): Promise<void> {
        let filter = { _id: { $in: ids } };
        return await this.deleteByFilter(correlationId, filter);
    }

    /**
     * Checks if value is empty
     * @param value any value
     * @returns true if value empty, other false
     */
    protected isEmpty(value: any) {
        const type = typeof value;
        if (value !== null && type === 'object' || type === 'function') {
            const props = Object.keys(value);
            if (props.length === 0) { 
                return true;
            } 
        } 
        return !value;
    }
}
