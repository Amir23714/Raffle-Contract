import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, fromNano, toNano } from '@ton/core';
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

        const deployResult = await raffleContract.sendDeploy(ownerWallet.getSender(), toNano('0.01'));

        expect(deployResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: raffleContract.address,
            deploy: true,
            success: true,
        });
    });

    it('Owner is not participant after first deploy', async () => {
        const participants = await raffleContract.getNumParticipants();
        expect(participants.num_participants).toEqual(0);

        const balance_response = await raffleContract.getContractBalance();
        const balance = Number(fromNano(balance_response.contract_balance));
        console.log('Balance after deployment = ', balance);
    });

    it('Raffle works', async () => {

        // Check that owner cannot participate in the raffle
        const ownerMsgResult = await raffleContract.sendDeposit(ownerWallet.getSender(), toNano('1'));
        expect(ownerMsgResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: raffleContract.address,
            success: false,
        });

        const ownerBalance = await ownerWallet.getBalance();
        // Deposit from 5 wallets
        let wallets: SandboxContract<TreasuryContract>[] = [];
        let wallet_balances: [Address, bigint][] = [];

        for (let i = 0; i < 5; i++) {
            let wallet = await blockchain.treasury('wallet' + i);
            wallet_balances.push([wallet.address, (await wallet.getBalance()) - toNano('1')]);

            const msgResult = await raffleContract.sendDeposit(wallet.getSender(), toNano('1'));
            expect(msgResult.transactions).toHaveTransaction({
                from: wallet.address,
                to: raffleContract.address,
                success: true,
            });

            const balance_response = await raffleContract.getContractBalance();
            const balance = Number(fromNano(balance_response.contract_balance));
            console.log('Contract balance = ', balance);

            wallets.push(wallet);
        }

        // Check if contract has 5 ton
        const balance_response = await raffleContract.getContractBalance();
        const balance = Number(fromNano(balance_response.contract_balance));
        expect(balance).toBeCloseTo(5, 1);

        // Check if the number of participants is 0
        const participants_response = await raffleContract.getNumParticipants();
        const participants_num = participants_response.num_participants;
        expect(participants_num).toEqual(5);

        // Transaction must reject because there are maximum participants
        let msgResult = await raffleContract.sendDeposit(wallets[0].getSender(), toNano('1'));
        expect(msgResult.transactions).toHaveTransaction({
            from: wallets[0].address,
            to: raffleContract.address,
            success: false,
        });

        // Only owner can start raffle
        msgResult = await raffleContract.sendStartRaffleProcess(wallets[1].getSender(), toNano('0.01'));
        expect(msgResult.transactions).toHaveTransaction({
            from: wallets[1].address,
            to: raffleContract.address,
            success: false,
        });

        // Start raffle by owner
        msgResult = await raffleContract.sendStartRaffleProcess(ownerWallet.getSender(), toNano('0.01'));
        expect(msgResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: raffleContract.address,
            success: true,
        });

        // Check that no more participants are in the raffle
        const participants_response_after_raffle = await raffleContract.getNumParticipants();
        const participants_num_after_raffle = participants_response_after_raffle.num_participants;
        expect(participants_num_after_raffle).toEqual(0);

        // Check has last winner got 4 ton
        const recent_winner: Address = (await raffleContract.getRecentWinner()).recent_winner;
        let winner_found = false;

        for (let i = 0; i < 5; i++) {
            let wallet_tuple = wallet_balances[i];

            if (wallet_tuple[0].toString() === recent_winner.toString()) {
                const winner_reward: bigint = (await wallets[i].getBalance()) - wallet_tuple[1];
                const winner_reward_int = Number(fromNano(winner_reward));

                console.log('Winner reward = ', winner_reward_int);
                expect(winner_reward_int).toBeCloseTo(4, 1);
                winner_found = true;
                break;
            }
        }

        // If winner was not found, then the test failed
        expect(winner_found).toBe(true);

        // Contract Balance before withdraw
        const contract_balance_response_before_withdraw = await raffleContract.getContractBalance();
        const contract_balance_before_withdraw = Number(
            fromNano(contract_balance_response_before_withdraw.contract_balance),
        );

        // Owner Balance before withdraw
        const ownerBalanceBeforeWithdraw = Number(fromNano(await ownerWallet.getBalance()));

        const msg_result = await raffleContract.sendWithdraw(ownerWallet.getSender(), toNano('0.01'));
        expect(msg_result.transactions).toHaveTransaction({
            from: raffleContract.address,
            to: ownerWallet.address,
            success: true,
        });

        // Owner Balance after withdraw
        const ownerBalanceAfterWithdraw = Number(fromNano(await ownerWallet.getBalance()));
        const ownerDifferenceBalance = ownerBalanceAfterWithdraw - ownerBalanceBeforeWithdraw;
        expect(ownerDifferenceBalance).toBeCloseTo(1, 1);

        // Contract Balance after withdraw
        const contract_balance_response_after_withdraw = await raffleContract.getContractBalance();
        const contract_balance_after_withdraw = Number(
            fromNano(contract_balance_response_after_withdraw.contract_balance),
        );
        expect(contract_balance_after_withdraw).toBeCloseTo(0.01);
    });
});
