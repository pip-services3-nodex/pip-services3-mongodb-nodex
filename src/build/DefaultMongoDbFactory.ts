/** @module build */
import { Factory } from 'pip-services3-components-nodex';
import { Descriptor } from 'pip-services3-commons-nodex';

import { MongoDbConnection } from '../connect/MongoDbConnection';

/**
 * Creates MongoDb components by their descriptors.
 * 
 * @see [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/classes/build.factory.html Factory]]
 * @see [[MongoDbConnection]]
 */
export class DefaultMongoDbFactory extends Factory {
    private static readonly MongoDbConnectionDescriptor: Descriptor = new Descriptor("pip-services", "connection", "mongodb", "*", "1.0");

    /**
	 * Create a new instance of the factory.
	 */
    public constructor() {
        super();
        this.registerAsType(DefaultMongoDbFactory.MongoDbConnectionDescriptor, MongoDbConnection);
    }
}
