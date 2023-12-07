import { Assign, Binary, BinaryMode, Block, Expression, FunctionDecl, If, NumberLiteral, Reference, Statement, Unary, UnaryMode, Unit, VariableDecl, While } from './node.js';
import { Scanner } from './scanner.js';
import { ITokenStream } from './stream/token-stream.js';
import { TokenKind } from './token.js';

export function parse(input: string): Unit {
  const s = new Scanner(input);

  const decls = [];
  while (s.getKind() != TokenKind.EOF) {
    switch (s.getKind()) {
      case TokenKind.Fn: {
        decls.push(parseFunctionDecl(s));
        break;
      }
      case TokenKind.Var: {
        decls.push(parseVariableDecl(s));
      }
    }
  }

  return new Unit(decls, { line: 1, column: 1 });
}

function parseParams(s: ITokenStream): string[] {
  s.nextWith(TokenKind.OpenParen);
  const items = [];
  while (s.getKind() != TokenKind.CloseParen) {
    if (items.length > 0) {
      s.nextWith(TokenKind.Comma);
    }
    s.expect(TokenKind.Identifier);
    const name = s.getToken().value!;
    s.next();
    items.push(name);
  }
  s.nextWith(TokenKind.CloseParen);
  return items;
}

function parseCond(s: ITokenStream): Expression {
  s.nextWith(TokenKind.OpenParen);
  const expr = parseExpr(s);
  s.nextWith(TokenKind.CloseParen);
  return expr;
}

function parseBlock(s: ITokenStream): (Statement | Expression)[] {
  s.nextWith(TokenKind.OpenBrace);
  const steps = [];
  while (s.getKind() != TokenKind.CloseBrace) {
    steps.push(parseStep(s));
  }
  s.nextWith(TokenKind.CloseBrace);
  return steps;
}

function parseStep(s: ITokenStream): Statement | Expression {
  // NOTE: セミコロンの有無でStatementかExpressionかは変わる
  // TODO: Expression
  // TODO: Statement
  // TODO: Assign
  throw new Error('todo');
}

function parseExpr(s: ITokenStream): Expression {
  return parsePratt(s, 0);
}

function parseFunctionDecl(s: ITokenStream): FunctionDecl {
  const loc = s.getToken().loc;
  s.nextWith(TokenKind.Fn);

  s.expect(TokenKind.Identifier);
  const name = s.getToken().value!;
  s.next();

  const params = parseParams(s);
  const body = parseBlock(s);

  return new FunctionDecl(name, params, body, loc);
}

function parseVariableDecl(s: ITokenStream): VariableDecl {
  const loc = s.getToken().loc;
  s.nextWith(TokenKind.Var);

  s.expect(TokenKind.Identifier);
  const name = s.getToken().value!;
  s.next();

  let body;
  if (s.getKind() == TokenKind.Eq) {
    s.next();
    body = parseExpr(s);
  }

  s.nextWith(TokenKind.SemiColon);
  return new VariableDecl(name, body, loc);
}

function parseIf(s: ITokenStream): If {
  const loc = s.getToken().loc;
  s.nextWith(TokenKind.If);

  const cond = parseCond(s);

  const thenLoc = s.getToken().loc;
  const thenSteps = parseBlock(s);
  const thenBlock = new Block(thenSteps, thenLoc);

  let elseBlock;
  if (s.getKind() == TokenKind.Else) {
    const elseLoc = s.getToken().loc;
    s.next();
    // TODO: else if
    const elseSteps = parseBlock(s);
    elseBlock = new Block(elseSteps, elseLoc);
  }

  return new If(cond, thenBlock, elseBlock, loc);
}

function parseWhile(s: ITokenStream): While {
  const loc = s.getToken().loc;

  if (s.getKind() == TokenKind.While) {
    s.nextWith(TokenKind.While);
    const cond = parseCond(s);
    const body = parseBlock(s);
    return new While('while', cond, body, loc);
  } else {
    s.nextWith(TokenKind.Do);
    const body = parseBlock(s);
    s.nextWith(TokenKind.While);
    const cond = parseCond(s);
    return new While('do-while', cond, body, loc);
  }
}

//#region pratt parsing

type OpInfo = PrefixInfo | InfixInfo | PostfixInfo;

type PrefixInfo = { kind: 'prefix', token: PrefixToken, bp: number };
const prefixOp = (token: PrefixToken, bp: number): OpInfo => ({ kind: 'prefix', token, bp });

type PrefixToken =
  | TokenKind.Not
  | TokenKind.Plus
  | TokenKind.Minus;

type InfixInfo = { kind: 'infix', token: InfixToken, lbp: number, rbp: number };
const infixOp = (token: InfixToken, lbp: number, rbp: number): OpInfo => ({ kind: 'infix', token, lbp, rbp });

type InfixToken =
  //| TokenKind.Dot
  | TokenKind.Asterisk
  | TokenKind.Slash
  | TokenKind.Percent
  | TokenKind.Plus
  | TokenKind.Minus
  | TokenKind.Lt
  | TokenKind.Lte
  | TokenKind.Gt
  | TokenKind.Gte
  | TokenKind.Eq2
  | TokenKind.NotEq
  | TokenKind.And2
  | TokenKind.Or2;

type PostfixInfo = { kind: 'postfix', token: PostfixToken, bp: number };
const postfixOp = (token: PostfixToken, bp: number): OpInfo => ({ kind: 'postfix', token, bp });

type PostfixToken =
  | TokenKind.OpenBracket
  | TokenKind.OpenParen;

const operators: OpInfo[] = [
  postfixOp(TokenKind.OpenParen, 90),
  postfixOp(TokenKind.OpenBracket, 90),
  //infixOp(TokenKind.Dot, 90, 91),
  prefixOp(TokenKind.Not, 80),
  prefixOp(TokenKind.Plus, 80),
  prefixOp(TokenKind.Minus, 80),
  infixOp(TokenKind.Asterisk, 70, 71),
  infixOp(TokenKind.Slash, 70, 71),
  infixOp(TokenKind.Percent, 70, 71),
  infixOp(TokenKind.Plus, 60, 61),
  infixOp(TokenKind.Minus, 60, 61),
  infixOp(TokenKind.Lt, 50, 51),
  infixOp(TokenKind.Lte, 50, 51),
  infixOp(TokenKind.Gt, 50, 51),
  infixOp(TokenKind.Gte, 50, 51),
  infixOp(TokenKind.Eq2, 40, 41),
  infixOp(TokenKind.NotEq, 40, 41),
  infixOp(TokenKind.And2, 30, 31),
  infixOp(TokenKind.Or2, 20, 21),
];

function parsePratt(s: ITokenStream, minBp: number): Expression {
  // pratt parsing
  // https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html
  const kind = s.getKind();
  const prefix = operators.find((x): x is PrefixInfo => x.kind == 'prefix' && x.token == kind);
  let left: Expression;
  if (prefix != null) {
    // prefix
    left = parsePrefix(s, prefix);
  } else {
    left = parseAtom(s);
  }
  while (true) {
    const kind = s.getKind();
    // const postfix = operators.find((x): x is PostfixInfo => x.kind == 'postfix' && x.token == kind);
    // if (postfix != null) {
    //   // postfix
    //   if (postfix.bp < minBp) {
    //     break;
    //   }
    //   left = parsePostfix(s, left, postfix);
    //   continue;
    // }
    const infix = operators.find((x): x is InfixInfo => x.kind == 'infix' && x.token == kind);
    if (infix != null) {
      // infix
      if (infix.lbp < minBp) {
        break;
      }
      left = parseInfix(s, left, infix);
      continue;
    }
    break;
  }
  return left;
}

function parsePrefix(s: ITokenStream, info: PrefixInfo): Expression {
  const loc = s.getToken().loc;
  s.next();
  const right = parsePratt(s, info.bp);

  let mode: UnaryMode;
  switch (info.token) {
    case TokenKind.Not: {
      mode = 'not';
      break;
    }
    case TokenKind.Plus: {
      mode = 'plus';
      break;
    }
    case TokenKind.Minus: {
      mode = 'minus';
      break;
    }
  }

  return new Unary(mode, right, loc);
}

// function parsePostfix(s: ITokenStream, left: Expression, info: PostfixInfo): Expression {
//   const loc = s.getToken().loc;
//   s.next();
//   switch (info.token) {
//     case TokenKind.OpenBracket: {
//       // index access
//       const index = parseExpr(s);
//       s.nextWith(TokenKind.CloseBracket);
//       return createIndexAccess(loc, left, index);
//     }
//     case TokenKind.OpenParen: {
//       // call
//       const args: Expression[] = [];
//       if (s.getKind() != TokenKind.CloseParen) {
//         args.push(parseExpr(s));
//         while (s.getKind() == (TokenKind.Comma)) {
//           s.next();
//           if (s.getKind() == (TokenKind.CloseParen)) {
//             break;
//           }
//           args.push(parseExpr(s));
//         }
//       }
//       s.nextWith(TokenKind.CloseParen);
//       return createCall(loc, left, args);
//     }
//   }
// }

function parseInfix(s: ITokenStream, left: Expression, info: InfixInfo): Expression {
  const loc = s.getToken().loc;
  s.next();
  const right = parsePratt(s, info.rbp);
  // if (info.token == TokenKind.Dot) {
  //   // field access
  //   if (right.kind !== 'Reference') {
  //     throw new Error(`Reference is expected. ${right.loc.line + 1}:${right.loc.column + 1}`);
  //   }
  //   return createFieldAccess(loc, right.name, left);
  // }

  let mode: BinaryMode;
  switch (info.token) {
    // case TokenKind.Dot: {
    //   mode = '';
    //   break;
    // }
    case TokenKind.Asterisk: {
      mode = 'mul';
      break;
    }
    case TokenKind.Slash: {
      mode = 'div';
      break;
    }
    case TokenKind.Percent: {
      mode = 'rem';
      break;
    }
    case TokenKind.Plus: {
      mode = 'add';
      break;
    }
    case TokenKind.Minus: {
      mode = 'sub';
      break;
    }
    case TokenKind.Lt: {
      mode = 'lt';
      break;
    }
    case TokenKind.Lte: {
      mode = 'lte';
      break;
    }
    case TokenKind.Gt: {
      mode = 'gt';
      break;
    }
    case TokenKind.Gte: {
      mode = 'gte';
      break;
    }
    case TokenKind.Eq2: {
      mode = 'eq';
      break;
    }
    case TokenKind.NotEq: {
      mode = 'neq';
      break;
    }
    case TokenKind.And2: {
      mode = 'and';
      break;
    }
    case TokenKind.Or2: {
      mode = 'or';
      break;
    }
  }

  return new Binary(mode, left, right, loc);
}

/**
 * ```text
 * <Atom> = <NumberLiteral> / <BoolLiteral> / <StringLiteral> / <StructExpr> / <Array> / <IfExpr> / <Identifier> / "(" <Expr> ")"
 * ```
*/
function parseAtom(s: ITokenStream): Expression {
  const loc = s.getToken().loc;
  switch (s.getKind()) {
    case TokenKind.NumberLiteral: {
      const source = s.getToken().value!;
      s.next();
      const value = Number(source);
      return new NumberLiteral(value, loc);
    }
    case TokenKind.Identifier: {
      const name = s.getToken().value!;
      s.next();
      return new Reference(name, loc);
    }
    // case TokenKind.New: {
    //   s.next();
    //   s.expect(TokenKind.Identifier);
    //   const name = s.getIdentValue();
    //   s.next();
    //   s.nextWith(TokenKind.OpenBrace);
    //   const fields: StructExprField[] = [];
    //   if (s.getKind() != (TokenKind.CloseBrace)) {
    //     fields.push(parseStructExprField(s));
    //     while (s.getKind() == (TokenKind.Comma)) {
    //       s.next();
    //       if (s.getKind() == (TokenKind.CloseBrace)) {
    //         break;
    //       }
    //       fields.push(parseStructExprField(s));
    //     }
    //   }
    //   s.nextWith(TokenKind.CloseBrace);
    //   return createStructExpr(loc, name, fields);
    // }
    case TokenKind.If: {
      return parseIf(s);
    }
    case TokenKind.OpenParen: {
      s.next();
      const expr = parseExpr(s);
      s.nextWith(TokenKind.CloseParen);
      return expr;
    }
    default: {
      throw new Error(`unexpected token: ${TokenKind[s.getKind()]}`);
    }
  }
}

//#endregion pratt parsing
