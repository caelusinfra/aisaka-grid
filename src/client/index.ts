import { GridSerializer } from "../utils/serializer";
import type { Job, ScriptExecution } from "./types";

export class GridClient {
  private readonly ip: string;
  private readonly port: number;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
  }

  private async send(xml: string, action: string): Promise<any> {
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `http://roblox.com/${action}`,
    };

    let soapResponse: Response;

    // kitsune: I have to do this odd way because Roblox.RCCServiceArbiter doesn't like http://ip:port/action :P
    try {
      soapResponse = await fetch(`http://${this.ip}:${this.port}/${action}`, {
        method: "POST",
        headers: headers,
        body: xml,
      });
    } catch (error) {
      soapResponse = await fetch(`http://${this.ip}:${this.port}`, {
        method: "POST",
        headers: headers,
        body: xml,
      });
    }

    const xmlResponse = await soapResponse.text();
    const parsed = GridSerializer.parseEnvelope(xmlResponse);

    if (!parsed.success && parsed.error) {
      throw new Error(parsed.error);
    }

    return parsed.data;
  }

  async helloWorld(): Promise<string> {
    let xml = GridSerializer.generateEnvelope([{ HelloWorld: null }]);
    let response = await this.send(xml, "HelloWorld");

    return response;
  }

  async getVersion(): Promise<string> {
    let xml = GridSerializer.generateEnvelope([{ GetVersion: null }]);
    let response = await this.send(xml, "GetVersion");

    return response;
  }

  async getStatus(): Promise<any> {
    let xml = GridSerializer.generateEnvelope([{ GetStatus: null }]);
    let response = await this.send(xml, "GetStatus");

    return response;
  }

  async openJob(job: Job, script: ScriptExecution): Promise<any[]> {
    let xml = GridSerializer.generateEnvelope([
      {
        OpenJob: {
          job: job,
          script: script,
        },
      },
    ]);
    let response = await this.send(xml, "OpenJob");
    return response;
  }

  async batchJob(job: Job, script: ScriptExecution): Promise<any[]> {
    let xml = GridSerializer.generateEnvelope([
      {
        BatchJob: {
          job: job,
          script: script,
        },
      },
    ]);
    let response = await this.send(xml, "BatchJob");
    return response;
  }

  async execute(
    jobId: string,
    script: ScriptExecution,
  ): Promise<any | undefined> {
    let xml = GridSerializer.generateEnvelope([
      {
        Execute: {
          jobID: jobId,
          script: script,
        },
      },
    ]);
    let response = await this.send(xml, "Execute");
    return response;
  }

  async renewLease(
    jobId: string,
    expirationInSeconds: number,
  ): Promise<number> {
    let xml = GridSerializer.generateEnvelope([
      {
        RenewLease: {
          jobID: jobId,
          expirationInSeconds: expirationInSeconds,
        },
      },
    ]);
    await this.send(xml, "RenewLease");
    return expirationInSeconds;
  }

  async getExpiration(jobId: string): Promise<number> {
    let xml = GridSerializer.generateEnvelope([
      {
        GetExpiration: {
          jobID: jobId,
        },
      },
    ]);
    let response = await this.send(xml, "GetExpiration");
    return response;
  }

  async getAllJobs(): Promise<object> {
    let xml = GridSerializer.generateEnvelope([
      {
        GetAllJobs: null,
      },
    ]);
    let response = await this.send(xml, "GetAllJobs");

    // rj: Odd edge-case for when there's only one job
    if (!Array.isArray(response) && response !== null) {
      response = [response];
    }

    return response === null ? [] : response;
  }

  async closeJob(jobId: string): Promise<void> {
    let xml = GridSerializer.generateEnvelope([
      {
        CloseJob: {
          jobID: jobId,
        },
      },
    ]);

    await this.send(xml, "CloseJob");
  }

  async closeAllJobs(): Promise<number> {
    let xml = GridSerializer.generateEnvelope([
      {
        CloseAllJobs: null,
      },
    ]);
    let response = await this.send(xml, "CloseAllJobs");
    return response;
  }

  async closeExpiredJobs(): Promise<number> {
    let xml = GridSerializer.generateEnvelope([
      {
        CloseExpiredJobs: null,
      },
    ]);
    let response = await this.send(xml, "CloseExpiredJobs");
    return response;
  }
}