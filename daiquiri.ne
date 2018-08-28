@preprocessor typescript
@{%
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
%}

main ->
      _ expressionList {% objectFor(1, "statements") %}
expressionList ->
      expressionGroup _ expressionListTail {% fullAppend(0, 2) %}
expressionGroup ->
      "(" _ expressionList ")" {% makeArray(objectFor(2, "statements")) %}
    | expression {% id %}
expressionListTail ->
      expressionOperator _ expressionGroup _ expressionListTail {% expressionListTail %}
    | null {% emptyArr %}
expressionOperator ->
      "|" {% objectFor(0, 'operator') %}
    | "&" {% objectFor(0, 'operator') %}
expression ->
      ecDefinition {% id %}
ecDefinition ->
      "{" _ ecKeypairs "}" {% ecKeypairs %}
ecKeypairs ->
      ecKeypair _ ecKeypairsTail {% fullAppend(0, 2) %}
ecKeypair ->
      setKeypair {% id %}
    | entityKeypair {% id %}
    | componentKeypair {% id %}
ecKeypairsTail ->
      "," _ ecKeypair _ ecKeypairsTail {% inject({operator: '&'}, 0, fullAppend(2, 4))  %}
    | null {% emptyArr %}
entityKeypair ->
      "entity" _ ":" _ identifier {% makeArray(objectFor(4, 'entity')) %}
setKeypair ->
      "set" _ ":" _ identifier {% makeArray(objectFor(4, 'set')) %}
componentKeypair ->
      "component" _ ":" _ identifier componentData {% makeArray(componentKeypair) %}
componentData ->
      _ "(" _ componentDataKeypairs ")" {% nth(3) %}
    | null {% emptyArr %}
componentDataKeypairs ->
      componentDataKeypair _ componentDataKeypairsTail {% append(0, 2) %}
componentDataKeypair ->
      prop _ componentDataOperator _ value {% componentDataKeypair %}
componentDataKeypairsTail ->
      "," _ componentDataKeypair _ componentDataKeypairsTail {% append(2, 4) %}
    | null {% emptyArr %}
componentDataOperator ->
      "=" {% always('eq') %}
    | "<" orEq {% op('lt', 1) %}
    | ">" orEq {% op('gt', 1) %}
    | "!=" {% always('neq') %}
orEq ->
      "=" {% always('e') %}
    | null {% emptyStr %}

value ->
      number {% id %}
    | string {% id %}
    | boolean {% id %}
    | _null {% id %}
boolean ->
      "true" {% always(true) %}
    | "false" {% always(false) %}
_null ->
      "null" {% always(null) %}
string ->
      doubleString {% id %}
    | singleString {% id %}
doubleString ->
      "\"" doubleStringContents "\"" {% nth(1) %}
singleString ->
      "'" singleStringContents "'" {% nth(1) %}
doubleStringContents ->
      [^\\"] doubleStringContents {% add(0,1) %}
    | "\\" doubleEscape doubleStringContents {% add(1,2) %}
    | null {% emptyStr %}
singleStringContents ->
      [^\\"] singleStringContents {% add(0,1) %}
    | "\\" singleEscape singleStringContents {% add(1,2) %}
    | null {% emptyStr %}
doubleEscape ->
      "\"" {% always('"') %}
    | escape {% id %}
singleEscape ->
      "'" {% always("'") %}
    | escape {% id %}
escape ->
      "\\" {% always("\\") %}
    | "/"  {% always("/") %}
    | "b"  {% always("\b") %}
    | "f"  {% always("\f") %}
    | "n"  {% always("\n") %}
    | "r"  {% always("\r") %}
    | "t"  {% always("\t") %}
    | "u" hex hex hex hex {% escapeHex %}
hex -> [0-9a-fA-F]
number ->
      simpleNumber exp {% number %}
exp ->
      [eE] expTail {% add(0,1) %}
    | null {% emptyStr %}
expTail ->
      "-" digits {% add(0,1) %}
    | "+" digits {% add(0,1) %}
    | digits {% id %}
simpleNumber ->
      "-" numberValue {% add(0,1) %}
    | numberValue  {% id %}

numberValue ->
      "0" decimalTail {% add(0,1) %}
    | decimal {% id %}
    | nonZeroNumber {% id %}
nonZeroNumber ->
      nonZero digitTail decimalTail {% add(0,1,2) %}
digits ->
      digit digitTail {% add(0,1) %}
digitTail ->
      digits {% id %}
    | null {% emptyStr %}
decimal ->
      "." digits {% add(0,1) %}
decimalTail ->
      decimal {% id %}
    | null {% emptyStr %}
prop ->
      alphaUnderNum alphaUnderNumTail propTail {% add(0,1,2) %}
propTail ->
      "." prop {% add(0,1) %}
    | null {% emptyStr %}

identifier ->
      alphaUnder alphaUnderNumTail {% add(0,1) %}
alphaUnder -> [a-zA-Z] {% id %}
alphaUnderNum ->
      alphaUnder {% id %}
    | digit {% id %}
digit ->
      "0" {% id %}
    | nonZero {% id %}
nonZero -> [1-9] {% id %}
alphaUnderNumTail ->
      alphaUnderNum alphaUnderNumTail {% add(0,1) %}
    | null {% emptyStr %}

_ ->
      [\r\n\t ] _ {% emptyStr %}
    | null {% emptyStr %}
