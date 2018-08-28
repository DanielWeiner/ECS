import nearley, {CompiledRules, Grammar} from 'nearley';
import {IBucketConfig, IParsedBucketGroup} from "./Types";
import DataStore, {IDataStore} from "./DataStore";

export interface IParser {
    parse(str: string): IParsedBucketGroup;
    createDataStore(options: IBucketConfig) : IDataStore
}

function id(d: string[]) {
    return d[0];
}
function emptyStr() {
    return "";
}
function emptyArr() : string[] {
    return [];
}

function always(v: any) {
    return () => v;
}
function nth(n: number) {
    return (d: string[]) => d[n];
}
function append(a: number, b: number) {
    return (d: (string | string[])[]) => [d[a], ...d[b]];
}

function objectFor(n: number, key: string) {
    return (d: string[]) => ({
        [key]: d[n]
    });
}
function expressionListTail(d: (string | string[])[]) {
    return [d[0], ...d[2], ...d[4]];
}
function ecKeypairs(d: string[]) {
    return nth(2)(d);
}
function add(...args: number[]) {
    return (d: string[]) => args.reduce((str, arg) => str + d[arg], '');
}
function number(d: string[]) { return Number(d[0] + d[1])}

function componentDataKeypair(d: string[]) {
    return {
        [d[0]]: {
            [d[2]]: d[4]
        }
    };
}
function componentKeypair(d: string[]) {
    return {
        ...objectFor(4, 'component')(d),
        data: d[5]
    };
}
function escapeHex(d: string[]) {const num = parseInt(add(1,2,3,4)(d), 16); return String.fromCharCode(num)}
function op(operation: string, n: number) { return (d: string[]) => operation + d[n] }
function fullAppend(a: number, b: number) {
    return (d: (string[] | string)[]) => [...d[a], ...d[b]];
}
function makeArray(fn: (arr: string[]) => any ) {
    return (d : string[]) => [fn(d)]
}
function inject(item: any, n: number, fn: (arr: string[]) => string[]) {
    return (d: string[]) => {
        const result =  fn(d);
        result.splice(n, 0, item);
        return result;
    }
}
const rules : CompiledRules = {
    Lexer: undefined,
    ParserRules: [
        {"name": "main", "symbols": ["_", "expressionList"], "postprocess": objectFor(1, "statements")},
        {"name": "expressionList", "symbols": ["expressionGroup", "_", "expressionListTail"], "postprocess": fullAppend(0, 2)},
        {"name": "expressionGroup", "symbols": [{"literal":"("}, "_", "expressionList", {"literal":")"}], "postprocess": makeArray(objectFor(2, "statements"))},
        {"name": "expressionGroup", "symbols": ["expression"], "postprocess": id},
        {"name": "expressionListTail", "symbols": ["expressionOperator", "_", "expressionGroup", "_", "expressionListTail"], "postprocess": expressionListTail},
        {"name": "expressionListTail", "symbols": [], "postprocess": emptyArr},
        {"name": "expressionOperator", "symbols": [{"literal":"|"}], "postprocess": objectFor(0, 'operator')},
        {"name": "expressionOperator", "symbols": [{"literal":"&"}], "postprocess": objectFor(0, 'operator')},
        {"name": "expression", "symbols": ["ecDefinition"], "postprocess": id},
        {"name": "ecDefinition", "symbols": [{"literal":"{"}, "_", "ecKeypairs", {"literal":"}"}], "postprocess": ecKeypairs},
        {"name": "ecKeypairs", "symbols": ["ecKeypair", "_", "ecKeypairsTail"], "postprocess": fullAppend(0, 2)},
        {"name": "ecKeypair", "symbols": ["setKeypair"], "postprocess": id},
        {"name": "ecKeypair", "symbols": ["entityKeypair"], "postprocess": id},
        {"name": "ecKeypair", "symbols": ["componentKeypair"], "postprocess": id},
        {"name": "ecKeypairsTail", "symbols": [{"literal":","}, "_", "ecKeypair", "_", "ecKeypairsTail"], "postprocess": inject({operator: '&'}, 0, fullAppend(2, 4))},
        {"name": "ecKeypairsTail", "symbols": [], "postprocess": emptyArr},
        {"name": "entityKeypair$string$1", "symbols": [{"literal":"e"}, {"literal":"n"}, {"literal":"t"}, {"literal":"i"}, {"literal":"t"}, {"literal":"y"}], "postprocess": (d) => d.join('')},
        {"name": "entityKeypair", "symbols": ["entityKeypair$string$1", "_", {"literal":":"}, "_", "identifier"], "postprocess": makeArray(objectFor(4, 'entity'))},
        {"name": "setKeypair$string$1", "symbols": [{"literal":"s"}, {"literal":"e"}, {"literal":"t"}], "postprocess": (d) => d.join('')},
        {"name": "setKeypair", "symbols": ["setKeypair$string$1", "_", {"literal":":"}, "_", "identifier"], "postprocess": makeArray(objectFor(4, 'set'))},
        {"name": "componentKeypair$string$1", "symbols": [{"literal":"c"}, {"literal":"o"}, {"literal":"m"}, {"literal":"p"}, {"literal":"o"}, {"literal":"n"}, {"literal":"e"}, {"literal":"n"}, {"literal":"t"}], "postprocess": (d) => d.join('')},
        {"name": "componentKeypair", "symbols": ["componentKeypair$string$1", "_", {"literal":":"}, "_", "identifier", "componentData"], "postprocess": makeArray(componentKeypair)},
        {"name": "componentData", "symbols": ["_", {"literal":"("}, "_", "componentDataKeypairs", {"literal":")"}], "postprocess": nth(3)},
        {"name": "componentData", "symbols": [], "postprocess": emptyArr},
        {"name": "componentDataKeypairs", "symbols": ["componentDataKeypair", "_", "componentDataKeypairsTail"], "postprocess": append(0, 2)},
        {"name": "componentDataKeypair", "symbols": ["prop", "_", "componentDataOperator", "_", "value"], "postprocess": componentDataKeypair},
        {"name": "componentDataKeypairsTail", "symbols": [{"literal":","}, "_", "componentDataKeypair", "_", "componentDataKeypairsTail"], "postprocess": append(2, 4)},
        {"name": "componentDataKeypairsTail", "symbols": [], "postprocess": emptyArr},
        {"name": "componentDataOperator", "symbols": [{"literal":"="}], "postprocess": always('eq')},
        {"name": "componentDataOperator", "symbols": [{"literal":"<"}, "orEq"], "postprocess": op('lt', 1)},
        {"name": "componentDataOperator", "symbols": [{"literal":">"}, "orEq"], "postprocess": op('gt', 1)},
        {"name": "componentDataOperator$string$1", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": (d) => d.join('')},
        {"name": "componentDataOperator", "symbols": ["componentDataOperator$string$1"], "postprocess": always('neq')},
        {"name": "orEq", "symbols": [{"literal":"="}], "postprocess": always('e')},
        {"name": "orEq", "symbols": [], "postprocess": emptyStr},
        {"name": "value", "symbols": ["number"], "postprocess": id},
        {"name": "value", "symbols": ["string"], "postprocess": id},
        {"name": "value", "symbols": ["boolean"], "postprocess": id},
        {"name": "value", "symbols": ["_null"], "postprocess": id},
        {"name": "boolean$string$1", "symbols": [{"literal":"t"}, {"literal":"r"}, {"literal":"u"}, {"literal":"e"}], "postprocess": (d) => d.join('')},
        {"name": "boolean", "symbols": ["boolean$string$1"], "postprocess": always(true)},
        {"name": "boolean$string$2", "symbols": [{"literal":"f"}, {"literal":"a"}, {"literal":"l"}, {"literal":"s"}, {"literal":"e"}], "postprocess": (d) => d.join('')},
        {"name": "boolean", "symbols": ["boolean$string$2"], "postprocess": always(false)},
        {"name": "_null$string$1", "symbols": [{"literal":"n"}, {"literal":"u"}, {"literal":"l"}, {"literal":"l"}], "postprocess": (d) => d.join('')},
        {"name": "_null", "symbols": ["_null$string$1"], "postprocess": always(null)},
        {"name": "string", "symbols": ["doubleString"], "postprocess": id},
        {"name": "string", "symbols": ["singleString"], "postprocess": id},
        {"name": "doubleString", "symbols": [{"literal":"\""}, "doubleStringContents", {"literal":"\""}], "postprocess": nth(1)},
        {"name": "singleString", "symbols": [{"literal":"'"}, "singleStringContents", {"literal":"'"}], "postprocess": nth(1)},
        {"name": "doubleStringContents", "symbols": [/[^\\"]/, "doubleStringContents"], "postprocess": add(0,1)},
        {"name": "doubleStringContents", "symbols": [{"literal":"\\"}, "doubleEscape", "doubleStringContents"], "postprocess": add(1,2)},
        {"name": "doubleStringContents", "symbols": [], "postprocess": emptyStr},
        {"name": "singleStringContents", "symbols": [/[^\\"]/, "singleStringContents"], "postprocess": add(0,1)},
        {"name": "singleStringContents", "symbols": [{"literal":"\\"}, "singleEscape", "singleStringContents"], "postprocess": add(1,2)},
        {"name": "singleStringContents", "symbols": [], "postprocess": emptyStr},
        {"name": "doubleEscape", "symbols": [{"literal":"\""}], "postprocess": always('"')},
        {"name": "doubleEscape", "symbols": ["escape"], "postprocess": id},
        {"name": "singleEscape", "symbols": [{"literal":"'"}], "postprocess": always("'")},
        {"name": "singleEscape", "symbols": ["escape"], "postprocess": id},
        {"name": "escape", "symbols": [{"literal":"\\"}], "postprocess": always("\\")},
        {"name": "escape", "symbols": [{"literal":"/"}], "postprocess": always("/")},
        {"name": "escape", "symbols": [{"literal":"b"}], "postprocess": always("\b")},
        {"name": "escape", "symbols": [{"literal":"f"}], "postprocess": always("\f")},
        {"name": "escape", "symbols": [{"literal":"n"}], "postprocess": always("\n")},
        {"name": "escape", "symbols": [{"literal":"r"}], "postprocess": always("\r")},
        {"name": "escape", "symbols": [{"literal":"t"}], "postprocess": always("\t")},
        {"name": "escape", "symbols": [{"literal":"u"}, "hex", "hex", "hex", "hex"], "postprocess": escapeHex},
        {"name": "hex", "symbols": [/[0-9a-fA-F]/]},
        {"name": "number", "symbols": ["simpleNumber", "exp"], "postprocess": number},
        {"name": "exp", "symbols": [/[eE]/, "expTail"], "postprocess": add(0,1)},
        {"name": "exp", "symbols": [], "postprocess": emptyStr},
        {"name": "expTail", "symbols": [{"literal":"-"}, "digits"], "postprocess": add(0,1)},
        {"name": "expTail", "symbols": [{"literal":"+"}, "digits"], "postprocess": add(0,1)},
        {"name": "expTail", "symbols": ["digits"], "postprocess": id},
        {"name": "simpleNumber", "symbols": [{"literal":"-"}, "numberValue"], "postprocess": add(0,1)},
        {"name": "simpleNumber", "symbols": ["numberValue"], "postprocess": id},
        {"name": "numberValue", "symbols": [{"literal":"0"}, "decimalTail"], "postprocess": add(0,1)},
        {"name": "numberValue", "symbols": ["decimal"], "postprocess": id},
        {"name": "numberValue", "symbols": ["nonZeroNumber"], "postprocess": id},
        {"name": "nonZeroNumber", "symbols": ["nonZero", "digitTail", "decimalTail"], "postprocess": add(0,1,2)},
        {"name": "digits", "symbols": ["digit", "digitTail"], "postprocess": add(0,1)},
        {"name": "digitTail", "symbols": ["digits"], "postprocess": id},
        {"name": "digitTail", "symbols": [], "postprocess": emptyStr},
        {"name": "decimal", "symbols": [{"literal":"."}, "digits"], "postprocess": add(0,1)},
        {"name": "decimalTail", "symbols": ["decimal"], "postprocess": id},
        {"name": "decimalTail", "symbols": [], "postprocess": emptyStr},
        {"name": "prop", "symbols": ["alphaUnderNum", "alphaUnderNumTail", "propTail"], "postprocess": add(0,1,2)},
        {"name": "propTail", "symbols": [{"literal":"."}, "prop"], "postprocess": add(0,1)},
        {"name": "propTail", "symbols": [], "postprocess": emptyStr},
        {"name": "identifier", "symbols": ["alphaUnder", "alphaUnderNumTail"], "postprocess": add(0,1)},
        {"name": "alphaUnder", "symbols": [/[a-zA-Z]/], "postprocess": id},
        {"name": "alphaUnderNum", "symbols": ["alphaUnder"], "postprocess": id},
        {"name": "alphaUnderNum", "symbols": ["digit"], "postprocess": id},
        {"name": "digit", "symbols": [{"literal":"0"}], "postprocess": id},
        {"name": "digit", "symbols": ["nonZero"], "postprocess": id},
        {"name": "nonZero", "symbols": [/[1-9]/], "postprocess": id},
        {"name": "alphaUnderNumTail", "symbols": ["alphaUnderNum", "alphaUnderNumTail"], "postprocess": add(0,1)},
        {"name": "alphaUnderNumTail", "symbols": [], "postprocess": emptyStr},
        {"name": "_", "symbols": [/[\s]/, "_"], "postprocess": emptyStr},
        {"name": "_", "symbols": [], "postprocess": emptyStr}
    ],
    ParserStart: "main"
};

const grammar = Grammar.fromCompiled(rules);

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
