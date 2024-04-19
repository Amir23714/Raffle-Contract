import { Address, address, toNano } from '@ton/core';
import { RaffleContract } from '../wrappers/RaffleContract';
import { compile, createNetworkProvider, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const raffleContract = provider.open(
        RaffleContract.createFromConfig(
            {
                owner_address: address('0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn'),
                recent_winner: address('0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn'),
            },
            await compile('RaffleContract'),
        ),
    );

    await raffleContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(raffleContract.address);

    // run methods on `raffleContract`
}
