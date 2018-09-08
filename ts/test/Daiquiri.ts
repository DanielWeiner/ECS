import {Parser} from "../src/daiquiri/Daiquiri";
import {expect} from 'chai';
import uuid from 'uuid/v4';
import {ECS} from "../index";
import {DELETE} from "../util/Object";

describe('daiquiri', function () {
    it('should add items to a bucket', () => {
        const daiquiri = '{entity: Foo}';
        const dataStore = Parser.createBucketStore({
            'foo': daiquiri
        });
        const entityId = uuid();

        dataStore.addEntity(entityId, ['Foo']);
        expect(dataStore.bucketHas('foo', entityId)).to.be.true;
    });

    it('should remove items from a bucket', () => {
        const daiquiri = '{entity: Foo}';
        const dataStore = Parser.createBucketStore({
            'foo': daiquiri
        });
        const entityTypes = ['Foo'];
        const entityId = uuid();

        dataStore.addEntity(entityId, entityTypes);
        dataStore.removeEntity(entityId, entityTypes);
        expect(dataStore.bucketHas('foo', entityId)).to.be.false;
    });

    it('should respect union rules', () => {
        const daiquiri = '{entity: Foo} | {entity: Bar}';
        const dataStore = Parser.createBucketStore({
            'foo': daiquiri
        });
        const entityTypes = ['Foo', 'Bar'];
        const entityId = uuid();

        dataStore.addEntity(entityId, entityTypes);
        expect(dataStore.bucketHas('foo', entityId)).to.be.true;
        dataStore.removeEntity(entityId, ['Foo']);
        expect(dataStore.bucketHas('foo', entityId)).to.be.true;
        dataStore.removeEntity(entityId, ['Bar']);
        expect(dataStore.bucketHas('foo', entityId)).to.be.false;
        dataStore.addEntity(entityId, ['Foo']);
        expect(dataStore.bucketHas('foo', entityId)).to.be.true;
    });

    it('should respect intersection rules', () => {
        const daiquiri = '{entity: Foo} & {entity: Bar}';
        const dataStore = Parser.createBucketStore({
            'foo': daiquiri
        });
        const entityTypes = ['Foo', 'Bar'];
        const entityId = uuid();

        dataStore.addEntity(entityId, entityTypes);
        expect(dataStore.bucketHas('foo', entityId)).to.be.true;
        dataStore.removeEntity(entityId, ['Foo']);
        expect(dataStore.bucketHas('foo', entityId)).to.be.false;
        dataStore.addEntity(entityId, ['Foo']);
        dataStore.removeEntity(entityId, ['Bar']);
        expect(dataStore.bucketHas('foo', entityId)).to.be.false;
        dataStore.addEntity(entityId, ['Bar']);
        expect(dataStore.bucketHas('foo', entityId)).to.be.true;
    });

    it('should make an ECS context', () => {
        console.time('createEntity');
        const player = ECS.Entity.createEntity('Human');
        console.timeEnd('createEntity');
        ;
        player.addComponent('UserControl');
        player.set('Body', {
            bodyParts: {
                leftFoot: DELETE
            }
        })

        console.log(JSON.stringify(player.get('Body'), null, 2));
        console.time('createEntity');
        const player2 = ECS.Entity.createEntity('Human');
        console.timeEnd('createEntity');

        //ECS.Entity.destroyEntity(player.id);
        ECS.System.emit('userInput', {});
        expect(ECS).to.be.true;
    })
});
