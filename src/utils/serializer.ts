import { XMLParser } from "fast-xml-parser";
import { SERIALIZER_V2_ENVELOPE_TEMPLATE } from "./constants";

export class GridSerializer {
  private static parser = new XMLParser();

  private static getLuaType(value: any): string {
    switch (typeof value) {
      case "undefined":
      case "object":
        return "LUA_TNIL";
      case "boolean":
        return "LUA_TBOOLEAN";
      case "number":
      case "bigint":
        return "LUA_TNUMBER";
      case "string":
      case "symbol":
        return "LUA_TSTRING";
      default:
        return "LUA_TNIL";
    }
  }

  private static generateLuaValueXml(value: any): string {
    let xml = "";

    xml += "<ns1:LuaValue>";

    if (typeof value === "object" && value !== null) {
      xml += `<ns1:type>LUA_TTABLE</ns1:type>`;
      xml += "<ns1:table>";

      for (const key in value) {
        xml += this.generateLuaValueXml(key);
      }

      xml += "</ns1:table>";
    } else {
      const type = this.getLuaType(value);

      xml += `<ns1:type>${type}</ns1:type>`;
      xml += type !== "LUA_TNIL" ? `<ns1:value>${value}</ns1:value>` : "";
    }

    xml += "</ns1:LuaValue>";

    return xml;
  }

  private static generateLuaArguments(data: any[]): string {
    let xml = "";

    for (const argument of data) {
      xml += this.generateLuaValueXml(argument);
    }

    return xml;
  }

  private static generateOperationXml(operation: any): string {
    let xml = "";

    for (const key in operation) {
      xml += `<ns1:${key}>`;

      const value = operation[key];

      if (typeof value === "object") {
        xml +=
          key === "arguments"
            ? this.generateLuaArguments(value)
            : this.generateOperationXml(value);
      } else {
        xml +=
          typeof value === "string"
            ? value.replace(
                /[\u00A0-\u9999<>\&]/g,
                (c) => `&#${c.charCodeAt(0)};`,
              )
            : String(value);
      }

      xml += `</ns1:${key}>`;
    }

    return xml;
  }

  static generateEnvelope(operations: any[]): string {
    let xml = "";

    for (let i = 0; i < operations.length; i++) {
      xml += this.generateOperationXml(operations[i]);
    }

    return SERIALIZER_V2_ENVELOPE_TEMPLATE.replace("{{body}}", xml);
  }

  private static getJsValueFromLuaXml(xml: any): any {
    if (xml["ns1:type"] === "LUA_TTABLE") {
      return this.parseLuaValueXml(xml["ns1:table"]["ns1:LuaValue"]);
    }
    if (xml["ns1:type"] === "LUA_TBOOLEAN") {
      return xml["ns1:value"] === "true";
    }
    if (xml["ns1:type"] === "LUA_TNUMBER") {
      return Number(xml["ns1:value"]);
    }
    if (xml["ns1:type"] === "LUA_TSTRING") {
      return xml["ns1:value"];
    }
    if (xml["ns1:type"] === "LUA_TNIL") {
      return null;
    }
    return xml["ns1:value"];
  }

  private static parseLuaValueXml(value: any): any[] {
    let result: any[] = [];

    if (Array.isArray(value)) {
      for (const element of value) {
        if (
          element["ns1:type"] === "LUA_TTABLE" &&
          !element["ns1:table"]?.hasOwnProperty("ns1:LuaValue")
        ) {
          continue;
        }

        result.push(this.getJsValueFromLuaXml(element));
      }
    } else {
      result.push(this.getJsValueFromLuaXml(value));
    }

    return result;
  }

  static parseEnvelope(envelope: string): {
    success: boolean;
    error: string | null;
    data: any;
  } {
    const response = {
      success: false,
      error: null as string | null,
      data: null as any,
    };

    let body: any;

    try {
      const result = this.parser.parse(envelope);
      body = result["SOAP-ENV:Envelope"]["SOAP-ENV:Body"];
    } catch (e: any) {
      response.error = `Corrupted SOAP response - ${e}`;
      return response;
    }

    if (body?.["SOAP-ENV:Fault"]) {
      response.error = `RCCService error - ${body["SOAP-ENV:Fault"]["faultstring"]}`;
      return response;
    }

    try {
      body = Object.values(body)[0];

      if (!body) {
        response.data = null;
        response.success = true;
        return response;
      }

      const type = Object.keys(body)[0].split(":")[1].replace("Result", "");

      if (["OpenJob", "Execute", "BatchJob", "Diag"].includes(type)) {
        body = this.parseLuaValueXml(Object.values(body)[0]);
        if (body.length === 1) body = body[0];
      } else {
        if (Object.values(body).length === 1) {
          body = Object.values(body)[0];
        }

        if (typeof body === "object") {
          let reconstructed: any[] = [];

          if (!Array.isArray(body)) body = [body];

          for (const element of body) {
            const cleaned: any = {};

            for (const key in element) {
              let value: any = element[key]?.toString();

              if ((value.match(/\./g) || []).length <= 1) {
                const parsed = parseFloat(value);
                if (!Number.isNaN(parsed)) value = parsed;
              }

              cleaned[key.split(":")[1]] = value;
            }

            reconstructed.push(cleaned);
          }

          if (reconstructed.length === 1) reconstructed = reconstructed[0];
          body = reconstructed;
        }
      }
    } catch (e: any) {
      response.error = `Failed to parse response - ${e}`;
      return response;
    }

    response.success = true;
    response.data = body;
    return response;
  }
}