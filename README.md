# Aisaka Grid
The Roblox RCCService SOAP client implementation in TypeScript

# Installation
no, manually add it into your project :troll:

# How to use?
```ts
import { GridClient, Job, ScriptExecution } from "aisaka-grid";

var client = new GridClient("127.0.0.1", 64989);

const job: Job = {
  id: "0000-0000-0000-0000",
  expirationInSeconds: 10,
  category: 0,
  cores: 6,
};

const scriptExecution: ScriptExecution = {
  name: "scriptExecution",
  script: JSON.stringify({
    Mode: "Thumbnail",
    Settings: {
      Type: "Avatar_R15_Action",
      Arguments: [
        "http://www.caelus.lol/",
        "https://avatar.caelus.lol/v1/avatar-fetch?userId=666",
        "PNG",
        480,
        480,
      ],
    },
  }),
  arguments: [],
};

const response = await client.openJob(job, scriptExecution);
console.log(response[0]);
```

# Credits
- rj (https://github.com/lrre-foss/rcctalk/blob/trunk/xml.js)