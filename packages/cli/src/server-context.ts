/** 启动服务时的上下文，供各路由模块使用 */
export interface ServerContext {
  port: number;
  rootDir: string;
  configDir: string;
  dataDir: string;
  host: string;
  apiOnly?: boolean;
  /** 当前运行的 CLI 脚本所在目录（用于解析仓库内 config） */
  scriptDir: string;
}
