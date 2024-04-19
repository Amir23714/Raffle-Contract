import { Address, address, toNano } from '@ton/core';
import { RaffleContract } from '../wrappers/RaffleContract';
import { compile, createNetworkProvider, NetworkProvider } from '@ton/blueprint';

const OWNER_ADDRESS: string = '0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn';

export async function run(provider: NetworkProvider) {
    const raffleContract = provider.open(
        RaffleContract.createFromConfig(
            {
                owner_address: address(OWNER_ADDRESS),
                recent_winner: address(OWNER_ADDRESS),
            },
            await compile('RaffleContract'),
        ),
    );

    await raffleContract.sendDeploy(provider.sender(), toNano('0.01'));

    await provider.waitForDeploy(raffleContract.address);

    // run methods on `raffleContract`
}
