import { toNano } from '@ton/core';
import { RaffleContract } from '../wrappers/RaffleContract';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const raffleContract = provider.open(RaffleContract.createFromConfig({}, await compile('RaffleContract')));

    await raffleContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(raffleContract.address);

    // run methods on `raffleContract`
}
