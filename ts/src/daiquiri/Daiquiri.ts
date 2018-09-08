import nearley, {Grammar} from 'nearley';
import {IBucketConfig, IParsedBucketGroup} from "./Types";
import DataStore, {IBucketStore, IBucketStoreProvider} from "./DataStore";
import {ParserRules, ParserStart} from "./Grammar";

export interface IParser extends IBucketStoreProvider {
    parse(str: string): IParsedBucketGroup;
}

const grammar = Grammar.fromCompiled({ParserStart, ParserRules});

export const Parser : IParser = {
    parse(str: string) : IParsedBucketGroup {
        const parser = new nearley.Parser(grammar);
        parser.feed(str);
        return parser.results[0];
    },
    createBucketStore(options: IBucketConfig) {
        return DataStore(Parser).compile(options);
    }
};

export default Parser;
