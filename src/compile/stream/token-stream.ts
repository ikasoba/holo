import { error } from '../util/error.js';
import type { Token } from '../token.js';
import { TOKEN, TokenKind } from '../token.js';

/**
 * トークンの読み取りに関するインターフェース
*/
export interface ITokenStream {
  /**
   * カーソル位置にあるトークンを取得します。
  */
  getToken(): Token;

  /**
   * カーソル位置にあるトークンの種類を取得します。
  */
  getKind(): TokenKind;

  /**
   * カーソル位置を次のトークンへ進めます。
  */
  next(): void;

  /**
   * トークンの先読みを行います。カーソル位置は移動されません。
  */
  lookahead(offset: number): Token;

  /**
   * カーソル位置にあるトークンが指定したトークンの種類と一致するかを確認します。
   * 一致しなかった場合には文法エラーを発生させます。
  */
  expect(kind: TokenKind): void;

  /**
   * カーソル位置にあるトークンが指定したトークンの種類と一致することを確認し、
   * カーソル位置を次のトークンへ進めます。
  */
  nextWith(kind: TokenKind): void;
}

/**
 * トークン列からトークンを読み取るクラス
*/
export class TokenStream implements ITokenStream {
  private source: Token[];
  private index: number;
  private _token!: Token;

  constructor(source: TokenStream['source']) {
    this.source = source;
    this.index = 0;
    this.load();
  }

  private get eof(): boolean {
    return (this.index >= this.source.length);
  }

  /**
   * カーソル位置にあるトークンを取得します。
  */
  public getToken(): Token {
    if (this.eof) {
      return TOKEN(TokenKind.EOF, { line: -1, column: -1 });
    }
    return this._token;
  }

  /**
   * カーソル位置にあるトークンの種類を取得します。
  */
  public getKind(): TokenKind {
    return this.getToken().kind;
  }

  /**
   * カーソル位置を次のトークンへ進めます。
  */
  public next(): void {
    if (!this.eof) {
      this.index++;
    }
    this.load();
  }

  /**
   * トークンの先読みを行います。カーソル位置は移動されません。
  */
  public lookahead(offset: number): Token {
    if (this.index + offset < this.source.length) {
      return this.source[this.index + offset]!;
    } else {
      return TOKEN(TokenKind.EOF, { line: -1, column: -1 });
    }
  }

  /**
   * カーソル位置にあるトークンが指定したトークンの種類と一致するかを確認します。
   * 一致しなかった場合には文法エラーを発生させます。
  */
  public expect(kind: TokenKind): void {
    if (this.getKind() !== kind) {
      throw error(`unexpected token: ${TokenKind[this.getKind()]}`, this.getToken().loc);
    }
  }

  /**
   * カーソル位置にあるトークンが指定したトークンの種類と一致することを確認し、
   * カーソル位置を次のトークンへ進めます。
  */
  public nextWith(kind: TokenKind): void {
    this.expect(kind);
    this.next();
  }

  private load(): void {
    if (this.eof) {
      this._token = TOKEN(TokenKind.EOF, { line: -1, column: -1 });
    } else {
      this._token = this.source[this.index]!;
    }
  }
}
