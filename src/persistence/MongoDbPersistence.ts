/** @module persistence */
import { Collection, Db, Document, FindOptions } from 'mongodb';

import { IReferenceable } from 'pip-services3-commons-nodex';
import { IUnreferenceable } from 'pip-services3-commons-nodex';
import { IReferences } from 'pip-services3-commons-nodex';
import { IConfigurable } from 'pip-services3-commons-nodex';
import { IOpenable } from 'pip-services3-commons-nodex';
import { ICleanable } from 'pip-services3-commons-nodex';
import { ConfigParams } from 'pip-services3-commons-nodex';
import { PagingParams } from 'pip-services3-commons-nodex';
import { DataPage } from 'pip-services3-commons-nodex';
import { ConnectionException } from 'pip-services3-commons-nodex';
import { InvalidStateException } from 'pip-services3-commons-nodex';
import { DependencyResolver } from 'pip-services3-commons-nodex';
import { CompositeLogger } from 'pip-services3-components-nodex';

import { MongoDbConnection } from '../connect/MongoDbConnection';
import { MongoDbIndex } from './MongoDbIndex';

/**
 * Abstract persistence component that stores data in MongoDB using plain driver.
 * 
 * This is the most basic persistence component that is only
 * able to store data items of any type. Specific CRUD operations
 * over the data items must be implemented in child classes by
 * accessing <code>this._db</code> or <code>this._collection</code> properties.
 * 
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
 *     class MyMongoDbPersistence extends MongoDbPersistence<MyData> {
 *    
 *       public constructor() {
 *           base("mydata");
 *       }
 * 
 *       public async getByName(correlationId: string, name: string) {
 *         let criteria = { name: name };
 *         return await new Promise((resolve, reject) => {
 *            this._model.findOne(criteria, (err, item) => {
 *               if (err == null) resolve(item);
 *               else reject(err);
 *            });
 *         });
 *       }
 * 
 *       public async set(correlatonId: string, item: MyData) {
 *         let criteria = { name: item.name };
 *         let options = { upsert: true, new: true };
 *         return await new Promise((resolve, reject) => {
 *            this._model.findOneAndUpdate(criteria, item, options, (err, item) => {
 *               if (err == null) resolve(item);
 *               else reject(err);
 *            });
 *         });
 *       }
 * 
 *     }
 * 
 *     let persistence = new MyMongoDbPersistence();
 *     persistence.configure(ConfigParams.fromTuples(
 *         "host", "localhost",
 *         "port", 27017
 *     ));
 * 
 *     await persitence.open("123");
 * 
 *     await persistence.set("123", { name: "ABC" });
 *     let item = await persistence.getByName("123", "ABC");
 *     console.log(item);                   // Result: { name: "ABC" }
 */
export class MongoDbPersistence<T> implements IReferenceable, IUnreferenceable, IConfigurable, IOpenable, ICleanable {

    private static _defaultConfig: ConfigParams = ConfigParams.fromTuples(
        "collection", null,
        "dependencies.connection", "*:connection:mongodb:*:1.0",

        // connections.*
        // credential.*

        "options.max_pool_size", 2,
        "options.keep_alive", 1,
        "options.connect_timeout", 5000,
        "options.auto_reconnect", true,
        "options.max_page_size", 100,
        "options.debug", true
    );

    private _config: ConfigParams;
    private _references: IReferences;
    private _opened: boolean;
    private _localConnection: boolean;
    private _indexes: MongoDbIndex[] = [];

    /**
     * The dependency resolver.
     */
    protected _dependencyResolver: DependencyResolver = new DependencyResolver(MongoDbPersistence._defaultConfig);
    /** 
     * The logger.
     */
    protected _logger: CompositeLogger = new CompositeLogger();
    
    /**
     * The MongoDB connection component.
     */
    protected _connection: MongoDbConnection;

    /**
     * The MongoDB connection object.
     */
    protected _client: any;
    /**
     * The MongoDB database name.
     */
    protected _databaseName: string;
    /**
     * The MongoDB colleciton object.
     */
    protected _collectionName: string;
    /**
     * The MongoDb database object.
     */
    protected _db: Db;
    /**
     * The MongoDb collection object.
     */
    protected _collection: Collection<Document>;

    protected _maxPageSize: number = 100;

    /**
     * Creates a new instance of the persistence component.
     * 
     * @param collection    (optional) a collection name.
     */
    public constructor(collection?: string) {
        this._collectionName = collection;
    }

    /**
     * Configures component by passing configuration parameters.
     * 
     * @param config    configuration parameters to be set.
     */
    public configure(config: ConfigParams): void {
        config = config.setDefaults(MongoDbPersistence._defaultConfig);
        this._config = config;

        this._dependencyResolver.configure(config);

        this._collectionName = config.getAsStringWithDefault("collection", this._collectionName);
        this._maxPageSize = config.getAsIntegerWithDefault("options.max_page_size", this._maxPageSize);
    }

    /**
	 * Sets references to dependent components.
	 * 
	 * @param references 	references to locate the component dependencies. 
     */
    public setReferences(references: IReferences): void {
        this._references = references;
        this._logger.setReferences(references);

        // Get connection
        this._dependencyResolver.setReferences(references);
        this._connection = this._dependencyResolver.getOneOptional('connection');
        // Or create a local one
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        } else {
            this._localConnection = false;
        }
    }

    /**
	 * Unsets (clears) previously set references to dependent components. 
     */
    public unsetReferences(): void {
        this._connection = null;
    }

    private createConnection(): MongoDbConnection {
        let connection = new MongoDbConnection();
        
        if (this._config)
            connection.configure(this._config);
        
        if (this._references)
            connection.setReferences(this._references);
            
        return connection;
    }

    /**
     * Adds index definition to create it on opening
     * @param keys index keys (fields)
     * @param options index options
     */
    protected ensureIndex(keys: any, options?: any): void {
        if (keys == null) return;
        this._indexes.push(
            <MongoDbIndex> {
                keys: keys,
                options: options
            }
        );
    }

    /**
     * Clears all auto-created objects
     */
    protected clearSchema(): void {
        this._indexes = [];
    }

    /**
     * Defines database schema via auto create objects or convenience methods.
     */
    protected defineSchema(): void {
        // Todo: override in chile classes
    }

    /** 
     * Converts object value from internal to public format.
     * 
     * @param value     an object in internal format to convert.
     * @returns converted object in public format.
     */
    protected convertToPublic(value: any): any {
        if (value) {
            if (value._id != undefined) {
                value.id = value._id;
                delete value._id;
            }
        }
        return value;
    }    

    /** 
     * Convert object value from public to internal format.
     * 
     * @param value     an object in public format to convert.
     * @returns converted object in internal format.
     */
    protected convertFromPublic(value: any): any {
        if (value) {
            if (value.id != undefined) {
                value._id = value._id || value.id;
                delete value.id;
            }
        }
        return value;
    }    

    /**
	 * Checks if the component is opened.
	 * 
	 * @returns true if the component has been opened and false otherwise.
     */
    public isOpen(): boolean {
        return this._opened;
    }

    /**
	 * Opens the component.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    public async open(correlationId: string): Promise<void> {
    	if (this._opened) {
            return;
        }
        
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        }

        if (this._localConnection) {
            await this._connection.open(correlationId);
        }

        if (this._connection == null) {
            throw new InvalidStateException(correlationId, 'NO_CONNECTION', 'MongoDB connection is missing');
        }

        if (!this._connection.isOpen()) {
            throw new ConnectionException(correlationId, "CONNECT_FAILED", "MongoDB connection is not opened");
        }

        this._opened = false;

        this._client = this._connection.getConnection();
        this._db = this._connection.getDatabase();
        this._databaseName = this._connection.getDatabaseName();
        
        try {
            let collection = await this._db.collection(this._collectionName);

            // Define database schema
            this.defineSchema();

            // Recreate indexes
            for (let index of this._indexes) {
                await collection.createIndex(index.keys, index.options);

                let options = index.options || {};
                let indexName = options.name || Object.keys(index.keys).join(',');
                this._logger.debug(correlationId, "Created index %s for collection %s", indexName, this._collectionName);
            }

            this._opened = true;
            this._collection = collection;        
            this._logger.debug(correlationId, "Connected to mongodb database %s, collection %s", this._databaseName, this._collectionName);                        
        } catch (ex) {
            this._db = null;
            this._client == null;
            throw new ConnectionException(correlationId, "CONNECT_FAILED", "Connection to mongodb failed").withCause(ex);
        }
    }

    /**
	 * Closes component and frees used resources.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    public async close(correlationId: string): Promise<void> {
    	if (!this._opened) {
            return;
        }

        if (this._connection == null) {
            throw new InvalidStateException(correlationId, 'NO_CONNECTION', 'MongoDb connection is missing');
        }

        if (this._localConnection) {
            await this._connection.close(correlationId);
        }

        this._opened = false;
        this._client = null;
        this._db = null;
        this._collection = null;
    }

    /**
	 * Clears component state.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    public async clear(correlationId: string): Promise<void> {
        // Return error if collection is not set
        if (this._collectionName == null) {
            throw new Error('Collection name is not defined');
        }

        await this._collection.deleteMany({});
    }

    /**
     * Gets a page of data items retrieved by a given filter and sorted according to sort parameters.
     * 
     * This method shall be called by a public getPageByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @param paging            (optional) paging parameters
     * @param sort              (optional) sorting JSON object
     * @param select            (optional) projection JSON object
     * @returns                 a data page.
     */
    protected async getPageByFilter(correlationId: string, filter: any, paging: PagingParams, 
        sort: any, select: any): Promise<DataPage<T>> {

        // Adjust max item count based on configuration
        paging = paging || new PagingParams();
        let skip = paging.getSkip(-1);
        let take = paging.getTake(this._maxPageSize);
        let pagingEnabled = paging.total;

        // Configure options
        let options: FindOptions = {};

        if (skip >= 0) options.skip = skip;
        options.limit = take;
        if (sort != null) options.sort = sort;

        let items: any = await this._collection.find(filter, options).project(select).toArray();

        if (items != null) {
            this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._collectionName);
        }

        items = items || [];
        items = items.map(this.convertToPublic);

        let count: number = null;
        if (pagingEnabled) {
            count = await this._collection.countDocuments(filter);
            
        }
                        
        return new DataPage<T>(items, count);
    }

    /**
     * Gets a number of data items retrieved by a given filter.
     * 
     * This method shall be called by a public getCountByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @returns                 a number of filtered items.
     */
    protected async getCountByFilter(correlationId: string, filter: any): Promise<number> {
        let count = await this._collection.countDocuments(filter);

        if (count != null) {
            this._logger.trace(correlationId, "Counted %d items in %s", count, this._collectionName);
        }

        return count;
    }

    /**
     * Gets a list of data items retrieved by a given filter and sorted according to sort parameters.
     * 
     * This method shall be called by a public getListByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId    (optional) transaction id to trace execution through call chain.
     * @param filter           (optional) a filter JSON object
     * @param paging           (optional) paging parameters
     * @param sort             (optional) sorting JSON object
     * @param select           (optional) projection JSON object
     * @returns                a filtered data list.
     */
    protected async getListByFilter(correlationId: string, filter: any, sort: any, select: any): Promise<T[]> {
        // Configure options
        let options: FindOptions = {};
        if (sort != null) options.sort = sort;

        let items: any = await this._collection.find(filter, options).project(select).toArray();

        if (items != null) {
            this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._collectionName);
        }

        items = items || [];
        items = items.map(this.convertToPublic);

        return items;
    }

    /**
     * Gets a random item from items that match to a given filter.
     * 
     * This method shall be called by a public getOneRandom method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @returns                 a random item.
     */
    protected async getOneRandom(correlationId: string, filter: any): Promise<T> {
        let count = await this._collection.countDocuments(filter);

        let pos = Math.trunc(Math.random() * count);
        let options = {
            skip: pos >= 0 ? pos : 0,
            limit: 1,
        }

        let items = await this._collection.find(filter, options).toArray();


        let item: any = (items != null && items.length > 0) ? items[0] : null;

        if (item == null) {
            this._logger.trace(correlationId, "Random item wasn't found from %s", this._collectionName);
        } else {
            this._logger.trace(correlationId, "Retrieved random item from %s", this._collectionName);
        }
                
        item = this.convertToPublic(item);
        return item;
    }

    /**
     * Creates a data item.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be created.
     * @returns                 the created item.
     */
    public async create(correlationId: string, item: T): Promise<T> {
        if (item == null) {
            return null;
        }

        let newItem = this.convertFromPublic(item);

        let result = await this._collection.insertOne(newItem);

        this._logger.trace(correlationId, "Created in %s with id = %s", this._collectionName, newItem._id);

        if (result.acknowledged) {
            newItem = Object.assign({}, item);
            newItem.id = result.insertedId.toString();
        } else {
            newItem = null;
        }
        return newItem;
    }

    /**
     * Deletes data items that match to a given filter.
     * 
     * This method shall be called by a public deleteByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object.
     */
    public async deleteByFilter(correlationId: string, filter: any): Promise<void> {
        let result = await this._collection.deleteMany(filter);

        let count = result != null ? result.deletedCount : 0;
        this._logger.trace(correlationId, "Deleted %d items from %s", count, this._collectionName);
    }

}
