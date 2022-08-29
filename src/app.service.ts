import { PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import type { OnApplicationBootstrap } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { BlockSignatures, ParsedInstruction, PartiallyDecodedInstruction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";

const enum config {
  RPC_URL = "RPC_URL",
  SLOT_START = "SLOT_START",
}

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly solanaApi: Connection;

  constructor(private configService: ConfigService) {
    this.solanaApi = new Connection(this.configService.get(config.RPC_URL), "confirmed");
  }

  async onApplicationBootstrap() {
    const startSlot = Number(await this.configService.get(config.SLOT_START));
    let latestSlot = await this.fetchLatestSlotHead(this.configService.get(config.SLOT_START));
    for (let slotNumber = startSlot; slotNumber <= latestSlot; slotNumber++) {
      // fetch and print NFT results to console
      await this.fetchBlocks(slotNumber);

      // if fetched last slot, then wait, and get new head
      if (slotNumber === latestSlot) {
        latestSlot = await this.fetchLatestSlotHead(slotNumber);
      }
    }
  }

  async fetchLatestSlotHead(currentSlot: number) {
    let newSlot = await this.solanaApi.getSlot("confirmed");
    while (currentSlot === newSlot) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      newSlot = await this.solanaApi.getSlot("confirmed");
    }
    return newSlot;
  }

  async fetchBlocks(startSlotNumber: number) {
    for (let slotNumber = startSlotNumber; slotNumber < 23232323232323; slotNumber++) {
      const blockData = await this.fetchBlock(slotNumber);
      if (blockData) {
        console.log(
          `Fetched block with slot ${slotNumber}, found ${blockData.length} NFTs:`,
          JSON.stringify(blockData),
        );
      } else {
        console.log(`Fetched block with slot ${slotNumber}, no NFTs were minted`);
      }
    }
  }

  async fetchBlock(slotNumber: number) {
    const blockSignatures = await this.getBlockSignatures(slotNumber);
    if (!blockSignatures) {
      return;
    }

    const transactionSignatures = await this.solanaApi.getSignaturesForAddress(PROGRAM_ID, {
      before: blockSignatures.signatures[blockSignatures.signatures.length - 1],
      until: blockSignatures.signatures[0],
    });
    if (!transactionSignatures?.length) {
      return;
    }

    const transactionList = transactionSignatures.filter(tx => tx.err === null).map(tx => tx.signature);
    if (!transactionList?.length) {
      return;
    }

    // fetch only confirmed transaction signatures
    let response = [];
    const fetchLimit = 20;
    const iterations = Math.ceil(transactionList.length / fetchLimit);
    for (let i = 0; i < iterations; i++) {
      const from = i * fetchLimit;
      const to = Math.min(from + fetchLimit, transactionList.length);
      const parsedTransactions = await this.solanaApi.getParsedTransactions(transactionList.slice(from, to));
      response = parsedTransactions.reduce((nftDataList, parsedTransaction) => {
        if (parsedTransaction.meta.innerInstructions?.length === 0) {
          return nftDataList;
        }
        const nftData = this.getNftDataFromTransaction(parsedTransaction);
        return [...nftDataList, ...nftData];
      }, response);
    }

    return response;
  }

  private async getBlockSignatures(slotNumber: number): Promise<BlockSignatures> {
    return this.solanaApi.getBlockSignatures(slotNumber, "confirmed").catch(e => {
      if (e.message !== `failed to get block: Slot ${slotNumber} was skipped, or missing in long-term storage`) {
        throw e;
      }
      return null;
    });
  }

  private getNftDataFromTransaction(parsedTransaction) {
    return parsedTransaction.meta?.innerInstructions?.reduce((nftList, instructionList) => {
      // find instruction with the account with 282 space or the account with 241 space (this can be an NFT print)
      // because rent depends on the space, so space is always better to check
      const validInstrIdx = instructionList.instructions?.findIndex((instruction: any) =>
        [282, 241].includes(instruction.parsed?.info?.space ?? null),
      );
      if (validInstrIdx < 2) {
        return nftList;
      }
      const validInstruction = instructionList.instructions[validInstrIdx] as ParsedInstruction;
      const metaplexInstruction = instructionList.instructions[validInstrIdx - 2] as PartiallyDecodedInstruction;
      // check the instruction X-2 and see if its owned by the metaplex token metadata program
      if (
        PROGRAM_ID.equals(metaplexInstruction?.programId) &&
        metaplexInstruction?.accounts?.length &&
        metaplexInstruction.accounts[0].toString() === validInstruction.parsed?.info?.account
      ) {
        const nftMeta = {
          slot: parsedTransaction.slot,
          blockTime: parsedTransaction.blockTime,
          innerInstructionIdx: instructionList.index,
          instructionIdx: validInstrIdx,
          tokenAccount: metaplexInstruction.accounts[1],
          metadataAccount: metaplexInstruction.accounts[5],
          instructionList,
        };
        nftList.push(nftMeta);
      }
      return nftList;
    }, []);
  }
}
