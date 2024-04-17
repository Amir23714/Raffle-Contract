import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, fromNano, toNano } from '@ton/core';
import { RaffleContract } from '../wrappers/RaffleContract';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('RaffleContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('RaffleContract');
    });

    let blockchain: Blockchain;
    let ownerWallet: SandboxContract<TreasuryContract>;
    let raffleContract: SandboxContract<RaffleContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        ownerWallet = await blockchain.treasury('ownerWallet');

        raffleContract = blockchain.openContract(
            RaffleContract.createFromConfig(
                {
                    owner_address: ownerWallet.address,
                    recent_winner: ownerWallet.address,
                },
                code,
            ),
        );

        const deployResult = await raffleContract.sendDeploy(ownerWallet.getSender(), toNano('0.1'));

        expect(deployResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: raffleContract.address,
            deploy: true,
            success: true,
        });
    });

    it('Owner is participant after first deploy', async () => {
        const participants = await raffleContract.getNumParticipants();
        expect(participants.num_participants).toEqual(1);

        const balance_response = await raffleContract.getContractBalance();
        const balance = Number(fromNano(balance_response.contract_balance));
        expect(balance).toBeCloseTo(0.1);

        const first_addr = (await raffleContract.getFirstAddress()).first_address;
        console.log(first_addr," ", ownerWallet.address);
        expect(first_addr.toString()).toBe(ownerWallet.address.toString());

    });

    it('Raffle works', async () => {
        const participants = await raffleContract.getNumParticipants();
        expect(participants.num_participants).toEqual(1);
        
        let secondWallet: SandboxContract<TreasuryContract> = await blockchain.treasury('secondWallet');
        const msg2Result = await raffleContract.sendDeposit(secondWallet.getSender(), toNano('0.1'));

        expect(msg2Result.transactions).toHaveTransaction({
            from: secondWallet.address,
            to: raffleContract.address,
            success: true,
        });
    });
});
