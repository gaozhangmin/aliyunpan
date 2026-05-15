export interface CliResult {
  exitCode: number
  stdout: string
  stderr: string
}

export function runBoxPlayerCli(argv: string[], env?: { configDir?: string }): Promise<CliResult>
