const process = require('process');

import { ConfigParams, ConnectionException } from 'pip-services3-commons-nodex';
import { Descriptor } from 'pip-services3-commons-nodex';
import { References } from 'pip-services3-commons-nodex';
import { MongoDbConnection } from '../../src/connect/MongoDbConnection';
import { DummyPersistenceFixture } from '../fixtures/DummyPersistenceFixture';
import { DummyMongoDbPersistence } from './DummyMongoDbPersistence';

suite('DummyMongoDbConnection', ()=> {
    let connection: MongoDbConnection;
    let persistence: DummyMongoDbPersistence;
    let fixture: DummyPersistenceFixture;

    let mongoUri = process.env['MONGO_SERVICE_URI'];
    let mongoHost = process.env['MONGO_SERVICE_HOST'] || 'localhost';
    let mongoPort = process.env['MONGO_SERVICE_PORT'] || 27017;
    let mongoDatabase = process.env['MONGO_DB'] || 'test';
    let mongoUser = process.env['MONGO_USER'] || '';
    let mongoPass = process.env['MONGO_PASS'] || '';

    if (mongoUri == null && mongoHost == null) {
        return;
    }

    setup(async () => {
        let dbConfig = ConfigParams.fromTuples(
            'connection.uri', mongoUri,
            'connection.host', mongoHost,
            'connection.port', mongoPort,
            'connection.database', mongoDatabase,
            'credential.username', mongoUser,
            'credential.password', mongoPass,
        );

        connection = new MongoDbConnection();
        connection.configure(dbConfig);

        persistence = new DummyMongoDbPersistence();
        persistence.setReferences(References.fromTuples(
            new Descriptor("pip-services", "connection", "mongodb", "default", "1.0"), connection
        ));

        fixture = new DummyPersistenceFixture(persistence);

        await connection.open(null);
        await persistence.open(null);
        await persistence.clear(null);
    });

    teardown(async () => {
        await connection.close(null);
        await persistence.close(null);
    });

    test('Crud Operations', async () => {
        await fixture.testCrudOperations();
    });

    test('Batch Operations', async () => {
        await fixture.testBatchOperations();
    });
});