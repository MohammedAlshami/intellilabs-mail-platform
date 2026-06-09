declare module "sql.js" {
  interface SqlJsStatic {
    Database: new () => SqlJsDatabase;
  }

  interface SqlJsDatabase {
    run(sql: string, params?: any[]): void;
    exec(sql: string): SqlJsQueryExecResult[];
    prepare(sql: string): SqlJsStatement;
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatement {
    bind(params?: any[]): boolean;
    step(): boolean;
    get(): any[];
    getAsObject(): Record<string, any>;
    free(): boolean;
    reset(): void;
  }

  interface SqlJsQueryExecResult {
    columns: string[];
    values: any[][];
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
