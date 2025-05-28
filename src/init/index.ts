import * as Generator from "yeoman-generator";
import * as chalk from "chalk";
import { GlobalJson, FabloConfigJson, OrgJson } from "../types/FabloConfigJson";

const DEFAULT_FABLO_CONFIG: FabloConfigJson = {
  $schema: "https://github.com/hyperledger-labs/fablo/releases/download/2.2.0/schema.json",
  global: {
    fabricVersion: "2.3.3",
    tls: true,
    peerDevMode: false,
    tools: {
      explorer: true,
    },
  },
  orgs: [
    {
      organization: {
        name: "Orderer",
        domain: "orderer.example.com",
        mspName: "OrdererMSP",
      },
      ca: {
        prefix: "ca",
        db: "postgres",
      },
      orderers: [
        {
          groupName: "group1",
          prefix: "orderer",
          type: "raft",
          instances: 1,
        },
      ],
    },
    {
      organization: {
        name: "Org1",
        domain: "org1.example.com",
        mspName: "Org1MSP",
      },
      ca: {
        prefix: "ca",
        db: "postgres",
      },
      orderers: [],
      peer: {
        instances: 1,
        prefix: "peer",
        db: "CouchDb",
      },
      tools: {
        fabloRest: true,
      },
    },
  ],
  channels: [
    {
      name: "my-channel1",
      orgs: [
        {
          name: "Org1",
          peers: ["peer0"],
        },
      ],
    },
  ],
  chaincodes: [
    {
      name: "chaincode1",
      version: "0.0.1",
      lang: "node",
      channel: "my-channel1",
      directory: "./chaincodes/chaincode-kv-node",
      privateData: [],
    },
  ],
  hooks: {
    postGenerate:
      "perl -i -pe 's/MaxMessageCount: 10/MaxMessageCount: 1/g' \"./fablo-target/fabric-config/configtx.yaml\"",
  },
};

export default class InitGenerator extends Generator {
  constructor(readonly args: string[], opts: Generator.GeneratorOptions) {
    super(args, opts);
  }

  private hasArg(arg: string): boolean {
    return this.args.includes(arg);
  }

  async copySampleConfig(): Promise<void> {
    try {
      let fabloConfigJson: FabloConfigJson = { ...DEFAULT_FABLO_CONFIG };

      const shouldInitWithNodeChaincode = this.hasArg("node");
      if (shouldInitWithNodeChaincode) {
        console.log("Creating sample Node.js chaincode");
        this.fs.copy(this.templatePath("chaincodes"), this.destinationPath("chaincodes"));
        this.fs.write(this.destinationPath("chaincodes/chaincode-kv-node/.nvmrc"), "12");
      } else {
        fabloConfigJson = { ...fabloConfigJson, chaincodes: [] };
      }

      const shouldAddFabloRest = this.hasArg("rest");
      const orgs = fabloConfigJson.orgs.map((org: OrgJson) => ({
        ...org,
        tools: shouldAddFabloRest ? { fabloRest: true } : {},
      }));
      fabloConfigJson = { ...fabloConfigJson, orgs };

      const shouldUseKubernetes = this.hasArg("kubernetes") || this.hasArg("k8s");
      const shouldRunInDevMode = this.hasArg("dev");
      const global: GlobalJson = {
        ...fabloConfigJson.global,
        engine: shouldUseKubernetes ? "kubernetes" : "docker",
        peerDevMode: shouldRunInDevMode,
      };
      fabloConfigJson = { ...fabloConfigJson, global };

      this.fs.write(this.destinationPath("fablo-config.json"), JSON.stringify(fabloConfigJson, undefined, 2));

      this.on("end", () => {
        console.log("===========================================================");
        console.log(chalk.bold("Sample config file created! :)"));
        console.log("You can start your network with 'fablo up' command");
        console.log("===========================================================");
      });
    } catch (error) {
      console.error(chalk.red("Error creating configuration:"), error);
      throw error;
    }
  }
}
