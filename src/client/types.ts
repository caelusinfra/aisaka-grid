export interface Job {
  id: string;
  expirationInSeconds: number;
  category: number;
  cores: number;
}

export interface ScriptExecution {
  name: string;
  script: string;
  arguments: any[];
}