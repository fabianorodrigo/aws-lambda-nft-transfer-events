import { ScheduledEvent } from 'aws-lambda';
import { Event } from 'ethers';
import { Result } from 'ethers/lib/utils';
import { NFTEventEntityDAO, ParameterEntityDAO, PARAMETERS } from './dynamodb';
import { NFTContract } from './web3';

/**
 *
 * Monitor events Tranfer from a NFT contract
 *
 */
export const lambdaMonitorHandler = async (event: ScheduledEvent): Promise<void> => {
    try {
        const parametersDB = new ParameterEntityDAO();
        await parametersDB.connect();
        const nftEventsDB = new NFTEventEntityDAO();
        await nftEventsDB.connect();

        // definition of the initial block of search
        let lastBlockParameter = await parametersDB.get(PARAMETERS.LAST_BLOCK_CHECKED);
        if (lastBlockParameter == null) {
            lastBlockParameter = {
                name: PARAMETERS.LAST_BLOCK_CHECKED,
                value: parseInt(process.env.FROM_BLOCK as string),
            };
        }
        const FROM_BLOCK = lastBlockParameter.value + 1;

        // Query events
        const nftContract = new NFTContract();
        const transferEvents = await nftContract.getTransferEvents(FROM_BLOCK);

        for (let i = 0; i < transferEvents.length; i++) {
            const nftEvent = toEventEntity(transferEvents[i]);
            await nftEventsDB.save(nftEvent);
            console.log(`Persisted successfully: ${nftEvent.transactionHash}`);
            if (nftEvent.blockNumber > lastBlockParameter.value) {
                lastBlockParameter.value = nftEvent.blockNumber;
            }
        }

        if (transferEvents.length > 0) {
            // Persist the last block checked
            await parametersDB.save(lastBlockParameter);
        } else {
            console.log(`No TRANSFER EVENTS detected since block ${FROM_BLOCK}`);
        }
    } catch (err) {
        console.log(err);
    }
};

/**
 * Converts a Ethers event to the model expected by DynamoDB
 *
 * @param event Ethers event
 * @returns Simple object with: transactionHash, blockNumber, from, to and tokenId attributes
 */
function toEventEntity(event: Event) {
    return {
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        from: (<Result>event.args)['from'],
        to: (<Result>event.args)['to'],
        tokenId: (<Result>event.args)['tokenId'].toString(), //tokenId is BigNumber and has to be persisted as string
    };
}
