import nearley, {Grammar} from 'nearley';
import {IBucketConfig, IParsedBucketGroup} from "./Types";
import DataStore, {IDataStore} from "./DataStore";
import {ParserRules, ParserStart} from "./Grammar";

export interface IParser {
    parse(str: string): IParsedBucketGroup;
    createDataStore(options: IBucketConfig) : IDataStore
}

const grammar = Grammar.fromCompiled({ParserStart, ParserRules});

export const Parser : IParser = {
    parse(str: string) : IParsedBucketGroup {
        const parser = new nearley.Parser(grammar);
        parser.feed(str);
        return parser.results[0];
    },
    createDataStore(options: IBucketConfig) {
        return DataStore(Parser).compile(options);
    }
};

export default Parser;
