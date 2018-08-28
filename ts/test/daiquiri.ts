import {Parser} from "../daiquiri/Daiquiri";
import {expect} from 'chai';

describe('daiquiri', function () {
    const query1 = `
        ({entity: A})
        &
        (
           {entity: B, component: C(a.b="c", b.c="e", a.b=false)} &
           {component: D} & ({set: bar} | {set: bar})
        ) | {set: bar}
    `;
    const query2 = `
        {entity: E} | {entity: E}
    `;
    const query3 = `
        ({set: foo} | {entity: Foo} | {component: Comp(aasd.asdf.csd <= 2411)}) & {entity: Blah}
    `;

    it('should create a parser given class names and properties', () => {
        console.time('buckets');
        const foo = Parser.createDataStore({
            foo: query1,
            bar: query2,
            baz: query3
        });
        console.timeEnd('buckets');
        expect(foo).to.be.false;
    })
});
