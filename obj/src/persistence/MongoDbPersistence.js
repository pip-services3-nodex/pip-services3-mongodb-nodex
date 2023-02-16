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
exports.MongoDbPersistence = void 0;
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_2 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_3 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_4 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_5 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_6 = require("pip-services3-commons-nodex");
const pip_services3_components_nodex_1 = require("pip-services3-components-nodex");
const MongoDbConnection_1 = require("../connect/MongoDbConnection");
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
class MongoDbPersistence {
    /**
     * Creates a new instance of the persistence component.
     *
     * @param collection    (optional) a collection name.
     */
    constructor(collection) {
        this._indexes = [];
        /**
         * The dependency resolver.
         */
        this._dependencyResolver = new pip_services3_commons_nodex_6.DependencyResolver(MongoDbPersistence._defaultConfig);
        /**
         * The logger.
         */
        this._logger = new pip_services3_components_nodex_1.CompositeLogger();
        this._maxPageSize = 100;
        this._collectionName = collection;
    }
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config) {
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
    setReferences(references) {
        this._references = references;
        this._logger.setReferences(references);
        // Get connection
        this._dependencyResolver.setReferences(references);
        this._connection = this._dependencyResolver.getOneOptional('connection');
        // Or create a local one
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        }
        else {
            this._localConnection = false;
        }
    }
    /**
     * Unsets (clears) previously set references to dependent components.
     */
    unsetReferences() {
        this._connection = null;
    }
    createConnection() {
        let connection = new MongoDbConnection_1.MongoDbConnection();
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
    ensureIndex(keys, options) {
        if (keys == null)
            return;
        this._indexes.push({
            keys: keys,
            options: options
        });
    }
    /**
     * Clears all auto-created objects
     */
    clearSchema() {
        this._indexes = [];
    }
    /**
     * Defines database schema via auto create objects or convenience methods.
     */
    defineSchema() {
        // Todo: override in chile classes
    }
    /**
     * Converts object value from internal to public format.
     *
     * @param value     an object in internal format to convert.
     * @returns converted object in public format.
     */
    convertToPublic(value) {
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
    convertFromPublic(value) {
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
    isOpen() {
        return this._opened;
    }
    /**
     * Opens the component.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    open(correlationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._opened) {
                return;
            }
            if (this._connection == null) {
                this._connection = this.createConnection();
                this._localConnection = true;
            }
            if (this._localConnection) {
                yield this._connection.open(correlationId);
            }
            if (this._connection == null) {
                throw new pip_services3_commons_nodex_5.InvalidStateException(correlationId, 'NO_CONNECTION', 'MongoDB connection is missing');
            }
            if (!this._connection.isOpen()) {
                throw new pip_services3_commons_nodex_4.ConnectionException(correlationId, "CONNECT_FAILED", "MongoDB connection is not opened");
            }
            this._opened = false;
            this._client = this._connection.getConnection();
            this._db = this._connection.getDatabase();
            this._databaseName = this._connection.getDatabaseName();
            try {
                let collection = yield this._db.collection(this._collectionName);
                // Define database schema
                this.defineSchema();
                // Recreate indexes
                for (let index of this._indexes) {
                    yield collection.createIndex(index.keys, index.options);
                    let options = index.options || {};
                    let indexName = options.name || Object.keys(index.keys).join(',');
                    this._logger.debug(correlationId, "Created index %s for collection %s", indexName, this._collectionName);
                }
                this._opened = true;
                this._collection = collection;
                this._logger.debug(correlationId, "Connected to mongodb database %s, collection %s", this._databaseName, this._collectionName);
            }
            catch (ex) {
                this._db = null;
                this._client == null;
                throw new pip_services3_commons_nodex_4.ConnectionException(correlationId, "CONNECT_FAILED", "Connection to mongodb failed").withCause(ex);
            }
        });
    }
    /**
     * Closes component and frees used resources.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    close(correlationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._opened) {
                return;
            }
            if (this._connection == null) {
                throw new pip_services3_commons_nodex_5.InvalidStateException(correlationId, 'NO_CONNECTION', 'MongoDb connection is missing');
            }
            if (this._localConnection) {
                yield this._connection.close(correlationId);
            }
            this._opened = false;
            this._client = null;
            this._db = null;
            this._collection = null;
        });
    }
    /**
     * Clears component state.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    clear(correlationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Return error if collection is not set
            if (this._collectionName == null) {
                throw new Error('Collection name is not defined');
            }
            yield this._collection.deleteMany({});
        });
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
    getPageByFilter(correlationId, filter, paging, sort, select) {
        return __awaiter(this, void 0, void 0, function* () {
            // Adjust max item count based on configuration
            paging = paging || new pip_services3_commons_nodex_2.PagingParams();
            let skip = paging.getSkip(-1);
            let take = paging.getTake(this._maxPageSize);
            let pagingEnabled = paging.total;
            // Configure options
            let options = {};
            if (skip >= 0)
                options.skip = skip;
            options.limit = take;
            if (sort != null)
                options.sort = sort;
            let items = yield this._collection.find(filter, options).project(select).toArray();
            if (items != null) {
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._collectionName);
            }
            items = items || [];
            items = items.map(this.convertToPublic);
            let count = null;
            if (pagingEnabled) {
                count = yield this._collection.countDocuments(filter);
            }
            return new pip_services3_commons_nodex_3.DataPage(items, count);
        });
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
    getCountByFilter(correlationId, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            let count = yield this._collection.countDocuments(filter);
            if (count != null) {
                this._logger.trace(correlationId, "Counted %d items in %s", count, this._collectionName);
            }
            return count;
        });
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
    getListByFilter(correlationId, filter, sort, select) {
        return __awaiter(this, void 0, void 0, function* () {
            // Configure options
            let options = {};
            if (sort != null)
                options.sort = sort;
            let items = yield this._collection.find(filter, options).project(select).toArray();
            if (items != null) {
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._collectionName);
            }
            items = items || [];
            items = items.map(this.convertToPublic);
            return items;
        });
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
    getOneRandom(correlationId, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            let count = yield this._collection.countDocuments(filter);
            let pos = Math.trunc(Math.random() * count);
            let options = {
                skip: pos >= 0 ? pos : 0,
                limit: 1,
            };
            let items = yield this._collection.find(filter, options).toArray();
            let item = (items != null && items.length > 0) ? items[0] : null;
            if (item == null) {
                this._logger.trace(correlationId, "Random item wasn't found from %s", this._collectionName);
            }
            else {
                this._logger.trace(correlationId, "Retrieved random item from %s", this._collectionName);
            }
            item = this.convertToPublic(item);
            return item;
        });
    }
    /**
     * Creates a data item.
     *
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be created.
     * @returns                 the created item.
     */
    create(correlationId, item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (item == null) {
                return null;
            }
            let newItem = this.convertFromPublic(item);
            let result = yield this._collection.insertOne(newItem);
            this._logger.trace(correlationId, "Created in %s with id = %s", this._collectionName, newItem._id);
            if (result.acknowledged) {
                newItem = Object.assign({}, item);
                newItem.id = result.insertedId.toString();
            }
            else {
                newItem = null;
            }
            return newItem;
        });
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
    deleteByFilter(correlationId, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this._collection.deleteMany(filter);
            let count = result != null ? result.deletedCount : 0;
            this._logger.trace(correlationId, "Deleted %d items from %s", count, this._collectionName);
        });
    }
}
exports.MongoDbPersistence = MongoDbPersistence;
MongoDbPersistence._defaultConfig = pip_services3_commons_nodex_1.ConfigParams.fromTuples("collection", null, "dependencies.connection", "*:connection:mongodb:*:1.0", 
// connections.*
// credential.*
"options.max_pool_size", 2, "options.keep_alive", 1, "options.connect_timeout", 5000, "options.auto_reconnect", true, "options.max_page_size", 100, "options.debug", true);
//# sourceMappingURL=MongoDbPersistence.js.map